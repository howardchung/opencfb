import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import { ApolloProvider } from 'react-apollo';
import ApolloClient from 'apollo-boost';

const client = new ApolloClient({
  uri: process.env.NODE_ENV === 'development' ? 'http://13.66.162.252:5000/graphql' : 'https://api.opencfb.com/graphql',
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
    {({ loading, error, data }) => {
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
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">OpenCFB</h1>
          </header>
          <Games />
        </div>
      </ApolloProvider>
    );
  }
}

export default App;
