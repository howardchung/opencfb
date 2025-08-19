import React, { Component, useEffect, useState } from 'react';
import './App.css';
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
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import createHistory from 'history/createBrowserHistory';
import { createDbWorker, WorkerHttpvfs } from 'sql.js-httpvfs';

export const history = createHistory();

history.listen((location, action) => {
  window.scrollTo(0, 0);
});

const wasmUrl = new URL('sql.js-httpvfs/dist/sql-wasm.wasm', import.meta.url);
let worker: WorkerHttpvfs | null = null;
async function loadWorker() {
  if (worker) {
    return worker;
  }
  worker = await createDbWorker(
    [
      {
        from: 'inline',
        config: {
          serverMode: 'full',
          url: process.env.NODE_ENV === 'development' ? '/opencfb.sqlite' : 'https://corsproxy.io/?url=https://github.com/howardchung/opencfb/raw/refs/heads/release/public/opencfb.sqlite',
          requestChunkSize: 4096,
        },
      },
    ],
    '/sqlite.worker.js',
    wasmUrl.toString()
  );
  return worker;
}

// const Template = ({ teamId }: { teamId: string }) => {
//   const [rows, setRows] = useState<any>(null);
//   useEffect(() => {
//     async function fetch() {
//       const worker = await loadWorker();
//       const data = await worker.db.query(
//       );
//       setRows(data);
//     }
//     fetch();
//   }, [teamId]);
//   if (!rows) return <p>Loading...</p>;
//   return null;
// }

