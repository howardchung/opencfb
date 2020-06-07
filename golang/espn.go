package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	// "strings"
	"time"
)

func espn() {
	db := InitDatabase()
	BeginTransaction(db);
	// Can start at 2001 (ESPN has data this far)
	year, _, _ := time.Now().Date()
	startAt := year - 1

	for i := startAt; i <= year; i++ {
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
			time.Sleep(100 * time.Millisecond)
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
				game := Game{
					Id:         id,
					Attendance: event.Competitions[0].Attendance,
					State:      event.Status.Type.Name,
					Date:       date,
				}
				if game.State == "STATUS_FINAL" {
					InsertGame(db, game, true)
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
					var gameTeams []GameTeam
					gameTeams = append(gameTeams, GameTeam{
						GameId: id,
						TeamId: homeTeam,
						Score:  homeScore,
						Field:  event.Competitions[0].Competitors[0].HomeAway,
						Result: homeResult,
					})
					gameTeams = append(gameTeams, GameTeam{
						GameId: id,
						TeamId: awayTeam,
						Score:  awayScore,
						Field:  event.Competitions[0].Competitors[1].HomeAway,
						Result: awayResult,
					})
					for _, gameTeam := range gameTeams {
						// Replace is false since we currently write rating data to this table
						InsertGameTeam(db, gameTeam, false)
					}
				}

				for _, competitor := range event.Competitions[0].Competitors {
					id, err := strconv.ParseInt(competitor.Id, 10, 64)
					if err != nil {
						log.Fatal(err)
					}
					conferenceId, err := strconv.ParseInt(competitor.Team.ConferenceId, 10, 64)
					if err != nil {
						log.Println(err, competitor.Team.DisplayName)
					}
					team := Team{
						Id:             id,
						DisplayName:    competitor.Team.DisplayName,
						Abbreviation:   competitor.Team.Abbreviation,
						Color:          competitor.Team.Color,
						AlternateColor: competitor.Team.AlternateColor,
						Logo:           competitor.Team.Logo,
						ConferenceId:   conferenceId,
					}
					InsertTeam(db, team, true)
				}
			}
		}
	}
	Commit(db)
}

func generateApiUrl(year string, seasonType string, week string) string {
	// FBS, group 80
	// FCS, group 81
	return "http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?lang=en&region=us&calendartype=blacklist&limit=100&dates=" + year + "&seasontype=" + seasonType + "&week=" + week + "&groups=80"
}

func getScoreboard(url string) Scoreboard {
	var scoreboard Scoreboard
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
	// err = ioutil.WriteFile("./"+url[(strings.Index(url, "?")+1):], body, 0644)
	// if err != nil {
	// 	panic(err.Error())
	// }
	return scoreboard
}