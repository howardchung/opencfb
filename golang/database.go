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
	connStr := "../opencfb-data/opencfb.sqlite"
	db := sqlx.MustConnect("sqlite3", connStr)
	schema, err := ioutil.ReadFile("../sql/schema.sql")
	if err != nil {
		log.Fatal(err)
	}
	db.MustExec(string(schema))
	return db
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
