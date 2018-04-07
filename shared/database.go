package shared

import (
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"log"
	"io/ioutil"
)

func InitDatabase() *sqlx.DB {
	connStr := "./data/opencfb.sqlite"
	db := sqlx.MustConnect("sqlite3", connStr)
	schema, err := ioutil.ReadFile("./schema.sql")
	if err != nil {
		log.Fatal(err)
	}
	db.MustExec(string(schema))
	return db
}

func InsertGame(db *sqlx.DB, game Game) {
	_, err := db.Exec(`INSERT OR REPLACE INTO game VALUES ($1, $2, $3, $4)`,
		game.Id, game.Attendance, game.State, game.Date)
	if err != nil {
		log.Fatal(err)
	}
}

func InsertGameTeam(db *sqlx.DB, gameTeam GameTeam) {
	_, err := db.Exec(`INSERT OR REPLACE INTO gameteam VALUES ($1, $2, $3, $4, $5)`,
		gameTeam.GameId, gameTeam.TeamId, gameTeam.Score, gameTeam.Field, gameTeam.Result)
	if err != nil {
		log.Fatal(err)
	}
}

func InsertTeam(db *sqlx.DB, team Team) {
	_, err := db.Exec(`INSERT OR REPLACE INTO team VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		team.Id, team.DisplayName, team.Abbreviation, team.Color, team.AlternateColor, team.Logo, team.ConferenceId)
	if err != nil {
		log.Fatal(err)
	}
}

/*
func InsertConference(conference Conference) {

}
*/

func GetTeams(db *sqlx.DB, id int64) []Team {
	log.Printf("GetTeams: %d", id)
	var response []Team
	rows, err := db.Queryx("SELECT * FROM team WHERE (0 = $1 OR id = $1) ORDER BY id desc", id)
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var t Team
		err = rows.StructScan(&t)
		response = append(response, t)
	}
	return response
}

func GetGames(db *sqlx.DB, teamId int64, season int) []Game {
	log.Printf("GetGames: %d", teamId)
	var response []Game
	rows, err := db.Queryx("SELECT * FROM game JOIN gameteam ON gameteam.gameid = game.id WHERE (0 = $1 OR teamid = $1) ORDER BY date desc LIMIT 100", teamId)
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var g Game
		err = rows.StructScan(&g)
		response = append(response, g)
	}
	return response
}

func GetRivalries(db *sqlx.DB, teamId int64, teamId2 int64) []Team {
	return nil
}

func GetAllTimeRankings(db *sqlx.DB) []Team {
	// Elo rank teams
	// Start all teams at 1000
	var ratingMap map[string]float64
	ratingMap = make(map[string]float64)
	// kFactor := 32.0

	var response []Game
	rows, _ := db.Queryx("SELECT * FROM game join gameteam on game.id = gameteam.gameid join gameteam gt2 on gt2.gameid = gameteam.gameid and gt2.teamid != gt.teamid order by game.date")
	for rows.Next() {
		var g Game
		_ = rows.StructScan(&g)
		response = append(response, g)
	}
	/*
		// Iterate over games, when we find a new team add them to rating map
		for _, g := range response {
			team1 := g.HomeTeam
			team2 := g.AwayTeam
			// Set the default rating
			if _, ok := ratingMap[team1]; !ok {
				ratingMap[team1] = 1000
			}
			if _, ok := ratingMap[team2]; !ok {
				ratingMap[team2] = 1000
			}
			currRating1 := ratingMap[team1]
			currRating2 := ratingMap[team2]
			r1 := math.Pow(10, currRating1/400)
			r2 := math.Pow(10, currRating2/400)
			e1 := r1 / (r1 + r2)
			e2 := r2 / (r1 + r2)
			diff1 := 0.0
			diff2 := 0.0
			// Update the team's rating
			if g.res == "W" {
				diff1 = kFactor * (1 - e1)
				diff2 = kFactor * (0 - e2)
			} else if g.res == "L" {
				diff1 = kFactor * (0 - e1)
				diff2 = kFactor * (1 - e2)
			}
			ratingMap[team1] += diff1
			ratingMap[team2] += diff2
		}
	*/

	var teams []Team
	// Place map values in list of teams
	for k, v := range ratingMap {
		teams = append(teams, Team{DisplayName: k, Rating: v})
	}
	// sort.Sort(ByRating(teams))
	return teams
}

func GetCurrentWinStreaks() {

}

func GetLongestWinStreaks() {

}

func GetMarginsOfVictory() {

}
