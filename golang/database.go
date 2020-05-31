package main

import (
	// "encoding/binary"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"time"
)

func InitDatabase() *sqlx.DB {
	// Grab the existing data from the cloud
	if os.Getenv("GIT_DATA_REPO") != "" {
		output, err := exec.Command("./scripts/download.sh", os.Getenv("GH_ACCESS_TOKEN")).CombinedOutput()
		if err != nil {
			log.Fatal(err)
		}
		log.Print(string(output))
	}

	connStr := "../data/opencfb.sqlite"
	db := sqlx.MustConnect("sqlite3", connStr)
	schema, err := ioutil.ReadFile("./schema.sql")
	if err != nil {
		log.Fatal(err)
	}
	db.MustExec(string(schema))
	return db
}

func UploadDatabase() {
	// Upload the existing database to the cloud
	if os.Getenv("GIT_DATA_REPO_ACCESS_TOKEN") != "" {
		output, err := exec.Command("./scripts/upload.sh", os.Getenv("GH_ACCESS_TOKEN")).CombinedOutput()
		if err != nil {
			log.Fatal(err)
		}
		log.Print(string(output))
	}
}

func InsertGame(db *sqlx.DB, game Game, replace bool) {
	query := `INSERT OR IGNORE INTO game VALUES ($1, $2, $3, $4)`
	if replace {
		query = `INSERT OR REPLACE INTO game VALUES ($1, $2, $3, $4)`
	}
	_, err := db.Exec(query,
		game.Id, game.Attendance, game.State, game.Date)
	if err != nil {
		log.Fatal(err)
	}
}

func InsertGameTeam(db *sqlx.DB, gameTeam GameTeam, replace bool) {
	query := `INSERT OR IGNORE INTO gameteam VALUES ($1, $2, $3, $4, $5)`
	if replace {
		query = `INSERT OR REPLACE INTO gameteam VALUES ($1, $2, $3, $4, $5)`
	}
	_, err := db.Exec(query,
		gameTeam.GameId, gameTeam.TeamId, gameTeam.Score, gameTeam.Field, gameTeam.Result)
	if err != nil {
		log.Fatal(err)
	}
}

func InsertTeam(db *sqlx.DB, team Team, replace bool) {
	query := `INSERT OR IGNORE INTO team VALUES ($1, $2, $3, $4, $5, $6, $7)`
	if replace {
		query = `INSERT OR REPLACE INTO team VALUES ($1, $2, $3, $4, $5, $6, $7)`
	}
	_, err := db.Exec(query,
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
		if err != nil {
			log.Fatal(err)
		}
		response = append(response, t)
	}
	return response
}

func GetGames(db *sqlx.DB, teamId int64, season int) []Game {
	log.Printf("GetGames: %d", teamId)
	var response []Game
	rows, err := db.Queryx("SELECT DISTINCT game.id, game.state, game.date FROM game JOIN gameteam ON gameteam.gameid = game.id WHERE (0 = $1 OR teamid = $1) ORDER BY date desc LIMIT 100", teamId)
	if err != nil {
		log.Fatal(err)
	}
	gameTeams, err := db.Queryx("SELECT * from gameteam ORDER BY gameid")
	if err != nil {
		log.Fatal(err)
	}
	var gameTeamObjs []GameTeam
	for gameTeams.Next() {
		var gameId int64
		var teamId int64
		var score int64
		var field string
		var result string
		err = gameTeams.Scan(&gameId, &teamId, &score, &field, &result)
		if err != nil {
			log.Fatal(err)
		}
		gt := GameTeam{
			GameId: gameId,
			TeamId: teamId,
			Field:  field,
			Score:  score,
			Result: result,
		}
		gameTeamObjs = append(gameTeamObjs, gt)
	}
	for rows.Next() {
		var id int64
		var state string
		var date string
		err = rows.Scan(&id, &state, &date)
		if err != nil {
			log.Fatal(err)
		}
		parsedDate, err := time.Parse("2006-01-02 15:04:05+00:00", date)
		if err != nil {
			log.Fatal(err)
		}
		var singleGameTeams []Team
		for _, gt := range gameTeamObjs {
			if gt.GameId == id {
				singleGameTeams = append(singleGameTeams, Team{
					Id:     gt.TeamId,
					Field:  gt.Field,
					Score:  gt.Score,
					Result: gt.Result,
				})
			}
		}
		g := Game{
			Id:    id,
			State: state,
			Date:  parsedDate,
			Teams: singleGameTeams,
		}
		// log.Println(g)

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
