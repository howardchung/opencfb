package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/binary"
	// "fmt"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"log"
	"opencfb/shared"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

func jhowell() {
	if _, err := os.Stat("./data/jhowell.csv"); os.IsNotExist(err) {
		shared.JhowellFetcher()
	}
	log.SetOutput(os.Stdout)
	db := shared.InitDatabase()

	file, _ := os.Open("./data/jhowell.csv")
	defer file.Close()

	scanner := bufio.NewScanner(file)

	var games []shared.Game
	var gameTeams []shared.GameTeam
	var teams []shared.Team
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

		homeTeamId, homeDisplayName := matchTeamStringToId(db, homeString)
		if !nameMap[homeString] {
			log.Println(homeTeamId, homeString, homeDisplayName)
			nameMap[homeString] = true
		}

		awayTeamId, awayDisplayName := matchTeamStringToId(db, awayString)
		if !nameMap[awayString] {
			log.Println(awayTeamId, awayString, awayDisplayName)
			nameMap[awayString] = true
		}

		// panic(fmt.Sprintf("stop"))

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
	for _, team := range teams {
		shared.InsertTeam(db, team)
	}
	for _, game := range games {
		shared.InsertGame(db, game)
	}
	for _, gameTeam := range gameTeams {
		shared.InsertGameTeam(db, gameTeam)
	}
}

// espn team ids range from 2 to 3200
// jhowell teams, hash the unique key (name), take the result % (2^32) and add (2^32) (match to espn team by edit distance if possible, otherwise assign id)
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

func matchTeamStringToId(db *sqlx.DB, input string) (int64, string) {
	// match these to existing teams if possible
	// if no match, create a new team ID
	// skip teams with (non-IA) in the input string
	corrections := map[string]int64{
		"Nevada-LasVegas":           2439,
		"TexasChristian":            2628,
		"BrighamYoung":              252,
		"Texas-ElPaso":              2638,
		"Mississippi":               145,
		"Texas":                     251,
		"Kent":                      2309, // Kent State?
		"NorthCarolina":             153,
		"Miami(Florida)":            2390,
		"CentralFlorida":            2116,
		"FloridaInternational":      2229,
		"NorthCarolinaState":        152,
		"Pacific":                   0,
		"Davidson":                  0,
		"GeorgeWashington":          0,
		"Denver":                    0,
		"Alabama":                   333,
		"SouthernCalifornia":        30,
		"TexasAM":                   245,
		"DetroitMercy":              0,
		"Louisiana-Lafayette":       0,
		"MiddleTennesseeState":      0,
		"LouisianaState":            99,
		"FullertonState":            0,
		"LongBeachState":            0,
		"WichitaState":              0,
		"GeorgiaPre-Flight":         0,
		"Sewanee":                   0,
		"Loyola(NewOrleans)":        0,
		"StMarys":                   0,
		"MississippiCollege":        0,
		"Centre":                    0,
		"Oglethorpe":                0,
		"Pennsylvania":              0,
		"SpringHill":                0,
		"Birmingham-Southern":       0,
		"Carlisle":                  0,
		"WashingtonLee":             0,
		"Haskell":                   0,
		"Maryville":                 0,
		"Nashville":                 0,
		"Cumberland":                0,
		"Alabama-Birmingham":        0,
		"AlamedaCoastGuard":         0,
		"MarchField":                0,
		"StMarysPre-Flight":         0,
		"DelMontePre-Flight":        0,
		"SanFrancisco":              0,
		"Southern":                  0,
		"AmarilloField":             0,
		"LubbockField":              0,
		"WestTexasAM":               0,
		"NormanNAS":                 0,
		"SecondAirForce(Colorado)":  0,
		"RandolphField":             0,
		"Amherst":                   0,
		"Dartmouth":                 0,
		"Columbia":                  0,
		"Vermont":                   0,
		"Brown":                     0,
		"Colby":                     0,
		"Harvard":                   0,
		"WorcesterTech":             0,
		"Springfield":               0,
		"Stevens":                   0,
		"Cornell":                   0,
		"MIT":                       0,
		"Tufts":                     0,
		"VirginiaMilitaryInstitute": 0,
		"EastTennesseeState":        0,
		"Hardin-Simmons":            0,
		"Marquette":                 0,
		"Drake":                     0,
		"SantaClara":                0,
		"Centenary":                 0,
		"LoyolaMarymount":           0,
		"Portland":                  0,
		"Gonzaga":                   0,
		"Chicago":                   0,
		"Phillips":                  0,
		"Southwestern(Texas)":       0,
		"Washington(Missouri)":      0,
		"StLouis":                   0,
		"Drury":                     0,
		"Texas-Arlington":           0,
		"Princeton":                 0,
		"BostonUniversity":          0,
		"CoastGuard":                0,
		"ColoradoCollege":           0,
		"Georgetown":                0,
		"WashingtonJefferson":       0,
		"Williams":                  0,
		"Dickinson":                 0,
		"Union(NewYork)":            0,
		"Trinity(Connecticut)":      0,
		"Wesleyan":                  0,
		"Manhattan":                 0,
		"FortBenning":               0,
		"Dayton":                    0,
		"Bates":                     0,
		"Beloit":                    0,
		"Lawrence":                  0,
		"Knox":                      0,
		"LakeForest":                0,
		"Millsaps":                  0,
		"MerchantMarine":            0,
		"NewYorkUniversity":         0,
		"NorthCarolinaPre-Flight":   0,
		"Bowdoin":                   0,
		"Tampa":                     0,
		"Xavier":                    0,
		"Bradley":                   0,
		"WesternState":              0,
		"Regis":                     0,
		"ColoradoMines":             0,
		"Swarthmore":                0,
		"FranklinMarshall":          0,
		"Haverford":                 0,
		"Butler":                    0,
		"MareIslandMarines":         0,
		"CampGrant":                 0,
		"FortRiley":                 0,
		"GreatLakesNavy":            0,
		"IowaPre-Flight":            0,
		"WestVirginiaWesleyan":      0,
		"CarnegieTech":              0,
		"Creighton":                 0,
		"Rhodes":                    0,
		"Wabash":                    0,
		"Lombard":                   0,
		"Cornell(Iowa)":             0,
		"Erskine":                   0,
		"Newberry":                  0,
		"Coe":                       0,
		"Hamilton":                  0,
		"FortWarren":                0,
		"Washburn":                  0,
		"Grinnell":                  0,
		"Hampden-Sydney":            0,
		"QuanticoMarines":           0,
		"Simpson":                   0,
		"FloridaAM":                 0,
		"LosAngelesState":           0,
		"SantaBarbara":              0,
		"TennesseeMedical":          0,
		"Whitman":                   0,
	}
	// some teams need to be manually corrected
	if corrections[input] == 0 {
		return generateTeamId(input), input
	}
	if strings.Contains(input, "(non-IA)") {
		return generateTeamId(input), input
	}
	if corrections[input] > 0 {
		return corrections[input], input
	}
	row := db.QueryRow("SELECT id, displayname from team ORDER BY similarity(displayname, $1) desc", input)
	var team int64
	var displayName string
	err := row.Scan(&team, &displayName)
	if err != nil {
		log.Fatal(err)
	}
	return team, displayName
}
