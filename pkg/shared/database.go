package shared

import (
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"log"
)

func InitDatabase() *sqlx.DB {
	connStr := "postgres://postgres:postgres@localhost:5433/postgres?sslmode=disable"
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

/*
func InsertConference(conference Conference) {

}
*/

func GetTeam(db *sqlx.DB, id int) Team {
	log.Printf("GetTeam: %d", id)
	var response []Team
	rows, err := db.Queryx("SELECT * FROM team WHERE id = $1", id)
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var t Team
		err = rows.StructScan(&t)
		response = append(response, t)
	}
	if len(response) < 1 {
		return Team{}
	}
	return response[0]
}

func GetTeams(db *sqlx.DB) []Team {
	var response []Team
	rows, err := db.Queryx("SELECT * FROM team")
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

func GetGamesForTeam() {

}

func GetRivalries() {

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

func GetOpponentsForTeam() {

}

func GetCurrentWinStreaks() {

}

func GetLongestWinStreaks() {

}

func GetMarginsOfVictory() {

}
