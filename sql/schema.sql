CREATE TABLE IF NOT EXISTS game (
  id bigint PRIMARY KEY, 
  attendance bigint, 
  date timestamp with time zone,
  source text
);

CREATE TABLE IF NOT EXISTS gameteam(
  gameid bigint REFERENCES game(id), 
  teamid bigint, 
  score bigint, 
  field text, 
  result text, 
  rating real,
  PRIMARY KEY(gameid, teamid)
);

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
  displayname text
);

CREATE TABLE IF NOT EXISTS team_ranking (
  id bigint REFERENCES team(id) PRIMARY KEY,
  rating real
);

CREATE TABLE IF NOT EXISTS team_count (
  id bigint REFERENCES team(id) PRIMARY KEY,
  gamesPlayed int,
  gamesWon int,
  gamesLost int,
  gamesTied int
);

CREATE TABLE IF NOT EXISTS team_streak (
  id bigint REFERENCES team(id) PRIMARY KEY,
  current int,
  allTime int
);

CREATE TABLE IF NOT EXISTS game_elo_delta (
  id bigint REFERENCES game(id) PRIMARY KEY,
  delta real
);
