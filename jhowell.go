package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/binary"
	// "fmt"
	"encoding/json"
	"github.com/jmoiron/sqlx"
	// _ "github.com/lib/pq"
	"io/ioutil"
	"log"
	"opencfb/shared"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

func jhowell() {
	if _, err := os.Stat("./jhowell.csv"); os.IsNotExist(err) {
		shared.JhowellFetcher("./jhowell.csv")
	}
	log.SetOutput(os.Stdout)
	db := shared.InitDatabase()
	var postgresDb *sqlx.DB
	// postgresDb := sqlx.MustConnect("postgres", "postgres://postgres:postgres@localhost:5433/postgres?sslmode=disable")

	file, _ := os.Open("./jhowell.csv")
	defer file.Close()

	scanner := bufio.NewScanner(file)

	var games []shared.Game
	var gameTeams []shared.GameTeam
	var teams []shared.Team
	var nameMap map[string]int64
	if _, err := os.Stat("./jhowellMappings.json"); err == nil {
		// Read the saved map
		b, err := ioutil.ReadFile("./jhowellMappings.json")
		if err != nil {
			log.Fatal(err)
		}
		json.Unmarshal(b, &nameMap)
	} else {
		nameMap = make(map[string]int64)
	}

	for scanner.Scan() {
		line := scanner.Text()
		s := strings.Split(line, ",")
		if len(s) < 9 {
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

		homeTeamId := matchTeamStringToId(postgresDb, homeString, nameMap)
		awayTeamId := matchTeamStringToId(postgresDb, awayString, nameMap)

		// Create a game ID
		generatedId := generateGameId(homeTeamId, awayTeamId, gameDate)

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
			TeamId: homeTeamId,
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
			TeamId: awayTeamId,
			Score:  awayScore,
			Field:  awayField,
			Result: awayResult,
		})
		teams = append(teams, shared.Team{
			Id:          homeTeamId,
			DisplayName: homeString,
		})
		teams = append(teams, shared.Team{
			Id:          awayTeamId,
			DisplayName: awayString,
		})
	}

	// Save our map to file
	jsonString, err := json.MarshalIndent(nameMap, "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	ioutil.WriteFile("./jhowellMappings.json", jsonString, 0644)

	for _, team := range teams {
		log.Println(team)
		shared.InsertTeam(db, team, false)
	}
	for _, game := range games {
		log.Println(game)
		shared.InsertGame(db, game, false)
	}
	for _, gameTeam := range gameTeams {
		log.Println(gameTeam)
		shared.InsertGameTeam(db, gameTeam, false)
	}
}

// espn team ids range from 2 to 3200
// jhowell teams, hash the unique key (name), take the result % (2^32) and add (2^32) (match to espn team by similarity if possible, otherwise assign id)
func generateTeamId(name string) int64 {
	key := name
	sum := sha256.Sum256([]byte(key))
	generatedId := int64(binary.BigEndian.Uint32(sum[0:4])) + 2147483648
	return generatedId
}

// espn game ids range from 212350097 to 400986609
// jhowell games, hash the unique key (date, name, opp) sorted, take the result % 2^32 and add 2^32 (games before 2001)
func generateGameId(homeTeam int64, awayTeam int64, gameDate time.Time) int64 {
	homeIntString := strconv.FormatInt(homeTeam, 10)
	awayIntString := strconv.FormatInt(awayTeam, 10)
	keyArr := []string{gameDate.Format(time.RFC3339), homeIntString, awayIntString}
	sort.Strings(keyArr)
	key := strings.Join(keyArr[:], ":")
	sum := sha256.Sum256([]byte(key))
	// Take the first 4 bytes as a Uint32, add 2**32 to avoid collision with espn IDs
	generatedId := int64(binary.BigEndian.Uint32(sum[0:4])) + 2147483648
	// log.Println(key, sum, generatedId)
	return generatedId
}

func matchTeamStringToId(db *sqlx.DB, input string, nameMap map[string]int64) int64 {
	// match these to existing teams if possible
	// if no match, create a new team ID
	// skip teams with (non-IA) in the input string
	// 0 means the default similarity match is incorrect, assign a new generated ID
	if val, ok := nameMap[input]; ok && val == 0 {
		// Generate an ID
		genId := generateTeamId(input)
		return genId
	}
	if val, ok := nameMap[input]; ok && val > 0 {
		// Use the saved value
		return val
	}
	if strings.Contains(input, "(non-IA)") {
		// Generate an ID
		return generateTeamId(input)
	}
	if db != nil {
		row := db.QueryRow("SELECT id, displayname from team WHERE id < 2000000000 ORDER BY similarity(displayname, $1) desc limit 1", input)
		var team int64
		var displayName string
		err := row.Scan(&team, &displayName)
		if err != nil {
			log.Fatal(err)
		}
		nameMap[input] = team
		log.Println(input, team, displayName)
		return team
	}
	return generateTeamId(input)
}
