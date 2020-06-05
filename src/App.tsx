import React, { Component } from 'react';
import './App.css';
import { Query, QueryResult } from 'react-apollo';
import gql from 'graphql-tag';
import { ApolloProvider } from 'react-apollo';
import ApolloClient from 'apollo-boost';
import { Switch, Route, BrowserRouter, Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import GitHubIcon from '@material-ui/icons/GitHub';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Container from '@material-ui/core/Container';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ResponsiveContainer,
} from 'recharts';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';

const client = new ApolloClient({
  uri:
    process.env.REACT_APP_SERVER_PATH ||
    `${window.location.protocol}//${window.location.host}/graphql`,
});

const Game = ({ gameId }: { gameId: string }) => (
  <Query
    query={gql`
      {
        getGame(gameId: $gameId) {
          id
          date
          teams
        }
      }
    `}
    variables={{ gameId }}
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
      query Team($teamId: String) {
        getTeam(teamId: $teamId) {
          id
          displayName
          logo
          abbreviation
          rating
          gamesPlayed
          gamesWon
          gamesLost
          gamesTied
          color
          alternateColor
        }
      }
    `}
    variables={{ teamId }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const team = data.getTeam;
      if (!team) {
        return null;
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {team.logo && (
            <img
              src={team.logo}
              style={{ height: '150px' }}
              alt={team.displayName}
            />
          )}
          <div style={{ width: '100%', marginLeft: '20px' }}>
            <Typography variant="h4" style={{ color: '#' + team.color }}>
              {team.displayName}
            </Typography>
            <div
              style={{
                backgroundColor: '#' + team.color,
                color: 'white',
                fontSize: '12px',
                padding: '4px',
                width: 'fit-content',
                height: 'fit-content',
                borderRadius: '4px',
              }}
            >
              {team.abbreviation}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <div style={{ marginRight: '20px' }}>
                <Typography variant="button">Rating</Typography>
                <Typography style={{ fontSize: '24px', color: 'black' }}>
                  {Math.floor(team.rating)}
                </Typography>
              </div>
              <div style={{ marginRight: '20px' }}>
                <Typography variant="button">Wins</Typography>
                <Typography style={{ fontSize: '24px', color: 'green' }}>
                  {team.gamesWon}
                </Typography>
              </div>
              <div style={{ marginRight: '20px' }}>
                <Typography variant="button">Losses</Typography>
                <Typography style={{ fontSize: '24px', color: 'red' }}>
                  {team.gamesLost}
                </Typography>
              </div>
              <div style={{ marginRight: '20px' }}>
                <Typography variant="button">Ties</Typography>
                <Typography style={{ fontSize: '24px', color: 'gray' }}>
                  {team.gamesTied}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      );
    }}
  </Query>
);

const TeamGames = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      query TeamGames($teamId: String) {
        listTeamGame(teamId: $teamId, limit: 250) {
          id
          date
          score
          result
          field
          rating
          delta
          logo
          displayName
          opponent {
            id
            displayName
            logo
            score
            rating
            result
          }
        }
      }
    `}
    variables={{ teamId }}
    // Apollo caching causes opponent object to be reused, showing wrong data?
    fetchPolicy="no-cache"
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const rows = data.listTeamGame;
      return (
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Date</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell align="left">Opponent</TableCell>
                <TableCell align="right">Result</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">Delta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row: any, i: number) => (
                <TableRow key={row.id}>
                  <TableCell align="left">
                    {new Date(row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <img className="teamLogo" src={row.logo} />
                  </TableCell>
                  <TableCell
                    align="left"
                    style={{
                      fontWeight: row.result === 'W' ? 'bold' : undefined,
                    }}
                  >
                    <Link
                      style={{ color: 'black', textDecoration: 'none' }}
                      to={`/teams/${teamId}`}
                    >
                      {row.displayName}
                    </Link>{' '}
                    <Typography variant="caption">
                      ({Math.floor(row.rating) || 'NR'})
                    </Typography>
                  </TableCell>
                  <TableCell>{row.field === 'away' ? '@' : 'vs.'}</TableCell>
                  <TableCell>
                    <img className="teamLogo" src={row.opponent.logo} />
                  </TableCell>
                  <TableCell
                    align="left"
                    style={{
                      fontWeight:
                        row.opponent.result === 'W' ? 'bold' : undefined,
                    }}
                  >
                    <Link
                      style={{ color: 'black', textDecoration: 'none' }}
                      to={`/teams/${row.opponent.id}`}
                    >
                      {row.opponent.displayName}
                    </Link>{' '}
                    <Typography variant="caption">
                      ({Math.floor(row.opponent.rating) || 'NR'})
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    style={{
                      fontWeight: 'bold',
                      color: getColorForResult(row.result),
                    }}
                  >
                    {row.result}
                  </TableCell>
                  <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                    {row.score} - {row.opponent.score}
                  </TableCell>
                  <TableCell align="right">
                    {row.result === 'W' && '+'}
                    {row.result === 'L' && '-'}
                    {Math.floor(row.delta)}{' '}
                    {/* <Typography variant="caption">
                      (
                      {Math.floor(
                        row.rating + row.delta * (row.result === 'L' ? -1 : 1)
                      ) || 'NR'}
                      )
                    </Typography> */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }}
  </Query>
);

const TeamRivalry = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      query TeamRivalry($teamId: String) {
        listTeamRivalry(teamId: $teamId) {
          id
          logo
          displayName
          gamesPlayed
          gamesWon
          gamesLost
          gamesTied
        }
      }
    `}
    variables={{ teamId }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const rows = data.listTeamRivalry;
      return (
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell align="left">Opponent</TableCell>
                <TableCell align="right">Games Played</TableCell>
                <TableCell align="right">WLT</TableCell>
                <TableCell align="right">Win %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row: any, i: number) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <img className="teamLogo" src={row.logo} />
                  </TableCell>
                  <TableCell align="left">
                    <Link
                      style={{ color: 'black', textDecoration: 'none' }}
                      to={`/teams/${row.id}`}
                    >
                      {row.displayName}
                    </Link>
                  </TableCell>
                  <TableCell align="right">{row.gamesPlayed}</TableCell>
                  <TableCell align="right">
                    <span style={{ color: 'green' }}>{row.gamesWon}</span>
                    {' - '}
                    <span style={{ color: 'red' }}>{row.gamesLost}</span>
                    {' - '}
                    <span style={{ color: 'gray' }}>{row.gamesTied}</span>
                  </TableCell>
                  <TableCell align="right">
                    {((row.gamesWon / row.gamesPlayed) * 100).toFixed(2) + '%'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }}
  </Query>
);

const Games = () => (
  <Query
    query={gql`
      {
        listGame(limit: 100) {
          id
          date
          delta
          teams {
            id
            logo
            displayName
            score
            result
            rating
          }
        }
      }
    `}
    fetchPolicy="no-cache"
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const rows = data.listGame;
      return (
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="left">Date</TableCell>
                <TableCell></TableCell>
                <TableCell align="left">Team</TableCell>
                <TableCell>vs</TableCell>
                <TableCell align="right">Team</TableCell>
                <TableCell></TableCell>
                <TableCell align="left">Score</TableCell>
                <TableCell align="left">Delta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row: any, i: number) => (
                <TableRow key={row.id}>
                  <TableCell align="left">
                    {new Date(row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <img className="teamLogo" src={row.teams[0].logo} />
                  </TableCell>
                  <TableCell
                    align="left"
                    style={{
                      fontWeight:
                        row.teams[0].result === 'W' ? 'bold' : undefined,
                    }}
                  >
                    <Link
                      style={{ color: 'black', textDecoration: 'none' }}
                      to={`/teams/${row.teams[0].id}`}
                    >
                      {row.teams[0].displayName}
                    </Link>{' '}
                    <Typography variant="caption">
                      ({Math.floor(row.teams[0].rating) || 'NR'})
                    </Typography>
                  </TableCell>
                  <TableCell>vs.</TableCell>
                  <TableCell
                    align="right"
                    style={{
                      fontWeight:
                        row.teams[1].result === 'W' ? 'bold' : undefined,
                    }}
                  >
                    <Link
                      style={{ color: 'black', textDecoration: 'none' }}
                      to={`/teams/${row.teams[1].id}`}
                    >
                      {row.teams[1].displayName}
                    </Link>{' '}
                    <Typography variant="caption">
                      ({Math.floor(row.teams[1].rating) || 'NR'})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <img className="teamLogo" src={row.teams[1].logo} />
                  </TableCell>
                  <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                    {row.teams[0].score} - {row.teams[1].score}
                  </TableCell>
                  <TableCell align="right">±{Math.floor(row.delta)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
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
          logo
          abbreviation
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

const Rankings = ({ limit }: { limit: number }) => (
  <Query
    query={gql`
      query ListRankingTeam($limit: Int) {
        listRankingTeam(limit: $limit) {
          id
          logo
          abbreviation
          displayName
          rating
          gamesPlayed
          gamesWon
          gamesLost
          gamesTied
        }
      }
    `}
    variables={{ limit }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const rows = data.listRankingTeam;
      // return <pre>{JSON.stringify(data, null, 2)}</pre>;
      return (
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="left">#</TableCell>
                <TableCell />
                <TableCell align="left">Name</TableCell>
                <TableCell align="right">Rating</TableCell>
                <TableCell align="right">WLT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row: any, i: number) => (
                <TableRow key={row.id}>
                  <TableCell align="left">{i + 1}</TableCell>
                  <TableCell>
                    <img className="teamLogo" src={row.logo} alt={''} />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Link
                        style={{ color: 'black', textDecoration: 'none' }}
                        to={`/teams/${row.id}`}
                      >
                        {row.displayName}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell align="right">{Math.floor(row.rating)}</TableCell>
                  <TableCell align="right">
                    <span style={{ color: 'green' }}>{row.gamesWon}</span>
                    {' - '}
                    <span style={{ color: 'red' }}>{row.gamesLost}</span>
                    {' - '}
                    <span style={{ color: 'gray' }}>{row.gamesTied}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }}
  </Query>
);

const Streaks = ({ type }: { type: string }) => (
  <Query
    query={gql`
      query ListStreak($type: String) {
        listStreak(type: $type) {
          id
          logo
          displayName
          current
          allTime
        }
      }
    `}
    variables={{ type }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const rows = data.listStreak;
      return (
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="left">#</TableCell>
                <TableCell />
                <TableCell align="left">Name</TableCell>
                {type === 'allTime' ? (
                  <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                    All Time
                  </TableCell>
                ) : (
                  <TableCell align="right">Current</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row: any, i: number) => (
                <TableRow key={row.id}>
                  <TableCell align="left">{i + 1}</TableCell>
                  <TableCell>
                    <img className="teamLogo" src={row.logo} alt={''} />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Link
                        style={{ color: 'black', textDecoration: 'none' }}
                        to={`/teams/${row.id}`}
                      >
                        {row.displayName}
                      </Link>
                    </div>
                  </TableCell>
                  {type === 'allTime' ? (
                    <TableCell align="right">{row.allTime}</TableCell>
                  ) : (
                    <TableCell align="right">{row.current}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }}
  </Query>
);

const Home = () => (
  <div>
    <Typography variant="h2">What if...</Typography>
    <Typography variant="h4">
      college football teams were rated like chess players?
    </Typography>
    <br />
    <Typography>
      When chess players play a game, their ratings change by an amount based on
      the expected result given the strength of their opponent. A strong player
      defeating a weak one will cause a small rating change, while a weak player
      defeating a strong opponent will cause a bigger change.
    </Typography>
    <br />
    <Typography>
      One such system is called{' '}
      <a
        href="https://en.wikipedia.org/wiki/Elo_rating_system"
        rel="noopener noreferrer"
        target="_blank"
      >
        Elo
      </a>
      , and has been used for many different types of games.
    </Typography>
    <Typography>
      Let's try it with over 75,000 college football games dating back to 1869!
    </Typography>
    <br />
    <Typography variant="button">Notes</Typography>
    <ul>
      <li>
        <Typography variant="caption">
          The initial rating value is 1000 and the k-value is 32.
        </Typography>
      </li>
      <li>
        <Typography variant="caption">
          This means the first time a team shows up, they're assigned a value of
          1000, and the maximum rating gain/loss for a game is 32.
        </Typography>
      </li>
      <li>
        <Typography variant="caption">
          Games involving a non Division I team aren't rated.
        </Typography>
      </li>
    </ul>
    <Rankings limit={500} />
  </div>
);

const TeamPage = ({ teamId }: { teamId: string }) => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <div>
      <Team teamId={teamId} />
      <RatingGraph teamId={teamId} />
      <RankingHistoryGraph teamId={teamId} />
      {/* <ComboGraph teamId={teamId} /> */}
      <Tabs value={value} onChange={handleChange}>
        <Tab label="Games" />
        <Tab label="Rivalries" />
      </Tabs>
      <TabPanel value={value} index={0}>
        <TeamGames teamId={teamId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TeamRivalry teamId={teamId} />
      </TabPanel>
    </div>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

const RatingGraph = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      query ListTeamRatingHistory($teamId: String!) {
        listTeamRatingHistory(teamId: $teamId) {
          date
          result
          rating
        }
      }
    `}
    variables={{ teamId }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const graphData = data.listTeamRatingHistory;
      return (
        <React.Fragment>
          <Typography variant="button">Rating History</Typography>
          <ResponsiveContainer width={'100%'} height={300}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(val) => new Date(val).getFullYear()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                formatter={(value, name, props) => [value]}
              />
              <Line
                dot={false}
                type="monotone"
                dataKey="rating"
                stroke="#8884d8"
              />
            </LineChart>
          </ResponsiveContainer>
        </React.Fragment>
      );
    }}
  </Query>
);

