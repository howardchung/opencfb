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
  await db.exec(schema);
  app.listen(process.env.PORT || 5000);
  // Update and upload the new DB
  await updateTasks();
  setInterval(updateTasks, 60 * 60 * 1000);
}
init();

async function updateTasks() {
  updateDB();
  await replaceHttp();
  await computeStreaks();
  await computeCounts();
  await computeRankings();
  uploadDB();
}

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Team {
    id: String
    displayName: String
    abbreviation: String
    logo: String
    score: Int
    field: String
    result: String
    rating: Float
    gamesPlayed: Int
    gamesWon: Int
    gamesLost: Int
    gamesTied: Int
    color: String
    alternateColor: String
  }
  
  type Game {
    id: String
    date: String
    result: String
    delta: Float
    teams: [Team]
  }

  type TeamGame {
    id: String
    date: String
    result: String
    rating: Float
    score: Int
    delta: Float
    field: String
    logo: String
    displayName: String
    opponent: Team
  }

  type RankingTeam {
    id: String
    displayName: String
    abbreviation: String
    logo: String
    rating: Float
    gamesPlayed: Int
    gamesWon: Int
  }

  type RatingHistory {
    date: String
    result: String
    rating: Float
  }

  type Streak {
    id: String
    logo: String
    displayName: String
    current: Int
    allTime: Int
  }

  type TeamRivalry {
    id: String
    logo: String
    displayName: String
    gamesPlayed: Int
    gamesWon: Int
  }
  
  type Query {
    getTeam(teamId: String): Team
    listTeam(limit: Int): [Team]
    listTeamGame(teamId: String, limit: Int): [TeamGame]
    listTeamRivalry(teamId: String): [TeamRivalry]
    listGame(limit: Int): [Game]
    listRankingTeam(limit: Int): [RankingTeam]
    listRatingHistory(teamId: String): [RatingHistory]
    listStreak(type: String): [Streak]
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  getTeam: async ({ teamId }: { teamId: string }) => {
    const data = await db.all(
      `SELECT team.id, logo, abbreviation, displayname as "displayName", gamesPlayed, gamesWon, gamesLost, gamesTied, rating, color, alternatecolor as "alternateColor"
      FROM team
      left join team_ranking on team.id = team_ranking.id
      left join team_count on team.id = team_count.id
      where team.id = ?`,
      [teamId]
    );
    return data[0];
  },
  listTeam: async ({ limit }: { limit: number }) => {
    const data = await db.all(
      'SELECT id, logo, abbreviation, displayname as "displayName" FROM team ORDER BY id asc limit ?',
      [limit]
    );
    return data;
  },
  listTeamGame: async ({
    teamId,
    limit,
  }: {
    teamId: string;
    limit: number;
  }) => {
    const data = await db.all(
      `SELECT game.id, game.date, ged.delta, team.logo, team.displayname as "displayName", gameteam.score, gameteam.rating, gameteam.result, gameteam.field, gt2.score as oppScore, gt2.teamid as oppId, gt2.rating as oppRating, gt2.result as oppResult, oppTeam.logo as oppLogo, oppTeam.displayname as oppName
      FROM game
      join gameteam on game.id = gameteam.gameid
      join gameteam gt2 on gt2.gameid = gameteam.gameid and gt2.teamid != gameteam.teamid
      join team on gameteam.teamid = team.id
      left join team oppTeam on oppTeam.id = gt2.teamid
      left join game_elo_delta ged on ged.id = game.id
      where gameteam.teamid = ?
      order by game.date desc
      limit ?
      `,
      [teamId, limit]
    );
    const final = data.map((row) => ({
      id: row.id,
      date: row.date,
      score: row.score,
      field: row.field,
      rating: row.rating,
      delta: row.delta,
      result: row.result,
      logo: row.logo,
      displayName: row.displayName,
      opponent: {
        id: row.oppId,
        logo: row.oppLogo,
        displayName: row.oppName,
        score: row.oppScore,
        rating: row.oppRating,
        result: row.oppResult,
      },
    }));
    return final;
  },
  listTeamRivalry: async ({ teamId }: { teamId: string }) => {
    const data = await db.all(
      `
      SELECT id, logo, displayname as "displayName", count(1) gamesPlayed, sum(case when gameteam.result = 'W' then 1 else 0 end) gamesWon
      from gameteam
      join gameteam gt2 on gameteam.gameid = gt2.gameid and gameteam.teamid != gt2.teamid
      left join team on gt2.teamid = team.id
      where gameteam.teamid = ?
      group by id, logo, displayName
      order by gamesPlayed desc
    `,
      [teamId]
    );
    return data;
  },
  listStreak: async ({ type }: { type: string }) => {
    const data = await db.all(`
    SELECT team.id, team.logo, team.displayname as "displayName", current, allTime
    FROM team
    LEFT JOIN team_streak on team.id = team_streak.id
    ORDER BY ${type === 'allTime' ? 'allTime' : 'current'} desc
    limit 100
    `);
    return data;
  },
  listGame: async ({ limit }: { limit: number }) => {
    const data = await db.all(
      `SELECT game.id, game.date, gt.score as team1Score, gt2.score as team2Score, gt.teamid as team1Id, gt2.teamid as team2Id, t1.displayname as team1Name, t2.displayname as team2Name, gt.result as team1Result, gt2.result as team2Result, t1.logo as team1Logo, t2.logo as team2Logo, gt.rating as team1Rating, gt2.rating as team2Rating, ged.delta
      FROM game
      join gameteam gt on game.id = gt.gameid
      join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid
      join team t1 on gt.teamid = t1.id
      join team t2 on gt2.teamid = t2.id
      left join game_elo_delta ged on game.id = ged.id
      where gt.teamid < gt2.teamid
      order by game.date desc
      limit ?`,
      [limit]
    );
    // Put team data into array
    const final = data.map((row) => ({
      id: row.id,
      date: row.date,
      delta: row.delta,
      teams: [
        {
          id: row.team1Id,
          logo: row.team1Logo,
          displayName: row.team1Name,
          result: row.team1Result,
          score: row.team1Score,
          rating: row.team1Rating,
        },
        {
          id: row.team2Id,
          logo: row.team2Logo,
          displayName: row.team2Name,
          result: row.team2Result,
          score: row.team2Score,
          rating: row.team2Rating,
        },
      ],
    }));

    return final;
  },
  listRankingTeam: async ({ limit }: { limit: number }) => {
    const data = await db.all(
      `SELECT team_ranking.id, team.displayname as "displayName", logo, abbreviation, team_ranking.rating, gamesPlayed, gamesWon
      FROM team_ranking
      left join team on team_ranking.id = team.id
      left join team_count on team.id = team_count.id
      where team.displayName NOT LIKE '%(non-IA)'
      order by rating desc limit ?`,
      [limit]
    );
    return data;
  },
  listRatingHistory: async ({ teamId }: { teamId: string }) => {
    const data = await db.all(
      `SELECT date, result, cast(rating as int) as rating
      from game
      join gameteam on gameteam.gameid = game.id
      where gameteam.teamid = ?
      order by date asc
      `,
      [teamId]
    );
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
// Send index.html for all other requests (SPA)
app.use('/*', (req, res) => {
  res.sendFile(__dirname + '/build/public/index.html');
});
// TODO more features
// - circles of parity (longest cycle in directed graph problem)
// - margins of victory
// - dedicated rivalry pages

function downloadDB() {
  if (!process.env.ENABLE_GH_DB_SYNC) {
    return;
  }
  execSync('bash ./scripts/download.sh');
}

function uploadDB() {
  if (!process.env.ENABLE_GH_DB_SYNC) {
    return;
  }
  execSync('bash ./scripts/upload.sh');
}

function updateDB() {
  execFileSync('./golang/opencfb', {
    env: {
      SVC: 'espn',
      DB_PATH: path.resolve('./opencfb-data/opencfb.sqlite'),
    },
    stdio: 'inherit',
  });
}

async function replaceHttp() {
  await db.exec(`UPDATE team SET logo = replace(logo, 'http://', 'https://')`);
}

async function computeRankings() {
  // Elo rank teams
  // Start all teams at 1000
  let ratingMap: NumberDict = {};
  let initial = 1000;
  let kFactor = 32;

  // Get an array of all teams
  const data = await db.all(
    `SELECT game.id, gt.teamid as team1, gt2.teamid as team2, gt.result as team1result
    FROM game
    join gameteam gt on game.id = gt.gameid
    join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid
    join team t1 on gt.teamid = t1.id
    join team t2 on gt2.teamid = t2.id
    where gt.teamid < gt2.teamid
    --and t1.displayname NOT LIKE '%(non-IA)'
    --and t2.displayname NOT LIKE '%(non-IA)'
    order by game.date asc`
  );

  await db.run('BEGIN TRANSACTION');
  for (let i = 0; i < data.length; i++) {
    const game = data[i];
    let team1 = game.team1;
    let team2 = game.team2;
    let team1Result = game.team1result;
    if (!ratingMap[team1]) {
      ratingMap[team1] = initial;
    }
    if (!ratingMap[team2]) {
      ratingMap[team2] = initial;
    }
    const currRating1 = ratingMap[team1];
    const currRating2 = ratingMap[team2];
    const r1 = Math.pow(10, currRating1 / 400);
    const r2 = Math.pow(10, currRating2 / 400);
    const e1 = r1 / (r1 + r2);
    const e2 = r2 / (r1 + r2);
    let diff1 = 0;
    let diff2 = 0;
    if (team1Result === 'W') {
      diff1 = kFactor * (1 - e1);
      diff2 = kFactor * (0 - e2);
    } else if (team1Result === 'L') {
      diff1 = kFactor * (0 - e1);
      diff2 = kFactor * (1 - e2);
    }
    // Write the current team ratings into the gameteam table (pre-game rating)
    await db.run(
      `UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?`,
      [ratingMap[team1], game.id, team1]
    );
    await db.run(
      `UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?`,
      [ratingMap[team2], game.id, team2]
    );
    ratingMap[team1] += diff1;
    ratingMap[team2] += diff2;
    // Don't do anything for ties currently
    // console.log(i, diff1, ratingMap[team1], ratingMap[team2]);
    // Record the delta
    await db.run(
      'INSERT OR REPLACE INTO game_elo_delta (id, delta) VALUES (?, ?)',
      [game.id, Math.abs(diff1)]
    );
  }

  await db.run('DELETE FROM team_ranking');
  let keys = Object.keys(ratingMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    await db.run('INSERT INTO team_ranking(id, rating) VALUES (?, ?)', [
      key,
      ratingMap[key],
    ]);
  }
  await db.run('COMMIT');
}

async function computeCounts() {
  await db.run('BEGIN TRANSACTION');
  await db.run('DROP TABLE team_count');
  await db.run(`CREATE TABLE team_count AS
  select team.id,
  count(1) gamesPlayed,
  sum(case when gt.result = 'W' then 1 else 0 end) gamesWon,
  sum(case when gt.result = 'L' then 1 else 0 end) gamesLost,
  sum(case when gt.result = 'T' then 1 else 0 end) gamesTied
  from team
  join gameteam gt on team.id = gt.teamid 
  group by team.id`);
  await db.run('COMMIT');
}

async function computeStreaks() {
  const data = await db.all(`SELECT date, result, teamid from gameteam
  join game on game.id = gameteam.gameid
  order by date desc`);
  let runningMap: NumberDict = {};
  let currentStreakMap: NumberDict = {};
  let allTimeStreakMap: NumberDict = {};
  data.forEach((row: any) => {
    if (!runningMap[row.teamid]) {
      runningMap[row.teamid] = 0;
    }
    if (row.result === 'W') {
      runningMap[row.teamid] += 1;
    } else {
      // Copy the data to current streak if we haven't done it already
      if (!(row.teamid in currentStreakMap)) {
        currentStreakMap[row.teamid] = runningMap[row.teamid];
      }
      // Copy the data to all time streak if it's better
      if ((allTimeStreakMap[row.teamid] || 0) <= runningMap[row.teamid]) {
        allTimeStreakMap[row.teamid] = runningMap[row.teamid];
      }
      runningMap[row.teamid] = 0;
    }
  });
  // console.log(currentStreakMap, allTimeStreakMap);
  // Write data to SQL
  await db.run('BEGIN TRANSACTION');
  await db.run('DELETE FROM team_streak');
  const keys = Object.keys(currentStreakMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    await db.run(
      'INSERT INTO team_streak (id, current, allTime) VALUES (?, ?, ?)',
      [key, currentStreakMap[key], allTimeStreakMap[key]]
    );
  }
  await db.run('COMMIT');
}

/*
function getMarginsOfVictory() {

}

function getCirclesOfParity() {

}
*/
