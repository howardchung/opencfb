import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Conference, Game, GameTeam, Team } from './model.ts';

export function formatDate(d: Date | string): string {
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00:00$/.test(d)) {
      return d;
    }
    const parsed = new Date(d);
    return parsed.toISOString().slice(0, 19).replace('T', ' ') + '+00:00';
  }
  return d.toISOString().slice(0, 19).replace('T', ' ') + '+00:00';
}

export function InitDatabase(customPath?: string): DatabaseSync {
  const dbPath = customPath || path.resolve(import.meta.dirname, '../public/opencfb.sqlite.mp4');
  return new DatabaseSync(dbPath);
}

export function Schema(db?: DatabaseSync, customSchemaPath?: string): void {
  const schemaPath = customSchemaPath || path.resolve(import.meta.dirname, '../sql/schema.sql');
  const content = fs.readFileSync(schemaPath, 'utf8');
  const database = db || InitDatabase();
  database.exec(content);
}

export function DeleteJHowell(db: DatabaseSync): void {
  db.exec("DELETE FROM game where source = 'jh'; DELETE FROM gameteam where gameid not IN (SELECT id from game);");
}

const statementCache = new WeakMap<DatabaseSync, Map<string, any>>();

function getStatement(db: DatabaseSync, sql: string) {
  let cache = statementCache.get(db);
  if (!cache) {
    cache = new Map();
    statementCache.set(db, cache);
  }
  let stmt = cache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

export function InsertGame(db: DatabaseSync, game: Game, replace: boolean): void {
  const query = replace
    ? 'INSERT OR REPLACE INTO game VALUES (?, ?, ?, ?)'
    : 'INSERT OR IGNORE INTO game VALUES (?, ?, ?, ?)';
  const formattedDate = formatDate(game.date);
  getStatement(db, query).run(game.id, game.attendance ?? 0, formattedDate, game.source ?? '');
}

export function InsertGameTeam(db: DatabaseSync, gameTeam: GameTeam, replace: boolean): void {
  const query = replace
    ? 'INSERT OR REPLACE INTO gameteam VALUES (?, ?, ?, ?, ?, ?)'
    : 'INSERT OR IGNORE INTO gameteam VALUES (?, ?, ?, ?, ?, ?)';
  getStatement(db, query).run(gameTeam.gameId, gameTeam.teamId, gameTeam.score, gameTeam.field, gameTeam.result, null);
}

export function InsertTeam(db: DatabaseSync, team: Team, replace: boolean): void {
  const query = replace
    ? 'INSERT OR REPLACE INTO team VALUES (?, ?, ?, ?, ?, ?, ?)'
    : 'INSERT OR IGNORE INTO team VALUES (?, ?, ?, ?, ?, ?, ?)';
  getStatement(db, query).run(
    team.id,
    team.displayName,
    team.abbreviation ?? '',
    team.color ?? '',
    team.alternateColor ?? '',
    team.logo ?? '',
    team.conferenceId ?? 0
  );
}

export function InsertConference(db: DatabaseSync, conference: Conference): void {
  getStatement(db, 'INSERT OR REPLACE INTO conference VALUES (?, ?, ?)').run(
    conference.id,
    conference.displayName ?? conference.name ?? '',
    conference.division ?? ''
  );
}

export function GetTeams(db: DatabaseSync, id: number): Team[] {
  const rows = db.prepare('SELECT * FROM team WHERE (? = 0 OR id = ?) ORDER BY id desc').all(id, id) as any[];
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayname,
    abbreviation: r.abbreviation,
    color: r.color,
    alternateColor: r.alternatecolor,
    logo: r.logo,
    conferenceId: r.conferenceid,
  }));
}

export function GetGames(db: DatabaseSync, teamId: number, _season?: number): Game[] {
  const rows = db.prepare(
    'SELECT DISTINCT game.id, game.state, game.date FROM game JOIN gameteam ON gameteam.gameid = game.id WHERE (? = 0 OR teamid = ?) ORDER BY date desc LIMIT 100'
  ).all(teamId, teamId) as any[];

  const gameTeamsRows = db.prepare('SELECT * from gameteam ORDER BY gameid').all() as any[];

  const gameTeamObjs: GameTeam[] = gameTeamsRows.map((gt) => ({
    gameId: gt.gameid,
    teamId: gt.teamid,
    score: gt.score,
    field: gt.field,
    result: gt.result,
  }));

  return rows.map((row) => {
    const singleGameTeams: Team[] = gameTeamObjs
      .filter((gt) => gt.gameId === row.id)
      .map((gt) => ({
        id: gt.teamId,
        displayName: '',
        field: gt.field,
        score: gt.score,
        result: gt.result,
      }));

    return {
      id: row.id,
      state: row.state,
      date: new Date(row.date.replace(' ', 'T')),
      teams: singleGameTeams,
    };
  });
}
