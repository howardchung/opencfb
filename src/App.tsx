import React, { Component } from 'react';
import './App.css';
import { Query, QueryResult } from 'react-apollo';
import gql from 'graphql-tag';
import { ApolloProvider } from 'react-apollo';
import ApolloClient from 'apollo-boost';
import { Switch, Route, BrowserRouter } from 'react-router-dom';

const client = new ApolloClient({
  uri:
    process.env.NODE_ENV === 'development'
      ? 'http://azure.howardchung.net:8082/graphql'
      : `${window.location.protocol}//${window.location.host}/graphql`,
});

const Game = ({ gameId }: { gameId: string }) => (
  <Query
    query={gql`
      {
        getGame(gameId: ${gameId}) {
          id
          state
          date
          teams {
            id
            score
            field
            result
          }
        }
      }
    `}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }}
  </Query>
);

const Team = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      {
        getTeam(teamId: ${teamId}) {
          id
          displayName
        }
      }
    `}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }}
  </Query>
);

const TeamGames = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      {
        getGame(teamId: ${teamId}) {
          id
          state
          date
          teams {
            id
            score
            field
            result
          }
        }
      }
    `}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }}
  </Query>
);

const Games = () => (
  <Query
    query={gql`
      {
        listGame(limit: 10) {
          id
          state
          date
        }
      }
    `}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }}
  </Query>
);

const Teams = () => (
  <Query
    query={gql`
      {
        listTeam(limit: 10) {
          id
          displayName
        }
      }
    `}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      return <pre>{JSON.stringify(data, null, 2)}</pre>;
    }}
  </Query>
);

const Home = () => (
  <div>
    <Teams />
    <Games />
  </div>
);

const TeamPage = ({ teamId }: { teamId: string }) => (
  <div>
    <Team teamId={teamId} />
    <TeamGames teamId={teamId} />
  </div>
);

const GamePage = ({ gameId }: { gameId: string }) => (
  <div>
    <Game gameId={gameId} />
  </div>
);

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <div className="App">
          <header className="App-header">
            <h1 className="App-title">OpenCFB</h1>
          </header>
          <BrowserRouter>
            <Switch>
              <Route path="/" render={() => <Home />} />
              <Route
                path="/teams/:teamId?"
                render={({ match }) => (
                  <TeamPage teamId={match.params.teamId} />
                )}
              />
              <Route
                path="/games/:gameId?"
                render={({ match }) => (
                  <GamePage gameId={match.params.gameId} />
                )}
              />
            </Switch>
          </BrowserRouter>
        </div>
      </ApolloProvider>
    );
  }
}

export default App;
