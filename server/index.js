var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
const sqlite = require('sqlite');
const cors = require('cors');

let db = null;
async function initDb() {
  db = await sqlite.open('./data/opencfb.sqlite');
}
initDb();


// db.serialize(function() {
//     db.run("CREATE TABLE IF NOT EXISTS message (id TEXT, depth INT, data TEXT, pubkey TEXT, sig TEXT)");
//     db.run("CREATE INDEX IF NOT EXISTS message_id_idx ON message(id)");
// });

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
  getTeam: async ({id}) => {
    const data = await db.all("SELECT id, displayName FROM team where id = ?", [id]);
    return data.rows[0];
  },
  getGame: async ({ teamId, gameId }) => {
    const data = await db.all("SELECT game.id, game.state, game.date FROM game join gameteam on game.id = gameteam.gameid where gameteam.teamid = ?", [teamId]);
    // TODO fetch the teams that played
    console.log(teamId, data);
    return data;
  },
};

var app = express();
app.use(cors());
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(5000);
