import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DeleteJHowell, InitDatabase, InsertGame, InsertGameTeam, InsertTeam } from './database.ts';
import { JHowellFetcher } from './jhowellFetcher.ts';
import type { Game, GameTeam, Team } from './model.ts';

export async function JHowell(): Promise<void> {
  const csvPath = path.resolve(import.meta.dirname, 'jhowell.csv');
  const mappingsPath = path.resolve(import.meta.dirname, 'jhowellMappings.json');

  if (!fs.existsSync(csvPath)) {
    await JHowellFetcher(csvPath);
  }

  const db = InitDatabase();

  let nameMap: Record<string, number> = {};
  if (fs.existsSync(mappingsPath)) {
    const raw = fs.readFileSync(mappingsPath, 'utf8');
    nameMap = JSON.parse(raw);
  }

  const games: Game[] = [];
  const gameTeams: GameTeam[] = [];
  const teams: Team[] = [];
  const gameSet = new Map<number, number>();

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const s = line.split(',');
    if (s.length < 9) {
      continue;
    }
    const monthDay = s[2].split('/');
    if (monthDay.length < 2) {
      continue;
    }
    let year = parseInt(s[1], 10);
    const month = parseInt(monthDay[0], 10);
    const day = parseInt(monthDay[1], 10);
    if (month === 1) {
      // Playoff games occur the next year
      year += 1;
    }

    // Ignore games more recent than this as we switch to ESPN data source
    if (year > 2001 || (year === 2001 && month >= 8)) {
      continue;
    }

    const gameDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // determine if home/away/neutral, s[0] is home if s[3] is not @ and s[8] doesn't start with @ (neutral site)
    const isNeutralSite = s[8].startsWith('@');
    // Scores and result aren't relative to the home team, but to first team in the row
    // If first team isn't home, then we need to flip everything
    let homeString = s[0];
    let awayString = s[4];
    let homeScore = parseInt(s[6], 10) || 0;
    let awayScore = parseInt(s[7], 10) || 0;
    let homeResult = s[5];
    let awayResult = 'T';
    if (homeResult === 'W') {
      awayResult = 'L';
    }
    if (homeResult === 'L') {
      awayResult = 'W';
    }

    let homeField = 'neutral';
    let awayField = 'neutral';
    if (!isNeutralSite) {
      homeField = 'home';
      awayField = 'away';
    }

    let homeConferenceId = 2147483647;
    if (homeString.endsWith('(non-IA)')) {
      homeConferenceId = 2147483646;
    }
    let awayConferenceId = 2147483647;
    if (awayString.endsWith('(non-IA)')) {
      awayConferenceId = 2147483646;
    }

    if (s[3].startsWith('@')) {
      // swap everything since first team is away
      [homeString, awayString] = [awayString, homeString];
      [homeScore, awayScore] = [awayScore, homeScore];
      [homeResult, awayResult] = [awayResult, homeResult];
      [homeField, awayField] = [awayField, homeField];
      [homeConferenceId, awayConferenceId] = [awayConferenceId, homeConferenceId];
    }

    const homeTeamId = matchTeamStringToId(homeString, nameMap);
    const awayTeamId = matchTeamStringToId(awayString, nameMap);

    // Create a game ID
    // For these purposes, consider home team to be the smaller value so we don't duplicate
    let smallerId = homeTeamId;
    let largerId = awayTeamId;
    if (smallerId > largerId) {
      [smallerId, largerId] = [largerId, smallerId];
    }
    const generatedId = generateGameId(smallerId, largerId, gameDate);

    // Check if we already added this game (jhowell data lists every game twice since it's under both schools)
    const exists = gameSet.get(generatedId) || 0;
    if (exists >= 2) {
      throw new Error('duplicate game id');
    }
    if (exists === 1) {
      continue;
    }
    gameSet.set(generatedId, exists + 1);

    games.push({
      id: generatedId,
      date: gameDate,
      source: 'jh',
    });
    gameTeams.push({
      gameId: generatedId,
      teamId: homeTeamId,
      score: homeScore,
      field: homeField,
      result: homeResult,
    });
    gameTeams.push({
      gameId: generatedId,
      teamId: awayTeamId,
      score: awayScore,
      field: awayField,
      result: awayResult,
    });
    teams.push({
      id: homeTeamId,
      displayName: homeString,
      conferenceId: homeConferenceId,
    });
    teams.push({
      id: awayTeamId,
      displayName: awayString,
      conferenceId: awayConferenceId,
    });
  }

  DeleteJHowell(db);
  db.exec('BEGIN TRANSACTION');
  let gameCount = 0;
  for (const team of teams) {
    // False here as we don't want to overwrite logo data from ESPN
    InsertTeam(db, team, false);
  }
  for (const game of games) {
    InsertGame(db, game, true);
    gameCount += 1;
  }
  for (const gameTeam of gameTeams) {
    InsertGameTeam(db, gameTeam, true);
  }
  db.exec('COMMIT');
  console.log(`jhowell: ${gameCount} games`);
}

// espn team ids range from 2 to 3200
// jhowell teams, hash the unique key (name), take the result % (2^32) and add (2^32)
// This places the jhowell data in a separate ID space starting at 2 billion
export function generateTeamId(name: string): number {
  const sum = crypto.createHash('sha256').update(name).digest();
  const generatedId = sum.readUInt32BE(0) + 2147483648;
  return generatedId;
}

// espn game ids range from 212350097 to 400986609
// jhowell games, hash the unique key (date, name, opp) sorted, take the result % 200000000
export function generateGameId(homeTeam: number, awayTeam: number, gameDate: Date): number {
  const homeIntString = homeTeam.toString();
  const awayIntString = awayTeam.toString();
  const dateStr = gameDate.toISOString().replace('.000Z', 'Z');
  const keyArr = [dateStr, homeIntString, awayIntString];
  keyArr.sort();
  const key = keyArr.join(':');
  const sum = crypto.createHash('sha256').update(key).digest();
  const uint32 = sum.readUInt32BE(0);
  const mod = uint32 % 100000;
  const generatedString = `${gameDate.getUTCFullYear()}${mod}`;
  return parseInt(generatedString, 10);
}

export function matchTeamStringToId(input: string, nameMap: Record<string, number>): number {
  if (input in nameMap) {
    const val = nameMap[input];
    if (val === 0) {
      return generateTeamId(input);
    }
    if (val > 0) {
      return val;
    }
  }
  if (input.includes('(non-IA)')) {
    return generateTeamId(input);
  }
  return generateTeamId(input);
}
