import type { DatabaseSync } from 'node:sqlite';
import { InitDatabase, InsertConference, Schema } from './database.ts';
import { Espn } from './espn.ts';
import { JHowell } from './jhowell.ts';
import type { Conferences, EligibleTeam, RankedTeam, RatingGame, StreakGame } from './model.ts';

export function ReplaceHttp(db: DatabaseSync): void {
  db.exec("UPDATE team SET logo = replace(logo, 'http://', 'https://')");
}

export function ComputeStreaks(db: DatabaseSync): void {
  const data = db.prepare(`
    SELECT date, result, teamid from gameteam
    join game on game.id = gameteam.gameid
    order by date desc
  `).all() as unknown as StreakGame[];

  const runningMap = new Map<number, number>();
  const currentStreakMap = new Map<number, number>();
  const allTimeStreakMap = new Map<number, number>();

  for (const row of data) {
    if (!runningMap.has(row.teamid)) {
      runningMap.set(row.teamid, 0);
    }
    if (row.result === 'W') {
      runningMap.set(row.teamid, (runningMap.get(row.teamid) || 0) + 1);
    } else {
      const currentRunning = runningMap.get(row.teamid) || 0;
      const dateYear = parseInt(row.date.slice(0, 4), 10);
      if (!currentStreakMap.has(row.teamid) && dateYear >= 2000) {
        currentStreakMap.set(row.teamid, currentRunning);
      }
      if ((allTimeStreakMap.get(row.teamid) || 0) <= currentRunning) {
        allTimeStreakMap.set(row.teamid, currentRunning);
      }
      runningMap.set(row.teamid, 0);
    }
  }

  db.exec('BEGIN TRANSACTION');
  db.exec('DELETE FROM team_streak');
  const insertStreak = db.prepare('INSERT INTO team_streak (id, current, allTime) VALUES (?, ?, ?)');
  for (const [key, currentVal] of currentStreakMap.entries()) {
    insertStreak.run(key, currentVal, allTimeStreakMap.get(key) || 0);
  }
  db.exec('COMMIT');
}

export function ComputeCounts(db: DatabaseSync): void {
  db.exec('BEGIN TRANSACTION');
  db.exec('DROP TABLE IF EXISTS team_count');
  db.exec(`
    CREATE TABLE team_count AS
    select team.id,
    count(1) gamesPlayed,
    sum(case when gt.result = 'W' then 1 else 0 end) gamesWon,
    sum(case when gt.result = 'L' then 1 else 0 end) gamesLost,
    sum(case when gt.result = 'T' then 1 else 0 end) gamesTied
    from team
    join gameteam gt on team.id = gt.teamid 
    group by team.id
  `);
  db.exec('COMMIT');
}

