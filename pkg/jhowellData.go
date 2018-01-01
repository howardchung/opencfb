package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/binary"
	_ "github.com/lib/pq"
	"github.com/jmoiron/sqlx"
	"log"
	"opencfb/pkg/shared"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

func main() {
	db := shared.InitDatabase()

	file, _ := os.Open("./data/jhowell.csv")
	defer file.Close()

	scanner := bufio.NewScanner(file)

	var games []shared.Game
	var gameTeams []shared.GameTeam
	for scanner.Scan() {
		line := scanner.Text()
		s := strings.Split(line, ",")
		if len(s) < 8 {
			continue
		}
		monthDay := strings.Split(s[2], "/")
		if len(monthDay) < 2 {
			continue
		}
		year, _ := strconv.Atoi(s[1])
		month, _ := strconv.Atoi(monthDay[0])
		day, _ := strconv.Atoi(monthDay[1])
		homeScore, _ := strconv.ParseInt(s[6], 10, 64)
		awayScore, _ := strconv.ParseInt(s[7], 10, 64)
		if month == 1 {
			// Playoff games occur the next year
			year += 1
		}
		gameDate := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)

		// determine if home/away/neutral, s[0] is home if s[3] is not @ and s[8] doesn't start with @ (neutral site)
		homeString := s[0]
		awayString := s[4]
		if strings.HasPrefix(s[3], "@") {
			// swap
			homeString, awayString = awayString, homeString
		}
		isNeutralSite := strings.HasPrefix(s[8], "@")

		homeTeam := matchTeamStringToId(db, homeString)
		awayTeam := matchTeamStringToId(db, awayString)

		// Create a game ID
		homeIntString := strconv.FormatInt(homeTeam, 10)
		awayIntString := strconv.FormatInt(awayTeam, 10)
		keyArr := []string{gameDate.Format(time.RFC3339), homeIntString, awayIntString}
		sort.Strings(keyArr)
		key := strings.Join(keyArr[:], ":")
		sum := sha256.Sum256([]byte(key))
		// Take the first 4 bytes as a Uint32, add 2**32 to avoid collision with espn IDs
		generatedId := int64(binary.BigEndian.Uint32(sum[0:4])) + 2147483648
		// log.Println(key, sum, generatedId)

		games = append(games, shared.Game{
			Id:    generatedId,
			Date:  gameDate,
			State: "STATUS_FINAL",
		})
		homeResult := s[5]
		awayResult := "T"
		if homeResult == "W" {
			awayResult = "L"
		}
		if homeResult == "L" {
			awayResult = "W"
		}
		homeField := "neutral"
		if !isNeutralSite {
			homeField = "home"
		}
		gameTeams = append(gameTeams, shared.GameTeam{
			GameId: generatedId,
			TeamId: homeTeam,
			Score:  homeScore,
			Field:  homeField,
			Result: homeResult,
		})
		awayField := "neutral"
		if !isNeutralSite {
			awayField = "away"
		}
		gameTeams = append(gameTeams, shared.GameTeam{
			GameId: generatedId,
			TeamId: awayTeam,
			Score:  awayScore,
			Field:  awayField,
			Result: awayResult,
		})
	}
}

func matchTeamStringToId(db *sqlx.DB, input string) int64 {
	// TODO match these to existing teams if possible
	// if no match, create a new team ID
	row := db.QueryRow("SELECT id, displayname from team ORDER BY similarity(displayname, $1) desc", input)
	var team int64
	var displayName string
	err := row.Scan(&team, &displayName)
	if err != nil {
		log.Fatal(err)
	}
	log.Println(team, input, displayName)
	return team
}
