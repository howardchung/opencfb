require('dotenv').config();
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import axios from 'axios';

type NumberDict = { [key: string]: number };

let db: Database = null as unknown as Database;
async function init() {
  db = await createDBConnection();
  const schema = fs.readFileSync('./sql/schema.sql', 'utf8');
  await db.exec(schema);
  await updateDB();
  await replaceHttp();
  await computeStreaks();
  await computeCounts();
  await computeRankings();
  await db.exec('VACUUM');
  await db.close();
  process.exit(0);
}
init();

async function createDBConnection() {
  return await open({
    filename: './public/opencfb.sqlite',
    driver: sqlite3.Database,
  });
}

async function updateDB() {
  // List of teams
  // Treat these as updates only, as we insert teams when we fetch game data
  // Coverage for FBS teams is pretty good already, so skip it
  // const response = await axios.get('http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?groups=80&lang=en&region=us&contentorigin=espn&tz=America%2FNew_York&limit=200');
  // const fbsTeams = response.data;
  // const response2 = await axios.get('http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?groups=81&lang=en&region=us&contentorigin=espn&tz=America%2FNew_York&limit=200');
  // const fcsTeams = response2.data?.sports?.[0]?.leagues?.[0]?.teams;
  // for (let i = 0; i < fcsTeams.length; i++) {
  //   const team = fcsTeams[i].team;
  //   await db.run('UPDATE team SET displayname = ?, abbreviation = ?, color = ?, alternatecolor = ?, logo = ? WHERE id = ?',
  //   [team.displayName, team.abbreviation, team.color, team.alternateColor, team.logos?.[0]?.href, team.id]);
  // }

  // List of conferences
  const response3 = await axios.get(
    'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=80&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc'
  );
  const fbsConferences = response3.data?.children;
  for (let i = 0; i < fbsConferences.length; i++) {
    const conf = fbsConferences[i];
    // console.log(conf);
    await db.run(
      `INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (?, ?, ?)`,
      [conf.id, conf.name, 'fbs']
    );
  }
  const response4 = await axios.get(
    'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=81&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc'
  );
  const fcsConferences = response4.data?.children;
  for (let i = 0; i < fcsConferences.length; i++) {
    const conf = fcsConferences[i];
    // console.log(conf);
    const division = 'fcs';
    await db.run(
      `INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (?, ?, ?)`,
      [conf.id, conf.name, division]
    );
  }
  // Add conferenceid 0, a catch-all for old FBS/IA teams without espn records
  await db.run(
    `INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483647, 'Unknown (FBS)', 'fbs')`
  );
  await db.run(
    `INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483646, 'Unknown (FCS)', 'fcs')`
  );

  // Team details
  // http://cdn.espn.com/core/college-football/team/_/id/2116/ucf-knights?xhr=1&render=true&device=desktop&country=us&lang=en&region=us&site=espn&edition-host=espn.com&one-site=true&site-type=full
  // List of conferences (FBS only)
  // http://cdn.espn.com/core/college-football/standings?xhr=1&render=true&device=desktop&country=us&lang=en&region=us&site=espn&edition-host=espn.com&one-site=true&site-type=full
}

async function replaceHttp() {
  await db.exec(`UPDATE team SET logo = replace(logo, 'http://', 'https://')`);
}

async function computeRankings() {
  const db = await createDBConnection();
  // Elo rank teams
  // Start all teams at 1000
  let ratingMap: NumberDict = {};
  let lastWeekRating: NumberDict | null = null;
  let initial = 1000;
  let kFactor = 32;

  // Get an array of all games
  const data = await db.all(
    `SELECT game.id, game.date, gt.teamid as team1, gt2.teamid as team2, gt.result as team1result
    FROM game
    join gameteam gt on game.id = gt.gameid
    join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid
    join team t1 on gt.teamid = t1.id
    join team t2 on gt2.teamid = t2.id
    where gt.teamid < gt2.teamid
    order by game.date asc`
  );

  const eligibleTeams = await db.all(`
  SELECT team.id from team
  JOIN conference ON team.conferenceid = conference.id
  where conference.division = 'fbs'
  `);
  const teamSet = new Set([...eligibleTeams.map((row) => row.id)]);
  //console.log(teamSet);

  let currYear = 0;
  await db.run('BEGIN TRANSACTION');
  await db.run('DELETE FROM team_ranking_history');
  for (let i = 0; i < data.length; i++) {
    const game = data[i];
    let team1 = game.team1;
    let team2 = game.team2;

    // Write the current team ratings into the gameteam table (pre-game rating)
    await db.run(
      `UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?`,
      [ratingMap[team1], game.id, team1]
    );
    await db.run(
      `UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?`,
      [ratingMap[team2], game.id, team2]
    );

    let delta = 0;
    if (teamSet.has(team1) && teamSet.has(team2)) {
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
      delta = Math.abs(diff1);
      ratingMap[team1] += diff1;
      ratingMap[team2] += diff2;
    }
    // Don't do anything for ties currently
    // console.log(i, diff1, ratingMap[team1], ratingMap[team2]);
    // Record the delta
    await db.run(
      'INSERT OR REPLACE INTO game_elo_delta (id, delta) VALUES (?, ?)',
      [game.id, delta]
    );

    // If we encounter a new year after february
    // Snapshot the current team relative ranks
    const next = data[i + 1];
    const nextDate = new Date(next?.date);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth();
    // 0 is january
    if (!next || (nextYear > currYear && nextMonth >= 2)) {
      console.log(currYear);
      let snapshot = Object.keys(ratingMap).map((teamId) => {
        return {
          teamId,
          rating: ratingMap[teamId],
          year: currYear,
          rank: 0,
        };
      });
      snapshot.sort((a, b) => b.rating - a.rating);
      // Add ranks
      snapshot = snapshot.map((row, i) => ({ ...row, rank: i + 1 }));
      // Write to DB
      for (let i = 0; i < snapshot.length; i++) {
        const row = snapshot[i];
        // console.log(row);
        await db.run(
          `INSERT INTO team_ranking_history (id, year, rank, rating) VALUES (?, ?, ?, ?)`,
          [row.teamId, row.year, row.rank, row.rating]
        );
      }
      currYear = nextYear;
    }
    const lastDate = Number(new Date(data[data.length - 1]?.date));
    if (lastWeekRating == null && lastDate - Number(nextDate) < 7 * 24 * 60 * 60 * 1000) {
      lastWeekRating = JSON.parse(JSON.stringify(ratingMap));
    }
  }

  await db.run('DELETE FROM team_ranking');
  let keys = Object.keys(ratingMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    await db.run('INSERT INTO team_ranking(id, rating, prevRating) VALUES (?, ?, ?)', [
      key,
      ratingMap[key],
      lastWeekRating?.[key],
    ]);
  }
  await db.run('COMMIT');
}

async function computeCounts() {
  const db = await createDBConnection();
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
  const db = await createDBConnection();
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
      // Limit to streaks starting in 2000 to remove some old invalid teams
      if (
        !(row.teamid in currentStreakMap) &&
        new Date(row.date).getFullYear() >= 2000
      ) {
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

// TODO more features
// - circles of parity (longest cycle in directed graph problem)
// - margins of victory
// - dedicated rivalry pages
/*
function getMarginsOfVictory() {

}

function getCirclesOfParity() {

}
*/
