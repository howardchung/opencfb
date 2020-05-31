import React, { Component } from 'react';
import './App.css';
import { Query, QueryResult } from 'react-apollo';
import gql from 'graphql-tag';
import { ApolloProvider } from 'react-apollo';
import ApolloClient from 'apollo-boost';

const client = new ApolloClient({
  uri:
    process.env.NODE_ENV === 'development'
      ? 'http://azure.howardchung.net:8082/graphql'
      : `${window.location.protocol}//${window.location.host}/graphql`,
});

const Games = () => (
  <Query
    query={gql`
      {
        getGame(teamId: "333") {
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

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <div className="App">
          <header className="App-header">
            <h1 className="App-title">OpenCFB</h1>
          </header>
          <Games />
        </div>
      </ApolloProvider>
    );
  }
}

export default App;
