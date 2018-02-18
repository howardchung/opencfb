package shared

import (
	"time"
)

type Scoreboard struct {
	Leagues []struct {
		Calendar []struct {
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
}

type Team struct {
	Id             int64
	DisplayName    string
	Abbreviation   string
	Color          string
	AlternateColor string
	Logo           string
	Rating         int64
	ConferenceId   int64
}

type GameTeam struct {
	GameId int64
	TeamId int64
	Score  int64
	Field  string
	Result string
}
