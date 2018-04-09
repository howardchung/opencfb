CREATE TABLE IF NOT EXISTS game (
id bigint PRIMARY KEY, 
attendance bigint, 
state text, 
date timestamp with time zone);

CREATE TABLE IF NOT EXISTS gameteam(
gameid bigint REFERENCES game(id), 
teamid bigint, 
score bigint, 
field text, 
result text, 
PRIMARY KEY(gameid, teamid));

CREATE TABLE IF NOT EXISTS team (
id bigint PRIMARY KEY, 
displayname text, 
abbreviation text, 
color text, 
alternatecolor text, 
logo text, 
conferenceid bigint);

CREATE TABLE IF NOT EXISTS conference(
id bigint PRIMARY KEY, 
displayname text);