const Team = ({ teamId }: { teamId: string }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(
        `SELECT team.id, logo, abbreviation, displayname as "displayName", gamesPlayed, gamesWon, gamesLost, gamesTied, rating, color, alternatecolor as "alternateColor"
      FROM team
      left join team_ranking on team.id = team_ranking.id
      left join team_count on team.id = team_count.id
      where team.id = ?`,
        [teamId]
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  const team = rows[0];
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
};

const RatingGraph = ({ teamId }: { teamId: string }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(
        `SELECT year, cast(rating as int) as rating
        from team_ranking_history
        where id = ?
        order by year asc
        `,
        [teamId]
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  const graphData = rows;
  return (
    <React.Fragment>
      <Typography variant="button">Rating History</Typography>
      <ResponsiveContainer width={'100%'} height={300}>
        <LineChart data={graphData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip
            // labelFormatter={(label) => new Date(label).toLocaleDateString()}
            // formatter={(value, name, props) => [value]}
          />
          <Line dot={false} type="natural" dataKey="rating" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </React.Fragment>
  );
};

const RankingHistoryGraph = ({ teamId }: { teamId: string }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(
        `
        SELECT year, rank
        from team_ranking_history
        where id = ?
        order by year asc
      `,
        [teamId]
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  const graphData = rows;
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
          <Line dot={false} type="natural" dataKey="rank" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </React.Fragment>
  );
};

const TeamGames = ({ teamId, limit }: { teamId: string; limit: number }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(
        `SELECT game.id, game.date, ged.delta, team.logo, team.displayname as "displayName", gameteam.score, gameteam.rating, gameteam.result, gameteam.field, gt2.score as oppScore, gt2.teamid as oppId, gt2.rating as oppRating, gt2.result as oppResult, oppTeam.logo as oppLogo, oppTeam.displayname as oppName
        FROM game
        join gameteam on game.id = gameteam.gameid
        join gameteam gt2 on gt2.gameid = gameteam.gameid and gt2.teamid != gameteam.teamid
        join team on gameteam.teamid = team.id
        left join team oppTeam on oppTeam.id = gt2.teamid
        left join game_elo_delta ged on ged.id = game.id
        where game.id IN (select gameid from gameteam where gameteam.teamid = ? order by gameid desc limit 20)
        AND gameteam.teamid = ?
        order by game.date desc
        `,
        [teamId, teamId]
      );
      const final = data.map((row: any) => ({
        id: row.id,
        date: row.date,
        score: row.score,
        field: row.field,
        rating: row.rating,
        delta: row.delta,
        result: row.result,
        logo: row.logo,
        displayName: row.displayName,
        opponent: {
          id: row.oppId,
          logo: row.oppLogo,
          displayName: row.oppName,
          score: row.oppScore,
          rating: row.oppRating,
          result: row.oppResult,
        },
      }));
      setRows(final);
    }
    fetch();
  }, [teamId, limit]);
  if (!rows) return <p>Loading...</p>;
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
                  fontWeight: row.opponent.result === 'W' ? 'bold' : undefined,
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
                <span style={{ color: row.result === 'L' ? 'red' : 'green' }}>
                  {row.result === 'W' && '+'}
                  {row.result === 'L' && '-'}
                  {row.delta.toFixed(1)}{' '}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const TeamRivalry = ({ teamId }: { teamId: string }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(
        `
        SELECT id, logo, displayname as "displayName",
        count(1) gamesPlayed,
        sum(case when gameteam.result = 'W' then 1 else 0 end) gamesWon,
        sum(case when gameteam.result = 'L' then 1 else 0 end) gamesLost,
        sum(case when gameteam.result = 'T' then 1 else 0 end) gamesTied
        from gameteam
        join gameteam gt2 on gameteam.gameid = gt2.gameid and gameteam.teamid != gt2.teamid
        left join team on gt2.teamid = team.id
        where gameteam.teamid = ?
        group by id, logo, displayName
        order by gamesPlayed desc
      `,
        [teamId]
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
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
};

const Games = () => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(
        `SELECT game.id, game.date, gt.score as team1Score, gt2.score as team2Score, gt.teamid as team1Id, gt2.teamid as team2Id, t1.displayname as team1Name, t2.displayname as team2Name, gt.result as team1Result, gt2.result as team2Result, t1.logo as team1Logo, t2.logo as team2Logo, gt.rating as team1Rating, gt2.rating as team2Rating, ged.delta
        FROM game
        join gameteam gt on game.id = gt.gameid
        join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid
        join team t1 on gt.teamid = t1.id
        join team t2 on gt2.teamid = t2.id
        left join game_elo_delta ged on game.id = ged.id
        where game.id in (select id from game order by game.date desc limit 100)
        and gt.teamid < gt2.teamid
        order by game.date desc`,
        []
      );
      // Put team data into array
      const final = data.map((row: any) => ({
        id: row.id,
        date: row.date,
        delta: row.delta,
        teams: [
          {
            id: row.team1Id,
            logo: row.team1Logo,
            displayName: row.team1Name,
            result: row.team1Result,
            score: row.team1Score,
            rating: row.team1Rating,
          },
          {
            id: row.team2Id,
            logo: row.team2Logo,
            displayName: row.team2Name,
            result: row.team2Result,
            score: row.team2Score,
            rating: row.team2Rating,
          },
        ],
      }));
      setRows(final);
    }
    fetch();
  });

  if (!rows) return <p>Loading...</p>;
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
                  fontWeight: row.teams[0].result === 'W' ? 'bold' : undefined,
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
                  fontWeight: row.teams[1].result === 'W' ? 'bold' : undefined,
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
              <TableCell align="right">±{row.delta.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const Rankings = ({ limit, year }: { limit: number; year?: number }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      let res: any = [];
      const worker = await loadWorker();
      if (year) {
        res = await worker.db.query(
          `
      SELECT team_ranking_history.id, team.displayname as "displayName", logo, team_ranking_history.rating
      FROM team_ranking_history
      JOIN team on team_ranking_history.id = team.id
      WHERE year = ?
      AND logo IS NOT NULL
      AND logo != ''
      ORDER BY rating desc
      limit ?
      `,
          [year, limit]
        );
      } else {
        res = await worker.db.query(
          `SELECT team_ranking.id, team.displayname as "displayName", logo, abbreviation, team_ranking.rating, team_ranking.prevRating
        FROM team_ranking
        left join team on team_ranking.id = team.id
        WHERE logo IS NOT NULL
        AND logo != ''
        order by rating desc limit ?`,
          [limit]
        );
      }
      setRows(res);
    }
    fetch();
  }, [setRows, limit, year]);
  if (!rows) return <p>Loading...</p>;
  // return <pre>{JSON.stringify(data, null, 2)}</pre>;
  const prevRankings = [...rows].sort((a,b) => b.prevRating - a.prevRating);
  const prevRankingsMap = new Map<Number, Number>();
  prevRankings.forEach((row, i) => {
    prevRankingsMap.set(row.id, i);
  });
  return (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="left">#</TableCell>
            <TableCell />
            <TableCell />
            <TableCell align="left">Name</TableCell>
            <TableCell align="right">Rating</TableCell>
            {!Boolean(year) && <TableCell align="right">Delta</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row: any, i: number) => {
            const delta = Number(row.rating - row.prevRating).toFixed(1);
            const rankDelta = Number(prevRankingsMap.get(row.id)) - i;
            return <TableRow key={row.id}>
              <TableCell align="left">{i + 1}{' '}
              </TableCell>
              <TableCell>
                {Math.abs(rankDelta) > 0 && <span style={{ color: Number(rankDelta) < 0 ? 'red' : 'green'}}>{rankDelta > 0 ? '↑' : '↓'}{Math.abs(rankDelta)}</span>}
              </TableCell>
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
              {!Boolean(year) && (
                <TableCell align="right">
                  <span style={{ color: Number(delta) === 0 ? 'black' : Number(delta) < 0 ? 'red' : 'green' }}>{Number(delta) < 0 ? '' : '+'}{delta}</span>
                </TableCell>
              )}
            </TableRow>;
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const Streaks = ({ type }: { type: string }) => {
  const [rows, setRows] = useState<any>(null);
  useEffect(() => {
    async function fetch() {
      const worker = await loadWorker();
      const data = await worker.db.query(`
    SELECT team.id, team.logo, team.displayname as "displayName", current, allTime
    FROM team
    JOIN conference on team.conferenceid = conference.id
    LEFT JOIN team_streak on team.id = team_streak.id
    WHERE conference.division = 'fbs'
    ORDER BY ${type === 'allTime' ? 'allTime' : 'current'} desc
    limit 100
    `);
      setRows(data);
    }
    fetch();
  }, [type]);
  if (!rows) return <p>Loading...</p>;
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
};

const TeamPage = ({ teamId }: { teamId: string | undefined }) => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  if (!teamId) {
    return null;
  }

  return (
    <div>
      <Team teamId={teamId} />
      <RatingGraph teamId={teamId} />
      <RankingHistoryGraph teamId={teamId} />
      <Tabs value={value} onChange={handleChange}>
        <Tab label="Games" />
        <Tab label="Rivalries" />
      </Tabs>
      <TabPanel value={value} index={0}>
        <TeamGames teamId={teamId} limit={15} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TeamRivalry teamId={teamId} />
      </TabPanel>
    </div>
  );
};

const Home = () => (
  <div>
    <Typography variant="h2">What if...</Typography>
    <Typography variant="h4">
      college football teams were rated like chess players?
    </Typography>
    <br />
    <Typography>
      In the <a
        href="https://en.wikipedia.org/wiki/Elo_rating_system"
        rel="noopener noreferrer"
        target="_blank"
      >
        Elo
      </a> rating system, ratings change based on
      the expected result given the strength of each player. A strong player
      defeating a weak one will cause a small rating change, while a weak player
      defeating a strong opponent will cause a bigger change.
    </Typography>
    <br />
    <Typography>
      What if we applied it to over 40,000 college football games dating back to 1869?
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
          Only games involving current FBS teams are rated.
        </Typography>
      </li>
    </ul>
    <Rankings limit={200} />
  </div>
);

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

class App extends Component {
  render() {
    return (
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
            <Route
              path="/teams/:teamId?"
              render={({ match }) => <TeamPage teamId={match.params.teamId} />}
            />
            <Route path="/games" render={({ match }) => <Games />} />
            <Route
              path="/rankings/:year?"
              render={({ match, history }) => (
                <React.Fragment>
                  <Typography variant="button">Rankings</Typography>
                  <br />
                  <FormControl>
                    <InputLabel id="rankings-year-label">Year</InputLabel>
                    <Select
                      style={{ width: '100px' }}
                      labelId="rankings-year-label"
                      value={match.params.year || ''}
                      onChange={(e) =>
                        history.push('/rankings/' + e.target.value)
                      }
                    >
                      {/* <MenuItem value="">Current</MenuItem> */}
                      {/* starting year one higher if we're past january */}
                      {Array.from(
                        new Array(
                          new Date().getFullYear() -
                            (new Date().getMonth() > 0 ? 0 : 1) -
                            1869 +
                            1
                        ),
                        (x, i) =>
                          new Date().getFullYear() -
                          (new Date().getMonth() > 0 ? 0 : 1) -
                          i
                      ).map((year) => (
                        <MenuItem value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Rankings limit={500} year={Number(match.params.year)} />
                </React.Fragment>
              )}
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
