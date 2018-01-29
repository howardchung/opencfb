package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/binary"
	// "fmt"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"log"
	"opencfb/pkg/shared"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

func main() {
	log.SetOutput(os.Stdout)
	db := shared.InitDatabase()

	file, _ := os.Open("./data/jhowell.csv")
	defer file.Close()

	scanner := bufio.NewScanner(file)

	var games []shared.Game
	var gameTeams []shared.GameTeam
	var nameMap map[string]bool
	nameMap = make(map[string]bool)

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
		
		homeTeam, homeDisplayName := matchTeamStringToId(db, homeString)
		if !nameMap[homeString] {
			log.Println(homeTeam, homeString, homeDisplayName)
			nameMap[homeString] = true
		}

		awayTeam, awayDisplayName := matchTeamStringToId(db, awayString)
		if !nameMap[awayString] {
			log.Println(awayTeam, awayString, awayDisplayName)
			nameMap[awayString] = true
		}

		// panic(fmt.Sprintf("stop"))

		// Create a game ID
		generatedId := generateGameId(homeTeam, awayTeam, gameDate)

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

// espn team ids range from 2 to 3200
// jhowell teams, hash the unique key (name), take the result % (2^32) and add (2^32) (match to espn team by edit distance if possible, otherwise assign id)
func generateTeamId(string name) {
	key := name
	sum := sha256.Sum256([]byte(key))
	generatedId := int64(binary.BigEndian.Uint32(sum[0:4])) + 2147483648
	return generatedId
}

// espn game ids range from 212350097 to 400986609
// jhowell games, hash the unique key (date, name, opp) sorted, take the result % 2^32 and add 2^32 (games before 2001)
func generateGameId(int64 homeTeam, int64 awayTeam time.Date gameDate) int64 {
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

func matchTeamStringToId(db *sqlx.DB, input string) (int64, string) {
	// match these to existing teams if possible
	// if no match, create a new team ID
	// skip teams with (non-IA) in the input string
	if strings.Contains(input, "(non-IA)") {
		return generateTeamId(input), input
	}
	// TODO some teams need to be manually corrected
	// NorthCarolinaState North Carolina A&T Aggies
	// 2018/01/29 06:24:45 26 BrighamYoung UCLA Bruins
	// 2018/01/29 06:24:44 344 Mississippi Mississippi State Bulldogs
	// 2018/01/29 06:24:44 322 Louisiana-Lafayette Lafayette Leopards
	// 2018/01/29 06:24:44 2440 Nevada-LasVegas Nevada Wolf Pack
	// 2018/01/29 06:24:44 256 Marion (non-IA) James Madison Dukes
	// 2018/01/29 06:24:44 3145 Spring Hill (non-IA) NORTH All-Stars
	// 2018/01/29 06:24:44 2640 Birmingham-Southern Texas Southern Tigers
	row := db.QueryRow("SELECT id, displayname from team ORDER BY similarity(displayname, $1) desc", input)
	var team int64
	var displayName string
	err := row.Scan(&team, &displayName)
	if err != nil {
		log.Fatal(err)
	}
	return team, displayName
}
