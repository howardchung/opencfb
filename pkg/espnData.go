package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"opencfb/pkg/shared"
	"strconv"
	"strings"
	"time"
)

func main() {
	db := shared.InitDatabase()

	year, _, _ := time.Now().Date()

	// Start at 2001 (ESPN has data this far)
	for i := 2001; i <= year; i++ {
		seasonType := 2
		week := 1
		// Do every week in the calendar, ingest games/teams
		url := generateApiUrl(strconv.Itoa(i), strconv.Itoa(seasonType), strconv.Itoa(week))
		scoreboard := getScoreboard(url)
		// Build queue of API calls
		var queue []string
		for _, season := range scoreboard.Leagues[0].Calendar {
			for _, week := range season.Entries {
				queue = append(queue, generateApiUrl(strconv.Itoa(i), season.Value, week.Value))
			}
		}
		// loop over queue and make those API calls
		for _, apiCall := range queue {
			log.Println(apiCall)
			scoreboard := getScoreboard(apiCall)
			for _, event := range scoreboard.Events {
				id, _ := strconv.ParseInt(event.Id, 10, 64)
				homeTeam, _ := strconv.ParseInt(event.Competitions[0].Competitors[0].Id, 10, 64)
				awayTeam, _ := strconv.ParseInt(event.Competitions[0].Competitors[1].Id, 10, 64)
				homeScore, _ := strconv.ParseInt(event.Competitions[0].Competitors[0].Score, 10, 64)
				awayScore, _ := strconv.ParseInt(event.Competitions[0].Competitors[1].Score, 10, 64)
				date, err := time.Parse("2006-01-02T15:04Z", event.Date)
				if err != nil {
					log.Fatal(err)
				}
				game := shared.Game{
					Id:         id,
					Attendance: event.Competitions[0].Attendance,
					State:      event.Status.Type.Name,
					Date:       date,
				}
				if game.State == "STATUS_FINAL" {
					_, err := db.Exec(`INSERT INTO game VALUES ($1, $2, $3, $4) ON CONFLICT(id) DO NOTHING`,
						game.Id, game.Attendance, game.State, game.Date)
					if err != nil {
						log.Fatal(err)
					}
					homeResult := "T"
					awayResult := "T"
					if homeScore > awayScore {
						homeResult = "W"
						awayResult = "L"
					}
					if awayScore > homeScore {
						homeResult = "L"
						awayResult = "W"
					}
					var gameTeams []shared.GameTeam
					gameTeams = append(gameTeams, shared.GameTeam{
						GameId: id,
						TeamId: homeTeam,
						Score:  homeScore,
						Field:  event.Competitions[0].Competitors[0].HomeAway,
						Result: homeResult,
					})
					gameTeams = append(gameTeams, shared.GameTeam{
						GameId: id,
						TeamId: awayTeam,
						Score:  awayScore,
						Field:  event.Competitions[0].Competitors[1].HomeAway,
						Result: awayResult,
					})
					for _, gameTeam := range gameTeams {
						_, err := db.Exec(`INSERT INTO gameteam VALUES ($1, $2, $3, $4, $5) ON CONFLICT(gameid, teamid) DO NOTHING`,
							gameTeam.GameId, gameTeam.TeamId, gameTeam.Score, gameTeam.Field, gameTeam.Result)
						if err != nil {
							log.Fatal(err)
						}
					}
				}

				for _, competitor := range event.Competitions[0].Competitors {
					id, err := strconv.ParseInt(competitor.Id, 10, 64)
					if err != nil {
						log.Fatal(err)
					}
					team := shared.Team{
						Id:             id,
						DisplayName:    competitor.Team.DisplayName,
						Abbreviation:   competitor.Team.Abbreviation,
						Color:          competitor.Team.Color,
						AlternateColor: competitor.Team.AlternateColor,
						Logo:           competitor.Team.Logo,
					}
					_, err = db.Exec(`INSERT INTO team VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(id) DO NOTHING`,
						team.Id, team.DisplayName, team.Abbreviation, team.Color, team.AlternateColor, team.Logo)
					if err != nil {
						log.Fatal(err)
					}

				}
			}
		}
	}
}

func generateApiUrl(year string, seasonType string, week string) string {
	// FBS, group 80
	// FCS, group 81
	return "http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?lang=en&region=us&calendartype=blacklist&limit=100&dates=" + year + "&seasontype=" + seasonType + "&week=" + week + "&groups=80"
}

func getScoreboard(url string) shared.Scoreboard {
	var scoreboard shared.Scoreboard
	res, err := http.Get(url)
	if err != nil {
		panic(err.Error())
	}
	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		panic(err.Error())
	}
	err = json.Unmarshal([]byte(body), &scoreboard)
	if err != nil {
		panic(err.Error())
	}
	err = ioutil.WriteFile("./data/espn/"+url[(strings.Index(url, "?")+1):], body, 0644)
	if err != nil {
		panic(err.Error())
	}
	return scoreboard
}

// Team conference affiliation
// http://cdn.espn.com/core/college-football/standings?xhr=1&render=true&device=desktop&country=us&lang=en&region=us&site=espn&edition-host=espn.com&one-site=true&site-type=full
// Team details
// http://cdn.espn.com/core/college-football/team/_/id/2116/ucf-knights?xhr=1&render=true&device=desktop&country=us&lang=en&region=us&site=espn&edition-host=espn.com&one-site=true&site-type=full
// List of teams
// http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?groups=80&lang=en&region=us&contentorigin=espn&tz=America%2FNew_York&limit=200
