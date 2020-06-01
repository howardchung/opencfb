import express from 'express';
import graphqlHTTP from 'express-graphql';
import { buildSchema } from 'graphql';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';

let db: Database = (null as unknown) as Database;
async function init() {
  db = await open({ filename: './opencfb-data/opencfb.sqlite', driver: sqlite3.Database });
  const schema = fs.readFileSync('./sql/schema.sql', 'utf8');
  const lines = schema.split('\n\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    await db.run(line);
  }
  app.listen(process.env.PORT || 5000);
}
init();

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
    getGame(teamId: String, gameId: String): [Game]
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  getTeam: async ({ id }: { id: string }) => {
    const data = await db.all('SELECT id, displayName FROM team where id = ?', [
      id,
    ]);
    return data[0];
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
// TODO run update worker
// TODO more features
// - circles of parity
// - all time rankings
// - team pages
// - all time win streaks
// - active win streaks
// - margins of victory
// - rivalry games