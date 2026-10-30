export interface CalendarEntry {
  value: string;
}

export interface CalendarSeason {
  label: string;
  value: string;
  entries: CalendarEntry[];
}

export interface ScoreboardCompetitorTeam {
  abbreviation: string;
  location: string;
  displayName: string;
  color: string;
  alternateColor: string;
  logo: string;
  conferenceId: string;
}

export interface ScoreboardCompetitor {
  id: string;
  homeAway: string;
  score: string;
  winner?: boolean;
  team: ScoreboardCompetitorTeam;
}

export interface ScoreboardCompetition {
  attendance: number;
  neutralSite: boolean;
  competitors: ScoreboardCompetitor[];
}

export interface ScoreboardEvent {
  id: string;
  date: string;
  status: {
    type: {
      name: string;
    };
  };
  competitions: ScoreboardCompetition[];
}

export interface ScoreboardLeague {
  calendar?: CalendarSeason[];
}

export interface Scoreboard {
  leagues?: ScoreboardLeague[];
  events?: ScoreboardEvent[];
}

export interface Game {
  id: number;
  attendance?: number;
  state?: string;
  date: Date | string;
  teams?: Team[];
  source?: string;
}

export interface Team {
  id: number;
  displayName: string;
  abbreviation?: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  rating?: number;
  conferenceId?: number;
  field?: string;
  score?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  result?: string;
}

export interface GameTeam {
  gameId: number;
  teamId: number;
  score: number;
  field: string;
  result: string;
  rating?: number | null;
}

export interface Conference {
  id: string | number;
  name?: string;
  displayName?: string;
  division?: string;
}

export interface Conferences {
  children?: Conference[];
}

export interface RankedTeam {
  teamId: number;
  rating: number;
  year: number;
  rank: number;
}

export interface RatingGame {
  id: number;
  date: string;
  team1: number;
  team2: number;
  team1result: string;
}

export interface EligibleTeam {
  id: number;
}

export interface StreakGame {
  date: string;
  result: string;
  teamid: number;
}
