package shared

import (
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"log"
)

func InitDatabase() *sqlx.DB {
	connStr := "postgres://postgres:postgres@localhost:5433/opencfb?sslmode=disable"
	db := sqlx.MustConnect("postgres", connStr)
	db.MustExec("CREATE EXTENSION IF NOT EXISTS fuzzystrmatch")
	db.MustExec("CREATE EXTENSION IF NOT EXISTS pg_trgm")
	db.MustExec("CREATE TABLE IF NOT EXISTS game (id bigint PRIMARY KEY, attendance bigint, state text, date timestamp with time zone)")
	db.MustExec("CREATE TABLE IF NOT EXISTS gameteam(gameid bigint REFERENCES game(id), teamid bigint, score bigint, field text, result text, PRIMARY KEY(gameid, teamid))")
	db.MustExec("CREATE TABLE IF NOT EXISTS team (id bigint PRIMARY KEY, displayName text, abbreviation text, color text, alternateColor text, logo text, conferenceId bigint)")
	db.MustExec("CREATE TABLE IF NOT EXISTS conference(id bigint PRIMARY KEY, displayName text)")
	return db
}

func InsertGame(db *sqlx.DB, game Game) {
	_, err := db.Exec(`INSERT INTO game VALUES ($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING`,
		game.Id, game.Attendance, game.State, game.Date)
	if err != nil {
		log.Fatal(err)
	}
}

func InsertGameTeam(db *sqlx.DB, gameTeam GameTeam) {
	_, err := db.Exec(`INSERT INTO gameteam VALUES ($1, $2, $3, $4, $5) ON CONFLICT(gameid, teamid) DO NOTHING`,
		gameTeam.GameId, gameTeam.TeamId, gameTeam.Score, gameTeam.Field, gameTeam.Result)
	if err != nil {
		log.Fatal(err)
	}
}

func InsertTeam(db *sqlx.DB, team Team) {
	_, err := db.Exec(`INSERT INTO team VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT(id) DO NOTHING`,
		team.Id, team.DisplayName, team.Abbreviation, team.Color, team.AlternateColor, team.Logo, team.ConferenceId)
	if err != nil {
		log.Fatal(err)
	}
}

func GetGamesForTeam() {

}

func GetRivalries() {

}

func GetAllTimeRankings() {

}

func GetOpponentsForTeam() {

}

func GetCurrentWinStreaks() {

}

func GetLongestWinStreaks() {

}

func GetMarginsOfVictory() {

}

/*
func InsertConference(conference Conference) {

}
*/
