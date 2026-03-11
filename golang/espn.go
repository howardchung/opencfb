package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func Espn() {
	db := InitDatabase()
	db.MustExec("BEGIN TRANSACTION")
	// Can start at 2001 (ESPN has data this far)
	year, month, _ := time.Now().Date()
	if int(month) == 1 {
		year -= 1
	}
	startAt := 2001
	gameCount := 0

	for i := startAt; i <= year; i++ {
		seasonType := 2
		week := 1
		// Do every week in the calendar, ingest games/teams
		url := generateApiUrl(strconv.Itoa(i), strconv.Itoa(seasonType), strconv.Itoa(week))
		scoreboard := getScoreboard(url, year)
		// Build queue of API calls
		var queue []string
		if len(scoreboard.Leagues) == 0 {
			log.Fatal("FATAL: no leagues", url)
		}
		for _, season := range scoreboard.Leagues[0].Calendar {
			if season.Label != "Off Season" {
				for _, week := range season.Entries {
					queue = append(queue, generateApiUrl(strconv.Itoa(i), season.Value, week.Value))
				}
			}
		}
		// loop over queue and make those API calls
		for _, apiCall := range queue {
			scoreboard := getScoreboard(apiCall, year)
			for _, event := range scoreboard.Events {
				if len(event.Competitions) == 0 {
					continue
				}
				id, err := strconv.ParseInt(event.Id, 10, 64)
				if err != nil {
					log.Fatal(err, event)
				}
				homeTeam, err := strconv.ParseInt(event.Competitions[0].Competitors[0].Id, 10, 64)
				if err != nil {
					log.Fatal(err, event.Competitions[0].Competitors[0])
				}
				awayTeam, err := strconv.ParseInt(event.Competitions[0].Competitors[1].Id, 10, 64)
				if err != nil {
					log.Fatal(err, event.Competitions[0].Competitors[1])
				}
				homeScore, err := strconv.ParseInt(event.Competitions[0].Competitors[0].Score, 10, 64)
				if err != nil {
					log.Fatal(err, event.Competitions[0].Competitors[0])
				}
				awayScore, err := strconv.ParseInt(event.Competitions[0].Competitors[1].Score, 10, 64)
				if err != nil {
					log.Fatal(err, event.Competitions[0].Competitors[1])
				}
				date, err := time.Parse("2006-01-02T15:04Z", event.Date)
				if err != nil {
					log.Fatal(err, event.Date)
				}
				game := Game{
					Id:         id,
					Attendance: event.Competitions[0].Attendance,
					State:      event.Status.Type.Name,
					Date:       date,
				}
				if game.State == "STATUS_FINAL" {
					InsertGame(db, game, true)
					gameCount += 1
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
						log.Fatal(err, competitor)
					}
					conferenceId, err := strconv.ParseInt(competitor.Team.ConferenceId, 10, 64)
					if err != nil {
						// This isn't critical so just log it
						// Some teams have "" as Conference
						log.Println(err, competitor.Team.DisplayName, competitor.Team.ConferenceId)
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
	db.MustExec("COMMIT")
	log.Printf("espn: %d games", gameCount)
}

func generateApiUrl(year string, seasonType string, week string) string {
	// FBS, group 80
	// FCS, group 81
	return "http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=" + year + "&seasontype=" + seasonType + "&week=" + week + "&limit=100&groups=80"
}

func getScoreboard(url string, currYear int) Scoreboard {
	log.Println(url)
	var scoreboard Scoreboard
	// Check if cached
	spl := strings.Split(url, "?")
	filePath := "espn/" + spl[1]
	var data []byte
	content, err := os.ReadFile(filePath)
	if err == nil {
		// Use the cached file
		data = content
	} else {
		// Otherwise fetch and write result to file
		res, err := http.Get(url)
		if err != nil {
			panic(err.Error())
		}
		body, err := io.ReadAll(res.Body)
		if err != nil {
			panic(err.Error())
		}
		data = body
		// Don't cache data from current season since we may have incomplete responses
		if !strings.Contains(url, "dates="+strconv.Itoa(currYear)) {
			os.WriteFile(filePath, data, 0644)
		}
		time.Sleep(500 * time.Millisecond)
	}
	err = json.Unmarshal(data, &scoreboard)
	if err != nil {
		panic(err.Error())
	}
	return scoreboard
}
