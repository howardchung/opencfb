package main

import (
	"encoding/json"
	"io"
	"log"
	"maps"
	"math"
	"net/http"
	"os"
	"slices"
	"time"

	"github.com/jmoiron/sqlx"
)

func main() {
	svc := os.Getenv("SVC")
	switch svc {
	case "espn":
		Espn()
	case "jhowell":
		JHowell()
	case "compute":
		Compute()
	default:
		Schema()
		JHowell()
		Espn()
		GetConferences()
		Compute()
	}
}

func Compute() {
	db := InitDatabase()
	ReplaceHttp(db)
	ComputeStreaks(db)
	ComputeCounts(db)
	ComputeRankings(db)
	db.MustExec("VACUUM")
}

func GetConferences() {
	db := InitDatabase()
	// List of teams
	// Treat these as updates only, as we insert teams when we fetch game data
	// Coverage for FBS teams is pretty good already, so skip it
	// const response = await axios.get('http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?groups=80&lang=en&region=us&contentorigin=espn&tz=America%2FNew_York&limit=200');
	// const fbsTeams = response.data;
	// const response2 = await axios.get('http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?groups=81&lang=en&region=us&contentorigin=espn&tz=America%2FNew_York&limit=200');
	// const fcsTeams = response2.data?.sports?.[0]?.leagues?.[0]?.teams;
	// for (let i = 0; i < fcsTeams.length; i++) {
	//   const team = fcsTeams[i].team;
	//   await db.run('UPDATE team SET displayname = ?, abbreviation = ?, color = ?, alternatecolor = ?, logo = ? WHERE id = ?',
	//   [team.displayName, team.abbreviation, team.color, team.alternateColor, team.logos?.[0]?.href, team.id]);
	// }
	var conferences Conferences
	url := "https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=80&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc"
	res, err := http.Get(url)
	if err != nil {
		panic(err.Error())
	}
	body, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err.Error())
	}
	err = json.Unmarshal(body, &conferences)
	if err != nil {
		panic(err.Error())
	}
	for _, conf := range conferences.Children {
		conf.Division = "fbs"
		InsertConference(db, conf)
	}
	url = "https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=81&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc"
	res, err = http.Get(url)
	if err != nil {
		panic(err.Error())
	}
	body, err = io.ReadAll(res.Body)
	if err != nil {
		panic(err.Error())
	}
	err = json.Unmarshal(body, &conferences)
	if err != nil {
		panic(err.Error())
	}
	for _, conf := range conferences.Children {
		conf.Division = "fcs"
		InsertConference(db, conf)
	}
	// Add conference catch-alls for FBS/IA teams without espn records
	db.MustExec(`INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483647, 'Unknown (probably former FBS but not eligible)', 'fcs')`)
	db.MustExec(`INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483646, 'Unknown (FCS)', 'fcs')`)

	// Team details
	// http://cdn.espn.com/core/college-football/team/_/id/2116/ucf-knights?xhr=1&render=true&device=desktop&country=us&lang=en&region=us&site=espn&edition-host=espn.com&one-site=true&site-type=full
	// List of conferences (FBS only)
	// http://cdn.espn.com/core/college-football/standings?xhr=1&render=true&device=desktop&country=us&lang=en&region=us&site=espn&edition-host=espn.com&one-site=true&site-type=full
}

func ReplaceHttp(db *sqlx.DB) {
	db.MustExec(`UPDATE team SET logo = replace(logo, 'http://', 'https://')`)
}

