package shared

import (
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func InitDatabase() *sqlx.DB {
	connStr := "postgres://postgres:postgres@localhost:5433/opencfb?sslmode=disable"
	db := sqlx.MustConnect("postgres", connStr)
	db.MustExec("CREATE EXTENSION IF NOT EXISTS fuzzystrmatch")
	db.MustExec("CREATE EXTENSION IF NOT EXISTS pg_trgm")
	db.MustExec("CREATE TABLE IF NOT EXISTS game (id bigint PRIMARY KEY, attendance bigint, state text, date timestamp with time zone)")
	db.MustExec("CREATE TABLE IF NOT EXISTS gameteam(gameid bigint REFERENCES game(id), teamid bigint, score bigint, field text, result text, PRIMARY KEY(gameid, teamid))")
	db.MustExec("CREATE TABLE IF NOT EXISTS team (id bigint PRIMARY KEY, displayName text, abbreviation text, color text, alternateColor text, logo text)")
	return db
}
