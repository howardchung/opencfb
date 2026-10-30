import fs from 'node:fs';
import path from 'node:path';
import { InitDatabase, InsertGame, InsertGameTeam, InsertTeam } from './database.ts';
import type { Game, GameTeam, Scoreboard, Team } from './model.ts';

export function generateApiUrl(year: string, seasonType: string, week: string): string {
  // FBS, group 80
  // FCS, group 81
  return `http://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${year}&seasontype=${seasonType}&week=${week}&limit=100&groups=80`;
}

export async function getScoreboard(url: string, currYear: number): Promise<Scoreboard> {
  console.log(url);
  const spl = url.split('?');
  const espnDir = path.resolve(import.meta.dirname, 'espn');
  if (!fs.existsSync(espnDir)) {
    fs.mkdirSync(espnDir, { recursive: true });
  }
  const filePath = path.resolve(espnDir, spl[1]);

  let data: string;
  if (fs.existsSync(filePath)) {
    data = fs.readFileSync(filePath, 'utf8');
  } else {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }
    data = await res.text();
    // Don't cache data from current season since we may have incomplete responses
    if (!url.includes(`dates=${currYear}`)) {
      fs.writeFileSync(filePath, data, 'utf8');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return JSON.parse(data) as Scoreboard;
}

export async function Espn(): Promise<void> {
  const db = InitDatabase();
  db.exec('BEGIN TRANSACTION');

  // Can start at 2001 (ESPN has data this far)
  const now = new Date();
  let year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  if (month === 1) {
    year -= 1;
  }
  const startAt = 2001;
  let gameCount = 0;

  for (let i = startAt; i <= year; i++) {
    const seasonType = 2;
    const week = 1;
    // Do every week in the calendar, ingest games/teams
    const url = generateApiUrl(i.toString(), seasonType.toString(), week.toString());
    const scoreboard = await getScoreboard(url, year);

    // Build queue of API calls
    const queue: string[] = [];
    if (!scoreboard.leagues || scoreboard.leagues.length === 0) {
      console.error('FATAL: no leagues', url);
      process.exit(1);
    }
    const calendar = scoreboard.leagues[0].calendar || [];
    for (const season of calendar) {
      if (season.label !== 'Off Season') {
        for (const w of season.entries) {
          queue.push(generateApiUrl(i.toString(), season.value, w.value));
        }
      }
    }

    // loop over queue and make those API calls
    for (const apiCall of queue) {
      const sb = await getScoreboard(apiCall, year);
      const events = sb.events || [];
      for (const event of events) {
        if (!event.competitions || event.competitions.length === 0) {
          continue;
        }
        const comp = event.competitions[0];
        if (!comp.competitors || comp.competitors.length < 2) {
          continue;
        }

        const id = parseInt(event.id, 10);
        if (Number.isNaN(id)) {
          console.error('Invalid event id', event);
          process.exit(1);
        }

        const homeComp = comp.competitors[0];
        const awayComp = comp.competitors[1];

        const homeTeam = parseInt(homeComp.id, 10);
        const awayTeam = parseInt(awayComp.id, 10);
        const homeScore = parseInt(homeComp.score, 10) || 0;
        const awayScore = parseInt(awayComp.score, 10) || 0;
        const date = new Date(event.date);

        const game: Game = {
          id,
          attendance: comp.attendance || 0,
          state: event.status.type.name,
          date,
        };

        if (game.state === 'STATUS_FINAL') {
          InsertGame(db, game, true);
          gameCount += 1;
          let homeResult = 'T';
          let awayResult = 'T';
          if (homeScore > awayScore) {
            homeResult = 'W';
            awayResult = 'L';
          }
          if (awayScore > homeScore) {
            homeResult = 'L';
            awayResult = 'W';
          }
          const gameTeams: GameTeam[] = [
            {
              gameId: id,
              teamId: homeTeam,
              score: homeScore,
              field: homeComp.homeAway,
              result: homeResult,
            },
            {
              gameId: id,
              teamId: awayTeam,
              score: awayScore,
              field: awayComp.homeAway,
              result: awayResult,
            },
          ];
          for (const gameTeam of gameTeams) {
            // Replace is false since we currently write rating data to this table
            InsertGameTeam(db, gameTeam, false);
          }
        }

        for (const competitor of comp.competitors) {
          const teamId = parseInt(competitor.id, 10);
          if (Number.isNaN(teamId)) {
            console.error('Invalid competitor id', competitor);
            process.exit(1);
          }
          let conferenceId = 0;
          if (competitor.team.conferenceId) {
            const parsedConf = parseInt(competitor.team.conferenceId, 10);
            if (!Number.isNaN(parsedConf)) {
              conferenceId = parsedConf;
            } else {
              console.log('Non-numeric conference ID', competitor.team.displayName, competitor.team.conferenceId);
            }
          }
          const team: Team = {
            id: teamId,
            displayName: competitor.team.displayName,
            abbreviation: competitor.team.abbreviation,
            color: competitor.team.color,
            alternateColor: competitor.team.alternateColor,
            logo: competitor.team.logo,
            conferenceId,
          };
          InsertTeam(db, team, true);
        }
      }
    }
  }

  db.exec('COMMIT');
  console.log(`espn: ${gameCount} games`);
}
