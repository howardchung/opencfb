import React, { useEffect, useState } from "react";
import "./App.css";
import {
  Switch,
  Route,
  HashRouter,
  Link,
  useLocation,
} from "react-router-dom";
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ResponsiveContainer,
} from "recharts";
import { createDbWorker, WorkerHttpvfs } from "sql.js-httpvfs";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const wasmUrl = new URL("sql.js-httpvfs/dist/sql-wasm.wasm", import.meta.url);
const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url,
);
let worker: WorkerHttpvfs | null = null;
async function loadWorker() {
  if (worker) {
    return worker;
  }
  worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: new URL("opencfb.sqlite.mp4", document.baseURI).href,
          requestChunkSize: 4096,
        },
      },
    ],
    workerUrl.toString(),
    wasmUrl.toString(),
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
        [teamId],
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  const team = rows[0];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {team.logo && (
        <img
          src={team.logo}
          style={{ height: "150px" }}
          alt={team.displayName}
        />
      )}
      <div style={{ width: "100%", marginLeft: "20px" }}>
        <h4 className="typo-h4" style={{ color: "#" + team.color }}>
          {team.displayName}
        </h4>
        <div
          style={{
            backgroundColor: "#" + team.color,
            color: "white",
            fontSize: "12px",
            padding: "4px",
            width: "fit-content",
            height: "fit-content",
            borderRadius: "4px",
          }}
        >
          {team.abbreviation}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <div style={{ marginRight: "20px" }}>
            <span className="typo-button">Rating</span>
            <p className="typo-body" style={{ fontSize: "24px", color: "black" }}>
              {Math.floor(team.rating)}
            </p>
          </div>
          <div style={{ marginRight: "20px" }}>
            <span className="typo-button">Wins</span>
            <p className="typo-body" style={{ fontSize: "24px", color: "green" }}>
              {team.gamesWon}
            </p>
          </div>
          <div style={{ marginRight: "20px" }}>
            <span className="typo-button">Losses</span>
            <p className="typo-body" style={{ fontSize: "24px", color: "red" }}>
              {team.gamesLost}
            </p>
          </div>
          <div style={{ marginRight: "20px" }}>
            <span className="typo-button">Ties</span>
            <p className="typo-body" style={{ fontSize: "24px", color: "gray" }}>
              {team.gamesTied}
            </p>
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
        [teamId],
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  const graphData = rows;
  return (
    <React.Fragment>
      <span className="typo-button">Rating History</span>
      <ResponsiveContainer width={"100%"} height={300}>
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
        [teamId],
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  const graphData = rows;
  return (
    <React.Fragment>
      <span className="typo-button">Rank History</span>
      <ResponsiveContainer width={"100%"} height={300}>
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
        [teamId, teamId],
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
    <div className="table-container">
      <table className="data-table" aria-label="simple table">
        <thead>
          <tr>
            <th className="align-left">Date</th>
            <th />
            <th />
            <th />
            <th />
            <th className="align-left">Opponent</th>
            <th className="align-right">Result</th>
            <th className="align-right">Score</th>
            <th className="align-right">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id}>
              <td className="align-left">
                {new Date(row.date).toLocaleDateString()}
              </td>
              <td>
                <img className="teamLogo" src={row.logo} />
              </td>
              <td
                className="align-left"
                style={{
                  fontWeight: row.result === "W" ? "bold" : undefined,
                }}
              >
                <Link
                  style={{ color: "black", textDecoration: "none" }}
                  to={`/teams/${teamId}`}
                >
                  {row.displayName}
                </Link>{" "}
                <span className="typo-caption">
                  ({Math.floor(row.rating) || "NR"})
                </span>
              </td>
              <td>{row.field === "away" ? "@" : "vs."}</td>
              <td>
                <img className="teamLogo" src={row.opponent.logo} />
              </td>
              <td
                className="align-left"
                style={{
                  fontWeight: row.opponent.result === "W" ? "bold" : undefined,
                }}
              >
                <Link
                  style={{ color: "black", textDecoration: "none" }}
                  to={`/teams/${row.opponent.id}`}
                >
                  {row.opponent.displayName}
                </Link>{" "}
                <span className="typo-caption">
                  ({Math.floor(row.opponent.rating) || "NR"})
                </span>
              </td>
              <td
                className="align-right"
                style={{
                  fontWeight: "bold",
                  color: getColorForResult(row.result),
                }}
              >
                {row.result}
              </td>
              <td className="align-right" style={{ whiteSpace: "nowrap" }}>
                {row.score} - {row.opponent.score}
              </td>
              <td className="align-right">
                <span style={{ color: row.result === "L" ? "red" : "green" }}>
                  {row.result === "W" && "+"}
                  {row.result === "L" && "-"}
                  {row.delta.toFixed(1)}{" "}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        [teamId],
      );
      setRows(data);
    }
    fetch();
  }, [teamId]);
  if (!rows) return <p>Loading...</p>;
  return (
    <div className="table-container">
      <table className="data-table" aria-label="simple table">
        <thead>
          <tr>
            <th />
            <th className="align-left">Opponent</th>
            <th className="align-right">Games Played</th>
            <th className="align-right">WLT</th>
            <th className="align-right">Win %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id}>
              <td>
                <img className="teamLogo" src={row.logo} />
              </td>
              <td className="align-left">
                <Link
                  style={{ color: "black", textDecoration: "none" }}
                  to={`/teams/${row.id}`}
                >
                  {row.displayName}
                </Link>
              </td>
              <td className="align-right">{row.gamesPlayed}</td>
              <td className="align-right">
                <span style={{ color: "green" }}>{row.gamesWon}</span>
                {" - "}
                <span style={{ color: "red" }}>{row.gamesLost}</span>
                {" - "}
                <span style={{ color: "gray" }}>{row.gamesTied}</span>
              </td>
              <td className="align-right">
                {((row.gamesWon / row.gamesPlayed) * 100).toFixed(2) + "%"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        [],
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
    <>
      <h6 className="typo-h6">Games</h6>
      <div className="table-container">
        <table className="data-table" aria-label="simple table">
          <thead>
            <tr>
              <th className="align-left">Date</th>
              <th></th>
              <th className="align-left">Team</th>
              <th>vs</th>
              <th className="align-right">Team</th>
              <th></th>
              <th className="align-left">Score</th>
              <th className="align-left">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.id}>
                <td className="align-left">
                  {new Date(row.date).toLocaleDateString()}
                </td>
                <td>
                  <img className="teamLogo" src={row.teams[0].logo} />
                </td>
                <td
                  className="align-left"
                  style={{
                    fontWeight:
                      row.teams[0].result === "W" ? "bold" : undefined,
                  }}
                >
                  <Link
                    style={{ color: "black", textDecoration: "none" }}
                    to={`/teams/${row.teams[0].id}`}
                  >
                    {row.teams[0].displayName}
                  </Link>{" "}
                  <span className="typo-caption">
                    ({Math.floor(row.teams[0].rating) || "NR"})
                  </span>
                </td>
                <td>vs.</td>
                <td
                  className="align-right"
                  style={{
                    fontWeight:
                      row.teams[1].result === "W" ? "bold" : undefined,
                  }}
                >
                  <Link
                    style={{ color: "black", textDecoration: "none" }}
                    to={`/teams/${row.teams[1].id}`}
                  >
                    {row.teams[1].displayName}
                  </Link>{" "}
                  <span className="typo-caption">
                    ({Math.floor(row.teams[1].rating) || "NR"})
                  </span>
                </td>
                <td>
                  <img className="teamLogo" src={row.teams[1].logo} />
                </td>
                <td className="align-right" style={{ whiteSpace: "nowrap" }}>
                  {row.teams[0].score} - {row.teams[1].score}
                </td>
                <td className="align-right">±{row.delta.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
          [year, limit],
        );
      } else {
        res = await worker.db.query(
          `SELECT team_ranking.id, team.displayname as "displayName", logo, abbreviation, team_ranking.rating, team_ranking.prevRating
        FROM team_ranking
        left join team on team_ranking.id = team.id
        WHERE logo IS NOT NULL
        AND logo != ''
        order by rating desc limit ?`,
          [limit],
        );
      }
      setRows(res);
    }
    fetch();
  }, [setRows, limit, year]);
  if (!rows) return <p>Loading...</p>;
  // return <pre>{JSON.stringify(data, null, 2)}</pre>;
  const prevRankings = [...rows].sort((a, b) => b.prevRating - a.prevRating);
  const prevRankingsMap = new Map<Number, Number>();
  prevRankings.forEach((row, i) => {
    prevRankingsMap.set(row.id, i);
  });
  return (
    <div className="table-container">
      <table className="data-table" aria-label="simple table">
        <thead>
          <tr>
            <th className="align-left">#</th>
            <th />
            <th />
            <th className="align-left">Name</th>
            <th className="align-right">Rating</th>
            {!Boolean(year) && <th className="align-right">Delta</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any, i: number) => {
            const delta = Number(row.rating - row.prevRating).toFixed(1);
            const rankDelta = Number(prevRankingsMap.get(row.id)) - i;
            return (
              <tr key={row.id}>
                <td className="align-left">{i + 1} </td>
                <td>
                  {Math.abs(rankDelta) > 0 && (
                    <span
                      style={{ color: Number(rankDelta) < 0 ? "red" : "green" }}
                    >
                      {rankDelta > 0 ? "↑" : "↓"}
                      {Math.abs(rankDelta)}
                    </span>
                  )}
                </td>
                <td>
                  <img className="teamLogo" src={row.logo} alt={""} />
                </td>
                <th scope="row">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Link
                      style={{ color: "black", textDecoration: "none" }}
                      to={`/teams/${row.id}`}
                    >
                      {row.displayName}
                    </Link>
                  </div>
                </th>
                <td className="align-right">{Math.floor(row.rating)}</td>
                {!Boolean(year) && (
                  <td className="align-right">
                    <span
                      style={{
                        color:
                          Number(delta) === 0
                            ? "black"
                            : Number(delta) < 0
                              ? "red"
                              : "green",
                      }}
                    >
                      {Number(delta) < 0 ? "" : "+"}
                      {delta}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
    ORDER BY ${type === "allTime" ? "allTime" : "current"} desc
    limit 100
    `);
      setRows(data);
    }
    fetch();
  }, [type]);
  if (!rows) return <p>Loading...</p>;
  return (
    <div className="table-container">
      <table className="data-table" aria-label="simple table">
        <thead>
          <tr>
            <th className="align-left">#</th>
            <th />
            <th className="align-left">Name</th>
            {type === "allTime" ? (
              <th className="align-right" style={{ whiteSpace: "nowrap" }}>
                All Time
              </th>
            ) : (
              <th className="align-right">Current</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any, i: number) => (
            <tr key={row.id}>
              <td className="align-left">{i + 1}</td>
              <td>
                <img className="teamLogo" src={row.logo} alt={""} />
              </td>
              <th scope="row">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Link
                    style={{ color: "black", textDecoration: "none" }}
                    to={`/teams/${row.id}`}
                  >
                    {row.displayName}
                  </Link>
                </div>
              </th>
              {type === "allTime" ? (
                <td className="align-right">{row.allTime}</td>
              ) : (
                <td className="align-right">{row.current}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TeamPage = ({ teamId }: { teamId: string | undefined }) => {
  const [value, setValue] = React.useState(0);

  if (!teamId) {
    return null;
  }

  return (
    <div>
      <Team teamId={teamId} />
      <RatingGraph teamId={teamId} />
      <RankingHistoryGraph teamId={teamId} />
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={value === 0}
          className={`tab-btn ${value === 0 ? "active" : ""}`}
          onClick={() => setValue(0)}
        >
          Games
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === 1}
          className={`tab-btn ${value === 1 ? "active" : ""}`}
          onClick={() => setValue(1)}
        >
          Rivalries
        </button>
      </div>
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
    <h2 className="typo-h2">What if...</h2>
    <h4 className="typo-h4">
      college football teams were rated like chess players?
    </h4>
    <br />
    <p className="typo-body">
      In the{" "}
      <a
        href="https://en.wikipedia.org/wiki/Elo_rating_system"
        rel="noopener noreferrer"
        target="_blank"
      >
        Elo
      </a>{" "}
      rating system, ratings change based on the expected result given the
      strength of each player. A strong player defeating a weak one will cause a
      small rating change, while a weak player defeating a strong opponent will
      cause a bigger change.
    </p>
    <br />
    <p className="typo-body">
      Let's apply it to over 40,000 college football games dating back to 1869!
    </p>
    <br />
    <span className="typo-button">Notes</span>
    <ul>
      <li>
        <span className="typo-caption">
          The initial rating value is 1000 and the k-value is 32.
        </span>
      </li>
      <li>
        <span className="typo-caption">
          This means the first time a team shows up, they're assigned a value of
          1000, and the maximum rating gain/loss for a game is 32.
        </span>
      </li>
      <li>
        <span className="typo-caption">
          Only games involving current FBS teams are rated.
        </span>
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
      {value === index && <div className="tab-panel-content">{children}</div>}
    </div>
  );
}

const App = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <header className="app-bar">
        <div className="toolbar">
          <Link to="/" className="brand-link">
            {`<OpenCFB/>`}
          </Link>
          <Link to="/rankings" className="nav-link">
            Rankings
          </Link>
          <Link to="/streaks" className="nav-link">
            Streaks
          </Link>
          <Link to="/games" className="nav-link">
            Games
          </Link>
          <a
            className="icon-btn"
            aria-label="GitHub"
            href="https://github.com/howardchung/opencfb"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27" />
            </svg>
          </a>
        </div>
      </header>
      <main className="container">
        <Switch>
          <Route path="/" exact render={() => <Home />} />
          <Route
            path="/teams/:teamId?"
            render={({ match }) => <TeamPage teamId={match.params.teamId} />}
          />
          <Route path="/games" render={() => <Games />} />
          <Route
            path="/rankings/:year?"
            render={({ match, history }) => (
              <React.Fragment>
                <h6 className="typo-h6">Rankings</h6>
                <div className="form-control">
                  <label className="form-label" htmlFor="rankings-year-select">
                    Year
                  </label>
                  <select
                    id="rankings-year-select"
                    className="year-select"
                    value={match.params.year || ""}
                    onChange={(e) =>
                      history.push("/rankings/" + e.target.value)
                    }
                  >
                    {/* starting year one higher if we're past january */}
                    {Array.from(
                      new Array(
                        new Date().getFullYear() -
                          (new Date().getMonth() > 0 ? 0 : 1) -
                          1869 +
                          1,
                      ),
                      (x, i) =>
                        new Date().getFullYear() -
                        (new Date().getMonth() > 0 ? 0 : 1) -
                        i,
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <Rankings limit={500} year={Number(match.params.year)} />
              </React.Fragment>
            )}
          />
          <Route
            path="/streaks"
            render={() => (
              <>
                <h6 className="typo-h6">Streaks</h6>
                <div style={{ display: "flex", gap: "12px" }}>
                  <Streaks type="current" />
                  <Streaks type="allTime" />
                </div>
              </>
            )}
          />
        </Switch>
      </main>
    </HashRouter>
  );
};

export default App;

const getColorForResult = (result: string) => {
  if (result === "W") {
    return "green";
  } else if (result === "L") {
    return "red";
  } else if (result === "T") {
    return "gray";
  }
  return "black";
};
