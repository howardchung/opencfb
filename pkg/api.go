package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	// "strings"
	// "time"
)

func writeData(w http.ResponseWriter, jData []byte) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.Write(jData)
}

func main() {
	db := initDatabase()
	http.HandleFunc("/teams", func(w http.ResponseWriter, r *http.Request) {
		var response []Team
		rows, err := db.Queryx("SELECT * FROM place")
		for rows.Next() {
			var t Team
			err = rows.StructScan(&t)
			response = append(response, t)
		}
		jData, err := json.Marshal(response)
		if err != nil {
			log.Fatal(err)
		}
		writeData(w, jData)
	})

	http.HandleFunc("/rankings", func(w http.ResponseWriter, r *http.Request) {
		// Elo rank teams
		// Start all teams at 1000
		var ratingMap map[string]float64
		ratingMap = make(map[string]float64)
		kFactor := 32.0

		var response []Game
		rows, err := db.Queryx("SELECT * FROM game join gameteam on game.id = gameteam.gameid order by game.date")
		for rows.Next() {
			var g Game
			err = rows.StructScan(&g)
			response = append(response, g)
		}

		// Iterate over games, when we find a new team add them to rating map
		for _, g := range response {
			team1 := g.name
			team2 := g.opp
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

		var teams []Team
		// Place map values in list of teams
		for k, v := range ratingMap {
			teams = append(teams, Team{Name: k, Rating: v})
		}
		sort.Sort(ByRating(teams))
		b, _ := json.Marshal(teams, "", "")
		writeData(w, b)
	})
	log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT"), nil))
}