func ComputeRankings(db *sqlx.DB) {
	// Elo rank teams
	// Start all teams at 1000
	ratingMap := make(map[int64]float64)
	var lastWeekRating map[int64]float64
	initial := 1000.0
	kFactor := 32.0
	gamesRated := 0

	// Get an array of all games
	data := []RatingGame{}
	db.Select(&data,
		`SELECT game.id, game.date, gt.teamid as team1, gt2.teamid as team2, gt.result as team1result
    FROM game
    join gameteam gt on game.id = gt.gameid
    join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid
    join team t1 on gt.teamid = t1.id
    join team t2 on gt2.teamid = t2.id
    where gt.teamid < gt2.teamid
    order by game.date asc`,
	)

	eligibleTeams := []EligibleTeam{}
	db.Select(&eligibleTeams, `
  SELECT team.id from team
  JOIN conference ON team.conferenceid = conference.id
  where conference.division = 'fbs'
  `)
	teamSet := make(map[int64]bool)
	for _, element := range eligibleTeams {
		teamSet[element.Id] = true
	}

	lastDate, err := time.Parse("2006-01-02 15:04:05+00:00", data[len(data)-1].Date)
	if err != nil {
		panic(err.Error())
	}

	currYear := 0
	db.MustExec("BEGIN TRANSACTION")
	db.MustExec("DELETE FROM team_ranking_history")
	for i, game := range data {
		team1 := game.Team1
		team2 := game.Team2

		// Write the current team ratings into the gameteam table (pre-game rating)
		db.MustExec(
			`UPDATE gameteam SET rating = $1 WHERE gameteam.gameid = $2 and gameteam.teamid = $3`,
			ratingMap[team1], game.Id, team1,
		)
		db.MustExec(
			`UPDATE gameteam SET rating = $1 WHERE gameteam.gameid = $2 and gameteam.teamid = $3`,
			ratingMap[team2], game.Id, team2,
		)

		delta := 0.0
		if teamSet[team1] && teamSet[team2] {
			gamesRated += 1
			team1Result := game.Team1Result
			_, ok := ratingMap[team1]
			if !ok {
				ratingMap[team1] = initial
			}
			_, ok = ratingMap[team2]
			if !ok {
				ratingMap[team2] = initial
			}
			currRating1 := ratingMap[team1]
			currRating2 := ratingMap[team2]
			r1 := math.Pow(10, currRating1/400)
			r2 := math.Pow(10, currRating2/400)
			e1 := r1 / (r1 + r2)
			e2 := r2 / (r1 + r2)
			diff1 := 0.0
			diff2 := 0.0
			if team1Result == "W" {
				diff1 = kFactor * (1 - e1)
				diff2 = kFactor * (0 - e2)
			} else if team1Result == "L" {
				diff1 = kFactor * (0 - e1)
				diff2 = kFactor * (1 - e2)
			}
			delta = math.Abs(diff1)
			ratingMap[team1] += diff1
			ratingMap[team2] += diff2
		}
		// Don't do anything for ties currently
		// console.log(i, diff1, ratingMap[team1], ratingMap[team2]);
		// Record the delta
		db.MustExec(
			`INSERT OR REPLACE INTO game_elo_delta (id, delta) VALUES ($1, $2)`,
			game.Id, delta,
		)

		// If we encounter a new year after february
		// Snapshot the current team relative ranks
		var nextYear int
		var nextMonth int
		last := i+1 == len(data)
		if !last {
			next := data[i+1]
			nextDate, err := time.Parse("2006-01-02 15:04:05+00:00", next.Date)
			if err != nil {
				panic(err.Error())
			}
			nextYear = nextDate.Year()
			nextMonth = int(nextDate.Month())
			if lastWeekRating == nil && nextDate.Unix() > 0 && lastDate.Unix()-nextDate.Unix() < 6*24*60*60 {
				// Next game is within a week of the end, copy the ratingMap
				// Use 6 days instead of 7 to account for case where the last week has a limited number of games
				// In that case we might trigger the copy too early
				lastWeekRating = maps.Clone(ratingMap)
			}
		}
		// 0 is january
		if last || (nextYear > currYear && nextMonth >= 2) {
			snapshot := make([]RankedTeam, len(ratingMap))
			i := 0
			for k, v := range ratingMap {
				snapshot[i] = RankedTeam{
					TeamId: k,
					Rating: v,
					Year:   currYear,
					Rank:   0,
				}
				i++
			}
			slices.SortFunc(snapshot, func(a, b RankedTeam) int {
				if b.Rating == a.Rating {
					return 0
				}
				if b.Rating-a.Rating > 0 {
					return 1
				}
				return -1
			})
			// Add ranks
			for i := range snapshot {
				snapshot[i].Rank = i + 1
			}
			// Write to DB
			for _, row := range snapshot {
				db.MustExec(
					`INSERT INTO team_ranking_history (id, year, rank, rating) VALUES ($1, $2, $3, $4)`,
					row.TeamId, row.Year, row.Rank, row.Rating,
				)
			}
			currYear = nextYear
		}
	}

	db.MustExec(`DELETE FROM team_ranking`)
	for k, v := range ratingMap {
		db.MustExec(
			`INSERT INTO team_ranking(id, rating, prevRating) VALUES ($1, $2, $3)`,
			k, v, lastWeekRating[k],
		)
	}
	db.MustExec("COMMIT")
	log.Printf("%d games rated", gamesRated)
}

func ComputeCounts(db *sqlx.DB) {
	db.MustExec("BEGIN TRANSACTION")
	db.MustExec(`DROP TABLE team_count`)
	db.MustExec(`CREATE TABLE team_count AS
  select team.id,
  count(1) gamesPlayed,
  sum(case when gt.result = 'W' then 1 else 0 end) gamesWon,
  sum(case when gt.result = 'L' then 1 else 0 end) gamesLost,
  sum(case when gt.result = 'T' then 1 else 0 end) gamesTied
  from team
  join gameteam gt on team.id = gt.teamid 
  group by team.id`)
	db.MustExec("COMMIT")
}

func ComputeStreaks(db *sqlx.DB) {
	data := []StreakGame{}
	db.Select(&data, `SELECT date, result, teamid from gameteam
  join game on game.id = gameteam.gameid
  order by date desc`)
	runningMap := make(map[int64]int)
	currentStreakMap := make(map[int64]int)
	allTimeStreakMap := make(map[int64]int)
	for _, row := range data {
		_, ok := runningMap[row.TeamId]
		if !ok {
			runningMap[row.TeamId] = 0
		}
		if row.Result == "W" {
			runningMap[row.TeamId] += 1
		} else {
			// Copy the data to current streak if we haven't done it already
			// Limit to streaks starting in 2000 to remove some old invalid teams
			_, ok := currentStreakMap[row.TeamId]
			date, err := time.Parse("2006-01-02 15:04:05+00:00", row.Date)
			if err != nil {
				panic(err.Error())
			}
			if !ok &&
				date.Year() >= 2000 {
				currentStreakMap[row.TeamId] = runningMap[row.TeamId]
			}
			// Copy the data to all time streak if it's better
			if allTimeStreakMap[row.TeamId] <= runningMap[row.TeamId] {
				allTimeStreakMap[row.TeamId] = runningMap[row.TeamId]
			}
			runningMap[row.TeamId] = 0
		}
	}
	// console.log(currentStreakMap, allTimeStreakMap);
	// Write data to SQL
	db.MustExec("BEGIN TRANSACTION")
	db.MustExec(`DELETE FROM team_streak`)
	for key := range currentStreakMap {
		db.MustExec(
			`INSERT INTO team_streak (id, current, allTime) VALUES ($1, $2, $3)`,
			key, currentStreakMap[key], allTimeStreakMap[key],
		)
	}
	db.MustExec("COMMIT")
}

// TODO more features
// - circles of parity (longest cycle in directed graph problem)
// - margins of victory
// - dedicated rivalry pages
/*
func GetMarginsOfVictory() {

}

func GetCirclesOfParity() {

}
*/
