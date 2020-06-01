require('dotenv').config();
import express from 'express';
import graphqlHTTP from 'express-graphql';
import { buildSchema } from 'graphql';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import { execFileSync, execSync } from 'child_process';
import path from 'path';

let db: Database = (null as unknown) as Database;
async function init() {
  // Download the DB
  downloadDB();
  db = await open({
    filename: './opencfb-data/opencfb.sqlite',
    driver: sqlite3.Database,
  });
  const schema = fs.readFileSync('./sql/schema.sql', 'utf8');
  const lines = schema.split('\n\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    await db.run(line);
  }
  // Update and upload the new DB
  setTimeout(updateAndUploadDB, 0);
  setInterval(updateAndUploadDB, 60 * 60 * 1000);
  app.listen(process.env.PORT || 5000);
}
init();

function downloadDB() {
  if (!process.env.ENABLE_GH_DB_SYNC) {
    return;
  }
  try {
    execSync('bash ./scripts/download.sh');
  } catch (e) {
    console.warn(e);
  }
}
function updateAndUploadDB() {
  if (!process.env.ENABLE_GH_DB_SYNC) {
    return;
  }
  try {
    execFileSync('./golang/opencfb', { env: { SVC: 'espn', DB_PATH: path.resolve('./opencfb-data/opencfb.sqlite') }, stdio: 'inherit' });
    execSync('bash ./scripts/upload.sh');
  } catch (e) {
    console.warn(e);
  }
}

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Team {
      id: String
      displayName: String
      score: Int
      field: String
      result: String
  }
  
  type Game {
      id: String
      state: String
      date: String
      teams: [Team]
  }
  
  type Query {
    getTeam(id: String): Team
    listTeam(limit: Int): [Team]
    getGame(teamId: String, gameId: String): [Game]
    listGame(limit: Int): [Game]
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  getTeam: async ({ id }: { id: string }) => {
    const data = await db.all('SELECT id, displayname as "displayName" FROM team where id = ?', [
      id,
    ]);
    return data[0];
  },
  listTeam: async ({ limit }: { limit: number }) => {
    const data = await db.all(
      'SELECT id, displayname as "displayName" FROM team ORDER BY id asc limit ?',
      [limit]
    );
    return data;
  },
  getGame: async ({ teamId, gameId }: { teamId: string; gameId: string }) => {
    const data = await db.all(
      'SELECT game.id, game.state, game.date FROM game join gameteam on game.id = gameteam.gameid where gameteam.teamid = ? order by game.date desc',
      [teamId]
    );
    // TODO fetch the teams that played
    console.log(teamId, data);
    return data;
  },
  listGame: async ({ limit }: { limit: number }) => {
    const data = await db.all(
      'SELECT game.id, game.state, game.date FROM game order by game.date desc limit ?',
      [limit]
    );
    // TODO fetch the teams that played
    return data;
  },
};

var app = express();
app.use(cors());
app.use(compression());
app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);
// serve static client files
app.use(express.static('build'));
// TODO more features
// - circles of parity
// - all time rankings
// - team pages
// - all time win streaks
// - active win streaks
// - margins of victory
// - rivalry games

/*

func GetRivalries(db *sqlx.DB, teamId int64, teamId2 int64) []Team {
	return nil
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

	var teams []Team
	// Place map values in list of teams
	for k, v := range ratingMap {
		teams = append(teams, Team{DisplayName: k, Rating: v})
	}
	// sort.Sort(ByRating(teams))
	return teams
}

func GetCurrentWinStreaks() {

}

func GetLongestWinStreaks() {

}

func GetMarginsOfVictory() {

}
*/
/*
func DownloadDatabase() {
	// Grab the existing data from the cloud
	if os.Getenv("GH_ACCESS_TOKEN") != "" {
		output, err := exec.Command("../scripts/download.sh", os.Getenv("GH_ACCESS_TOKEN")).CombinedOutput()
		if err != nil {
			log.Fatal(err)
		}
		log.Print(string(output))
	}
}

func UploadDatabase() {
	// Upload the existing database to the cloud
	if os.Getenv("GH_ACCESS_TOKEN") != "" {
		output, err := exec.Command("../scripts/upload.sh", os.Getenv("GH_ACCESS_TOKEN")).CombinedOutput()
		if err != nil {
			log.Fatal(err)
		}
		log.Print(string(output))
	}
}
*/