export function ComputeRankings(db: DatabaseSync): void {
  const ratingMap = new Map<number, number>();
  let lastWeekRating: Map<number, number> | null = null;
  const initial = 1000.0;
  const kFactor = 32.0;
  let gamesRated = 0;

  const data = db.prepare(`
    SELECT game.id, game.date, gt.teamid as team1, gt2.teamid as team2, gt.result as team1result
    FROM game
    join gameteam gt on game.id = gt.gameid
    join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid
    join team t1 on gt.teamid = t1.id
    join team t2 on gt2.teamid = t2.id
    where gt.teamid < gt2.teamid
    order by game.date asc
  `).all() as unknown as RatingGame[];

  const eligibleTeams = db.prepare(`
    SELECT team.id from team
    JOIN conference ON team.conferenceid = conference.id
    where conference.division = 'fbs'
  `).all() as unknown as EligibleTeam[];

  const teamSet = new Set<number>();
  for (const el of eligibleTeams) {
    teamSet.add(el.id);
  }

  if (data.length === 0) {
    return;
  }

  const lastDate = new Date(data[data.length - 1].date.replace(' ', 'T')).getTime() / 1000;
  let currYear = 0;

  db.exec('BEGIN TRANSACTION');
  db.exec('DELETE FROM team_ranking_history');

  const updateGameTeamRating = db.prepare('UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?');
  const insertGameEloDelta = db.prepare('INSERT OR REPLACE INTO game_elo_delta (id, delta) VALUES (?, ?)');
  const insertRankHistory = db.prepare('INSERT INTO team_ranking_history (id, year, rank, rating) VALUES (?, ?, ?, ?)');

  for (let i = 0; i < data.length; i++) {
    const game = data[i];
    const team1 = game.team1;
    const team2 = game.team2;

    updateGameTeamRating.run(ratingMap.get(team1) ?? 0, game.id, team1);
    updateGameTeamRating.run(ratingMap.get(team2) ?? 0, game.id, team2);

    let delta = 0.0;
    if (teamSet.has(team1) && teamSet.has(team2)) {
      gamesRated += 1;
      const team1Result = game.team1result;
      if (!ratingMap.has(team1)) {
        ratingMap.set(team1, initial);
      }
      if (!ratingMap.has(team2)) {
        ratingMap.set(team2, initial);
      }
      const currRating1 = ratingMap.get(team1)!;
      const currRating2 = ratingMap.get(team2)!;
      const r1 = Math.pow(10, currRating1 / 400);
      const r2 = Math.pow(10, currRating2 / 400);
      const e1 = r1 / (r1 + r2);
      const e2 = r2 / (r1 + r2);
      let diff1 = 0.0;
      let diff2 = 0.0;
      if (team1Result === 'W') {
        diff1 = kFactor * (1 - e1);
        diff2 = kFactor * (0 - e2);
      } else if (team1Result === 'L') {
        diff1 = kFactor * (0 - e1);
        diff2 = kFactor * (1 - e2);
      }
      delta = Math.abs(diff1);
      ratingMap.set(team1, currRating1 + diff1);
      ratingMap.set(team2, currRating2 + diff2);
    }

    insertGameEloDelta.run(game.id, delta);

    let nextYear = 0;
    let nextMonth = 0;
    const last = i + 1 === data.length;
    if (!last) {
      const next = data[i + 1];
      const nextDate = new Date(next.date.replace(' ', 'T'));
      nextYear = nextDate.getUTCFullYear();
      nextMonth = nextDate.getUTCMonth() + 1; // 1-indexed: 1 = Jan, 2 = Feb
      const nextDateSeconds = nextDate.getTime() / 1000;
      if (lastWeekRating === null && nextDateSeconds > 0 && lastDate - nextDateSeconds < 6 * 24 * 60 * 60) {
        lastWeekRating = new Map(ratingMap);
      }
    }

    if (last || (nextYear > currYear && nextMonth >= 2)) {
      const snapshot: RankedTeam[] = [];
      for (const [k, v] of ratingMap.entries()) {
        snapshot.push({
          teamId: k,
          rating: v,
          year: currYear,
          rank: 0,
        });
      }
      snapshot.sort((a, b) => b.rating - a.rating);
      for (let j = 0; j < snapshot.length; j++) {
        snapshot[j].rank = j + 1;
        insertRankHistory.run(snapshot[j].teamId, snapshot[j].year, snapshot[j].rank, snapshot[j].rating);
      }
      currYear = nextYear;
    }
  }

  db.exec('DELETE FROM team_ranking');
  const insertTeamRanking = db.prepare('INSERT INTO team_ranking(id, rating, prevRating) VALUES (?, ?, ?)');
  for (const [k, v] of ratingMap.entries()) {
    insertTeamRanking.run(k, v, lastWeekRating ? (lastWeekRating.get(k) ?? null) : null);
  }

  db.exec('COMMIT');
  console.log(`${gamesRated} games rated`);
}

export async function GetConferences(): Promise<void> {
  const db = InitDatabase();
  const urlFbs =
    'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=80&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc';
  const resFbs = await fetch(urlFbs);
  if (!resFbs.ok) {
    throw new Error(`Failed to fetch FBS standings: ${resFbs.statusText}`);
  }
  const confFbs = (await resFbs.json()) as Conferences;
  for (const conf of confFbs.children || []) {
    conf.division = 'fbs';
    InsertConference(db, conf);
  }

  const urlFcs =
    'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=81&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc';
  const resFcs = await fetch(urlFcs);
  if (!resFcs.ok) {
    throw new Error(`Failed to fetch FCS standings: ${resFcs.statusText}`);
  }
  const confFcs = (await resFcs.json()) as Conferences;
  for (const conf of confFcs.children || []) {
    conf.division = 'fcs';
    InsertConference(db, conf);
  }

  // Add conference catch-alls for FBS/IA teams without espn records
  db.exec(
    "INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483647, 'Unknown (probably former FBS but not eligible)', 'fcs')"
  );
  db.exec("INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483646, 'Unknown (FCS)', 'fcs')");
}

export function Compute(): void {
  const db = InitDatabase();
  ReplaceHttp(db);
  ComputeStreaks(db);
  ComputeCounts(db);
  ComputeRankings(db);
  db.exec('VACUUM');
}

export async function main(): Promise<void> {
  const svc = process.env.SVC;
  switch (svc) {
    case 'espn':
      await Espn();
      break;
    case 'jhowell':
      await JHowell();
      break;
    case 'compute':
      Compute();
      break;
    default:
      Schema();
      await JHowell();
      await Espn();
      await GetConferences();
      Compute();
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
