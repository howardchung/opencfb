import React, { useEffect, useState } from "react";
import "./App.css";
import {
  Switch,
  Route,
  HashRouter,
  Link,
  NavLink,
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

const Loading = () => (
  <div className="loading-state" role="status" aria-live="polite">
    <span className="spinner" aria-hidden="true" />
    <span>Loading...</span>
  </div>
);

const getResultBadgeClass = (result: string) => {
  if (result === "W") return "result-badge result-badge--win";
  if (result === "L") return "result-badge result-badge--loss";
  return "result-badge result-badge--tie";
};

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
  if (!rows) return <Loading />;
  const team = rows[0];
  const accentColor = team.color ? `#${team.color}` : undefined;
  return (
    <section
      className="team-hero"
      style={accentColor ? { borderTopColor: accentColor } : undefined}
    >
      {team.logo && (
        <div className="team-logo-wrap">
          <img
            src={team.logo}
            className="team-logo-lg"
            alt={team.displayName}
          />
        </div>
      )}
      <div className="team-info">
        <div className="team-title-row">
          <h1
            className="team-name"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {team.displayName}
          </h1>
          {team.abbreviation && (
            <span
              className="team-abbr"
              style={{ backgroundColor: accentColor || "#0b192c" }}
            >
              {team.abbreviation}
            </span>
          )}
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Rating</span>
            <p className="stat-value">{Math.floor(team.rating)}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Wins</span>
            <p className="stat-value stat-value--win">{team.gamesWon}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Losses</span>
            <p className="stat-value stat-value--loss">{team.gamesLost}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Ties</span>
            <p className="stat-value stat-value--tie">{team.gamesTied}</p>
          </div>
        </div>
      </div>
    </section>
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
  if (!rows) return <Loading />;
  const graphData = rows;
  return (
    <div className="chart-card">
      <h2 className="chart-title">Rating History</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={graphData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            dot={false}
            type="natural"
            dataKey="rating"
            stroke="#0f766e"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
  if (!rows) return <Loading />;
  const graphData = rows;
  return (
    <div className="chart-card">
      <h2 className="chart-title">Rank History</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={graphData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis reversed tick={{ fontSize: 12, fill: "#64748b" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            dot={false}
            type="natural"
            dataKey="rank"
            stroke="#0b192c"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
  if (!rows) return <Loading />;
  return (
    <div className="table-wrap">
      <table className="data-table" aria-label="Team games">
        <thead>
          <tr>
            <th className="align-left">Date</th>
            <th className="align-left">Team</th>
            <th className="align-center" />
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
              <td className="align-left">
                <div className="team-cell">
                  <img className="team-logo" src={row.logo} alt="" />
                  <Link
                    className={`team-link${row.result === "W" ? " team-link--winner" : ""}`}
                    to={`/teams/${teamId}`}
                  >
                    {row.displayName}
                  </Link>
                  <span className="rating-inline">
                    ({Math.floor(row.rating) || "NR"})
                  </span>
                </div>
              </td>
              <td className="vs-cell">{row.field === "away" ? "@" : "vs."}</td>
              <td className="align-left">
                <div className="team-cell">
                  <img className="team-logo" src={row.opponent.logo} alt="" />
                  <Link
                    className={`team-link${row.opponent.result === "W" ? " team-link--winner" : ""}`}
                    to={`/teams/${row.opponent.id}`}
                  >
                    {row.opponent.displayName}
                  </Link>
                  <span className="rating-inline">
                    ({Math.floor(row.opponent.rating) || "NR"})
                  </span>
                </div>
              </td>
              <td className="align-right">
                <span className={getResultBadgeClass(row.result)}>
                  {row.result}
                </span>
              </td>
              <td className="align-right score-cell">
                {row.score} - {row.opponent.score}
              </td>
              <td className="align-right">
                <span
                  className={row.result === "L" ? "delta-neg" : "delta-pos"}
                >
                  {row.result === "W" && "+"}
                  {row.result === "L" && "-"}
                  {row.delta.toFixed(1)}
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
  if (!rows) return <Loading />;
  return (
    <div className="table-wrap">
      <table className="data-table" aria-label="Team rivalries">
        <thead>
          <tr>
            <th className="align-left">Opponent</th>
            <th className="align-right">Games Played</th>
            <th className="align-right">W-L-T</th>
            <th className="align-right">Win %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id}>
              <td className="align-left">
                <div className="team-cell">
                  <img className="team-logo" src={row.logo} alt="" />
                  <Link className="team-link" to={`/teams/${row.id}`}>
                    {row.displayName}
                  </Link>
                </div>
              </td>
              <td className="align-right">{row.gamesPlayed}</td>
              <td className="align-right">
                <span className="wlt-win">{row.gamesWon}</span>
                {" - "}
                <span className="wlt-loss">{row.gamesLost}</span>
                {" - "}
                <span className="wlt-tie">{row.gamesTied}</span>
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
  }, []);

  if (!rows) return <Loading />;
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Games</h1>
          <p className="page-subtitle">Most recent 100 rated matchups</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table" aria-label="Recent games">
          <thead>
            <tr>
              <th className="align-left">Date</th>
              <th className="align-left">Team</th>
              <th className="align-center">vs</th>
              <th className="align-left">Team</th>
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
                <td className="align-left">
                  <div className="team-cell">
                    <img
                      className="team-logo"
                      src={row.teams[0].logo}
                      alt=""
                    />
                    <Link
                      className={`team-link${row.teams[0].result === "W" ? " team-link--winner" : ""}`}
                      to={`/teams/${row.teams[0].id}`}
                    >
                      {row.teams[0].displayName}
                    </Link>
                    <span className="rating-inline">
                      ({Math.floor(row.teams[0].rating) || "NR"})
                    </span>
                  </div>
                </td>
                <td className="vs-cell">vs.</td>
                <td className="align-left">
                  <div className="team-cell">
                    <img
                      className="team-logo"
                      src={row.teams[1].logo}
                      alt=""
                    />
                    <Link
                      className={`team-link${row.teams[1].result === "W" ? " team-link--winner" : ""}`}
                      to={`/teams/${row.teams[1].id}`}
                    >
                      {row.teams[1].displayName}
                    </Link>
                    <span className="rating-inline">
                      ({Math.floor(row.teams[1].rating) || "NR"})
                    </span>
                  </div>
                </td>
                <td className="align-right score-cell">
                  {row.teams[0].score} - {row.teams[1].score}
                </td>
                <td className="align-right delta-zero">
                  ±{row.delta.toFixed(1)}
                </td>
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
  if (!rows) return <Loading />;
  // return <pre>{JSON.stringify(data, null, 2)}</pre>;
  const prevRankings = [...rows].sort((a, b) => b.prevRating - a.prevRating);
  const prevRankingsMap = new Map<Number, Number>();
  prevRankings.forEach((row, i) => {
    prevRankingsMap.set(row.id, i);
  });
  return (
    <div className="table-wrap">
      <table className="data-table" aria-label="Team rankings">
        <thead>
          <tr>
            <th className="align-left">#</th>
            <th className="align-center" />
            <th className="align-left">Team</th>
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
                <td className="align-left rank-col">{i + 1}</td>
                <td className="align-center">
                  {Math.abs(rankDelta) > 0 && (
                    <span
                      className={
                        Number(rankDelta) < 0 ? "delta-neg" : "delta-pos"
                      }
                    >
                      {rankDelta > 0 ? "↑" : "↓"}
                      {Math.abs(rankDelta)}
                    </span>
                  )}
                </td>
                <th scope="row">
                  <div className="team-cell">
                    <img className="team-logo" src={row.logo} alt="" />
                    <Link className="team-link" to={`/teams/${row.id}`}>
                      {row.displayName}
                    </Link>
                  </div>
                </th>
                <td className="align-right rating-value">
                  {Math.floor(row.rating)}
                </td>
                {!Boolean(year) && (
                  <td className="align-right">
                    <span
                      className={
                        Number(delta) === 0
                          ? "delta-zero"
                          : Number(delta) < 0
                            ? "delta-neg"
                            : "delta-pos"
                      }
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
  if (!rows) return <Loading />;
  return (
    <div>
      <h2 className="section-title">
        {type === "allTime" ? "All-Time Streaks" : "Current Streaks"}
      </h2>
      <div className="table-wrap">
        <table className="data-table" aria-label="Win streaks">
          <thead>
            <tr>
              <th className="align-left">#</th>
              <th className="align-left">Team</th>
              <th className="align-right">
                {type === "allTime" ? "All Time" : "Current"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={row.id}>
                <td className="align-left rank-col">{i + 1}</td>
                <th scope="row">
                  <div className="team-cell">
                    <img className="team-logo" src={row.logo} alt="" />
                    <Link className="team-link" to={`/teams/${row.id}`}>
                      {row.displayName}
                    </Link>
                  </div>
                </th>
                <td className="align-right rating-value">
                  {type === "allTime" ? row.allTime : row.current}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <div className="charts-grid">
        <RatingGraph teamId={teamId} />
        <RankingHistoryGraph teamId={teamId} />
      </div>
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
    <section className="hero-card">
      <h1 className="hero-title">What if...</h1>
      <p className="hero-subtitle">
        college football teams were rated like chess players?
      </p>
      <p className="hero-copy">
        In the{" "}
        <a
          href="https://en.wikipedia.org/wiki/Elo_rating_system"
          rel="noopener noreferrer"
          target="_blank"
        >
          Elo
        </a>{" "}
        rating system, ratings change based on the expected result given the
        strength of each player. A strong player defeating a weak one will cause
        a small rating change, while a weak player defeating a strong opponent
        will cause a bigger change.
      </p>
      <p className="hero-copy">
        Let's apply it to over 40,000 college football games dating back to 1869!
      </p>
      <div className="elo-specs">
        <div className="elo-spec-item">
          <span className="elo-spec-label">Initial Rating</span>
          <span className="elo-spec-value">
            Every team starts at 1000 on their first appearance.
          </span>
        </div>
        <div className="elo-spec-item">
          <span className="elo-spec-label">K-Factor: 32</span>
          <span className="elo-spec-value">
            Maximum rating gain or loss for a single game is 32.
          </span>
        </div>
        <div className="elo-spec-item">
          <span className="elo-spec-label">Scope</span>
          <span className="elo-spec-value">
            Only games involving current FBS teams are rated.
          </span>
        </div>
      </div>
    </section>
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
      {value === index && <div>{children}</div>}
    </div>
  );
}

const App = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand-link">
            {`<OpenCFB/>`}
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <NavLink to="/rankings" className="nav-link">
              Rankings
            </NavLink>
            <NavLink to="/streaks" className="nav-link">
              Streaks
            </NavLink>
            <NavLink to="/games" className="nav-link">
              Games
            </NavLink>
          </nav>
          <a
            className="github-link"
            aria-label="GitHub"
            href="https://github.com/howardchung/opencfb"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27" />
            </svg>
          </a>
        </div>
      </header>
      <main className="main-container">
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
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Rankings</h1>
                    <p className="page-subtitle">
                      {match.params.year
                        ? `End-of-season Elo standings for ${match.params.year}`
                        : "All-time current FBS Elo standings"}
                    </p>
                  </div>
                  <div className="select-group">
                    <label
                      className="select-label"
                      htmlFor="rankings-year-select"
                    >
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
                </div>
                <Rankings limit={500} year={Number(match.params.year)} />
              </React.Fragment>
            )}
          />
          <Route
            path="/streaks"
            render={() => (
              <>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Streaks</h1>
                    <p className="page-subtitle">
                      Longest active and historical FBS winning streaks
                    </p>
                  </div>
                </div>
                <div className="streaks-grid">
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
