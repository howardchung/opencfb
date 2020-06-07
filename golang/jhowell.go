package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/binary"
	// "fmt"
	"encoding/json"
	// "github.com/jmoiron/sqlx"
	"io/ioutil"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

func jhowell() {
	if _, err := os.Stat("./jhowell.csv"); os.IsNotExist(err) {
		JhowellFetcher("./jhowell.csv")
	}
	log.SetOutput(os.Stdout)
	db := InitDatabase()

	file, _ := os.Open("./jhowell.csv")
	defer file.Close()

	scanner := bufio.NewScanner(file)

	var games []Game
	var gameTeams []GameTeam
	var teams []Team
	gameSet := make(map[int64]bool)
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
		if month == 1 {
			// Playoff games occur the next year
			year += 1
		}

		// Ignore games more recent than this as we switch to ESPN data source
		if year > 2001 || (year == 2001 && month >= 8) {
			continue
		}

		gameDate := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)

		// determine if home/away/neutral, s[0] is home if s[3] is not @ and s[8] doesn't start with @ (neutral site)
		isNeutralSite := strings.HasPrefix(s[8], "@")
		// Scores and result aren't relative to the home team, but to first team in the row
		// If first team isn't home, then we need to flip everything
		homeString := s[0]
		awayString := s[4]
		homeScore, _ := strconv.ParseInt(s[6], 10, 64)
	  awayScore, _ := strconv.ParseInt(s[7], 10, 64)
		homeResult := s[5]
		awayResult := "T"
		if homeResult == "W" {
			awayResult = "L"
		}
		if homeResult == "L" {
			awayResult = "W"
		}

		homeField := "neutral"
		awayField := "neutral"
		if !isNeutralSite {
			homeField = "home"
			awayField = "away"
		}

		homeConferenceId := int64(2147483647)
		if (strings.HasSuffix(homeString, "(non-IA)")) {
			homeConferenceId = 2147483646
		}
		awayConferenceId := int64(2147483647)
		if (strings.HasSuffix(awayString, "(non-IA)")) {
			awayConferenceId = 2147483646
		}

		if strings.HasPrefix(s[3], "@") {
			// swap everything since first team is away
			homeString, awayString = awayString, homeString
			homeScore, awayScore = awayScore, homeScore
			homeResult, awayResult = awayResult, homeResult
			homeField, awayField = awayField, homeField
			homeConferenceId, awayConferenceId = awayConferenceId, homeConferenceId
		}

		homeTeamId := matchTeamStringToId(homeString, nameMap)
		awayTeamId := matchTeamStringToId(awayString, nameMap)

		// Create a game ID
		// For these purposes, consider home team to be the smaller value so we don't duplicate
		smallerId := homeTeamId
		largerId := awayTeamId
		if smallerId > largerId {
			smallerId, largerId = largerId, smallerId
		}
		generatedId := generateGameId(smallerId, largerId, gameDate)

		// Check if we already added this game (jhowell data lists every game twice since it's under both schools)
		exists := gameSet[generatedId]
		if exists {
			continue
		}
		gameSet[generatedId] = true

		// if generatedId == 5181333640 {
		// 	log.Println(line)
		// }

		games = append(games, Game{
			Id:    generatedId,
			Date:  gameDate,
			Source: "jh",
		})
		gameTeams = append(gameTeams, GameTeam{
			GameId: generatedId,
			TeamId: homeTeamId,
			Score:  homeScore,
			Field:  homeField,
			Result: homeResult,
		})
		gameTeams = append(gameTeams, GameTeam{
			GameId: generatedId,
			TeamId: awayTeamId,
			Score:  awayScore,
			Field:  awayField,
			Result: awayResult,
		})
		teams = append(teams, Team{
			Id:          homeTeamId,
			DisplayName: homeString,
			ConferenceId: homeConferenceId,
		})
		teams = append(teams, Team{
			Id:          awayTeamId,
			DisplayName: awayString,
			ConferenceId: awayConferenceId,
		})
	}

	// Save our map to file
	// jsonString, err := json.MarshalIndent(nameMap, "", "  ")
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// ioutil.WriteFile("./jhowellMappings.json", jsonString, 0644)

	DeleteJHowell(db)
	BeginTransaction(db)
	for _, team := range teams {
		log.Println(team)
		// False here as we don't want to overwrite logo data from ESPN
		InsertTeam(db, team, false)
	}
	for _, game := range games {
		log.Println(game)
		InsertGame(db, game, true)
	}
	for _, gameTeam := range gameTeams {
		log.Println(gameTeam)
		InsertGameTeam(db, gameTeam, true)
	}
	Commit(db)
}

// espn team ids range from 2 to 3200
// jhowell teams, hash the unique key (name), take the result % (2^32) and add (2^32) (match to espn team by similarity if possible, otherwise assign id)
// This places the jhowell data in a separate ID space starting at 2 billion
func generateTeamId(name string) int64 {
	key := name
	sum := sha256.Sum256([]byte(key))
	generatedId := int64(binary.BigEndian.Uint32(sum[0:4])) + 2147483648
	return generatedId
}

// espn game ids range from 212350097 to 400986609
// jhowell games, hash the unique key (date, name, opp) sorted, take the result % 2^32 and add 2^32 (games before 2001)
// This places the jhowell data in a separate ID space starting at 2 billion
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

func matchTeamStringToId(input string, nameMap map[string]int64) int64 {
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
	// if db != nil {
	// 	row := db.QueryRow("SELECT id, displayname from team WHERE id < 2000000000 ORDER BY similarity(displayname, $1) desc limit 1", input)
	// 	var team int64
	// 	var displayName string
	// 	err := row.Scan(&team, &displayName)
	// 	if err != nil {
	// 		log.Fatal(err)
	// 	}
	// 	nameMap[input] = team
	// 	// log.Println(input, team, displayName)
	// 	return team
	// }
	return generateTeamId(input)
}