const RankingHistoryGraph = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      query ListTeamRankingHistory($teamId: String!) {
        listTeamRankingHistory(teamId: $teamId) {
          year
          rank
        }
      }
    `}
    variables={{ teamId }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const graphData = data.listTeamRankingHistory;
      return (
        <React.Fragment>
          <Typography variant="button">Rank History</Typography>
          <ResponsiveContainer width={'100%'} height={300}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis reversed />
              <Tooltip
              // labelFormatter={(label) => new Date(label).toLocaleDateString()}
              // formatter={(value, name, props) => [value]}
              />
              <Line
                dot={false}
                type="monotone"
                dataKey="rank"
                stroke="#8884d8"
              />
            </LineChart>
          </ResponsiveContainer>
        </React.Fragment>
      );
    }}
  </Query>
);

const ComboGraph = ({ teamId }: { teamId: string }) => (
  <Query
    query={gql`
      query ListCombo($teamId: String!) {
        listTeamRatingHistory(teamId: $teamId) {
          date
          result
          rating
        }
        listTeamRankingHistory(teamId: $teamId) {
          year
          rank
        }
      }
    `}
    variables={{ teamId }}
  >
    {(result: QueryResult) => {
      const { loading, error, data } = result;
      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error :(</p>;

      const graphData = data.listTeamRatingHistory.map((row: any) => ({
        ...row,
        date: Number(new Date(row.date)),
      }));
      const graphData2 = data.listTeamRankingHistory.map((row: any) => ({
        ...row,
        date: Number(new Date(row.year + '-01-01')),
      }));
      console.log(graphData[0], graphData2[0]);
      return (
        <React.Fragment>
          <Typography variant="button">Rating/Rank History</Typography>
          <ResponsiveContainer width={'100%'} height={300}>
            <LineChart
            //data={graphData}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                type="number"
                tickFormatter={(val) => new Date(val).getFullYear()}
              />
              <YAxis yAxisId="left" />
              <YAxis
                yAxisId="right"
                dataKey="rank"
                orientation="right"
                reversed
              />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                // formatter={(value, name, props) => [value]}
              />
              <Line
                dot={false}
                data={graphData}
                type="monotone"
                dataKey="rating"
                stroke="#8884d8"
                name="Rating"
                key="rating"
                yAxisId="left"
              />
              <Line
                dot
                data={graphData2}
                type="monotone"
                dataKey="rank"
                stroke="#8884d8"
                name="Rank"
                key="rank"
                yAxisId="right"
              />
            </LineChart>
          </ResponsiveContainer>
        </React.Fragment>
      );
    }}
  </Query>
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
        <BrowserRouter>
          <AppBar position="static">
            <Toolbar>
              <Typography
                variant="h6"
                style={{ textTransform: 'uppercase', fontWeight: 600 }}
              >
                <Link
                  to="/"
                  style={{ textDecoration: 'none', color: 'white' }}
                >{`<OpenCFB/>`}</Link>
              </Typography>
              <Link
                to="/rankings"
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <Button color="inherit">Rankings</Button>
              </Link>
              {/* <Link
                to="/teams"
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <Button color="inherit">Teams</Button>
              </Link> */}
              {/* <Link
                to="/rivalries"
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <Button color="inherit">Rivalries</Button>
              </Link> */}
              {/* <Link
                to="/circles"
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <Button color="inherit">Circles</Button>
              </Link> */}
              <Link
                to="/streaks"
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <Button color="inherit">Streaks</Button>
              </Link>
              <Link
                to="/games"
                style={{ textDecoration: 'none', color: 'white' }}
              >
                <Button color="inherit">Games</Button>
              </Link>
              <a
                style={{ marginLeft: 'auto' }}
                href="https://github.com/howardchung/opencfb"
                rel="noopener noreferrer"
                target="_blank"
              >
                <IconButton aria-label="GitHub">
                  <GitHubIcon />
                </IconButton>
              </a>
            </Toolbar>
          </AppBar>
          <Container maxWidth={'md'}>
            <Switch>
              <Route path="/" exact render={() => <Home />} />
              {/* <Route
                path="/teams"
                exact
                render={({ match }) => (
                  <Teams />
                )}
              /> */}
              <Route
                path="/teams/:teamId?"
                render={({ match }) => (
                  <TeamPage teamId={match.params.teamId} />
                )}
              />
              <Route path="/games" render={({ match }) => <Games />} />
              {/* <Route
                path="/games/:gameId?"
                render={({ match }) => (
                  <GamePage gameId={match.params.gameId} />
                )}
              /> */}
              <Route
                path="/rankings"
                render={({ match }) => <Rankings limit={2000} />}
              />
              <Route
                path="/streaks"
                render={({ match }) => (
                  <div>
                    <Grid container spacing={3}>
                      <Grid item xs>
                        <Streaks type="current" />
                      </Grid>
                      <Grid item xs>
                        <Streaks type="allTime" />
                      </Grid>
                    </Grid>
                  </div>
                )}
              />
            </Switch>
          </Container>
        </BrowserRouter>
      </ApolloProvider>
    );
  }
}

export default App;

const getColorForResult = (result: string) => {
  if (result === 'W') {
    return 'green';
  } else if (result === 'L') {
    return 'red';
  } else if (result === 'T') {
    return 'gray';
  }
  return 'black';
};
