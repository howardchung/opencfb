PRAGMA journal_mode=DELETE;

CREATE TABLE IF NOT EXISTS game (
  id bigint PRIMARY KEY, 
  attendance bigint, 
  date timestamp with time zone,
  source text
);
DROP INDEX IF EXISTS game_date_idx;
CREATE INDEX IF NOT EXISTS game_date_id_idx ON game(date, id);
CREATE INDEX IF NOT EXISTS game_id_date_idx ON game(id, date);

CREATE TABLE IF NOT EXISTS gameteam(
  gameid bigint REFERENCES game(id) ON DELETE CASCADE, 
  teamid bigint, 
  score bigint, 
  field text, 
  result text, 
  rating real,
  PRIMARY KEY(gameid, teamid)
);
DROP INDEX IF EXISTS gameteam_teamid_idx;
DROP INDEX IF EXISTS gameteam_gameid_idx;
CREATE INDEX IF NOT EXISTS gameteam_teamid_gameid_idx ON gameteam(teamid, gameid);

CREATE TABLE IF NOT EXISTS team (
  id bigint PRIMARY KEY, 
  displayname text, 
  abbreviation text, 
  color text, 
  alternatecolor text, 
  logo text, 
  conferenceid bigint
);

CREATE TABLE IF NOT EXISTS conference(
  id bigint PRIMARY KEY, 
  displayname text,
  division text
);

CREATE TABLE IF NOT EXISTS team_ranking (
  id bigint REFERENCES team(id) ON DELETE CASCADE PRIMARY KEY,
  rating real,
  prevRating real
);

CREATE TABLE IF NOT EXISTS team_count (
  id bigint REFERENCES team(id) ON DELETE CASCADE PRIMARY KEY,
  gamesPlayed int,
  gamesWon int,
  gamesLost int,
  gamesTied int
);

CREATE TABLE IF NOT EXISTS team_streak (
  id bigint REFERENCES team(id) ON DELETE CASCADE PRIMARY KEY,
  current int,
  allTime int
);

CREATE TABLE IF NOT EXISTS team_ranking_history (
  id bigint REFERENCES team(id) ON DELETE CASCADE,
  year int,
  rank int,
  rating real,
  PRIMARY KEY (id, year)
);

CREATE TABLE IF NOT EXISTS game_elo_delta (
  id bigint REFERENCES game(id) ON DELETE CASCADE PRIMARY KEY,
  delta real
);
