package main

import (
	"time"
)

type Scoreboard struct {
	Leagues []struct {
		Calendar []struct {
			Label   string `json:"label"`
			Value   string `json:"value"`
			Entries []struct {
				Value string `json:"value"`
			} `json:"entries"`
		} `json:"calendar"`
	} `json:"leagues"`
	Events []struct {
		Id     string `json:"id"`
		Date   string `json:"date"`
		Status struct {
			Type struct {
				Name string `json:"name"`
			} `json:"type"`
		} `json:"status"`
		Competitions []struct {
			Attendance  int64
			NeutralSite bool
			Competitors []struct {
				Id       string
				HomeAway string
				Score    string
				Winner   bool
				Team     struct {
					Abbreviation   string
					Location       string
					DisplayName    string
					Color          string
					AlternateColor string
					Logo           string
					ConferenceId   string
				}
			}
		} `json:"competitions"`
	} `json:"events"`
}

type Game struct {
	Id         int64
	Attendance int64
	State      string
	Date       time.Time
	Teams      []Team
	Source     string
}

type Team struct {
	Id             int64
	DisplayName    string
	Abbreviation   string
	Color          string
	AlternateColor string
	Logo           string
	Rating         float64
	ConferenceId   int64
	Field          string
	Score          int64
	Wins           int64
	Losses         int64
	Ties           int64
	Result         string
}

type GameTeam struct {
	GameId int64
	TeamId int64
	Score  int64
	Field  string
	Result string
}

type Conferences struct {
	Children []Conference
}

type Conference struct {
	Id          string `json:"id"`
	DisplayName string `json:"name"`
	Division    string
}

type RankedTeam struct {
	TeamId int64
	Rating float64
	Year   int
	Rank   int
}

type RatingGame struct {
	Id          int64  `db:"id"`
	Date        string `db:"date"`
	Team1       int64  `db:"team1"`
	Team2       int64  `db:"team2"`
	Team1Result string `db:"team1result"`
}

type EligibleTeam struct {
	Id int64 `db:"id"`
}

type StreakGame struct {
	Date   string `db:"date"`
	Result string `db:"result"`
	TeamId int64  `db:"teamid"`
}
