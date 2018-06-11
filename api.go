package main

import (
	"compress/gzip"
	"encoding/json"
	"github.com/graphql-go/graphql"
	"github.com/jmoiron/sqlx"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"opencfb/shared"
	"os"
	"strconv"
	"strings"
	"time"
)

type RequestOptions struct {
	Query         string                 `json:"query" url:"query" schema:"query"`
	Variables     map[string]interface{} `json:"variables" url:"variables" schema:"variables"`
	OperationName string                 `json:"operationName" url:"operationName" schema:"operationName"`
}

var teamType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Team",
	Fields: graphql.Fields{
		"id": &graphql.Field{
			Type:        graphql.String,
			Description: "The ID of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return strconv.FormatInt(team.Id, 10), nil
				}
				return nil, nil
			},
		},
		"displayName": &graphql.Field{
			Type:        graphql.String,
			Description: "The display name of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.DisplayName, nil
				}
				return nil, nil
			},
		},
		"logo": &graphql.Field{
			Type:        graphql.String,
			Description: "The logo URL of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Logo, nil
				}
				return nil, nil
			},
		},
		"color": &graphql.Field{
			Type:        graphql.String,
			Description: "The color of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Color, nil
				}
				return nil, nil
			},
		},
		"field": &graphql.Field{
			Type:        graphql.String,
			Description: "Whether the team was home/away/neutral",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Field, nil
				}
				return nil, nil
			},
		},
		"score": &graphql.Field{
			Type:        graphql.String,
			Description: "The score of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Score, nil
				}
				return nil, nil
			},
		},
		"result": &graphql.Field{
			Type:        graphql.String,
			Description: "The result of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Result, nil
				}
				return nil, nil
			},
		},
		"wins": &graphql.Field{
			Type:        graphql.String,
			Description: "The wins of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Wins, nil
				}
				return nil, nil
			},
		},
		"losses": &graphql.Field{
			Type:        graphql.String,
			Description: "The lossesof the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Losses, nil
				}
				return nil, nil
			},
		},
		"ties": &graphql.Field{
			Type:        graphql.String,
			Description: "The ties of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Ties, nil
				}
				return nil, nil
			},
		},
	},
})

var gameType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Game",
	Fields: graphql.Fields{
		"id": &graphql.Field{
			Type:        graphql.String,
			Description: "The ID of the game.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if game, ok := p.Source.(shared.Game); ok == true {
					return strconv.FormatInt(game.Id, 10), nil
				}
				return nil, nil
			},
		},
		"state": &graphql.Field{
			Type:        graphql.String,
			Description: "The state of the game.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if game, ok := p.Source.(shared.Game); ok == true {
					return game.State, nil
				}
				return nil, nil
			},
		},
		"date": &graphql.Field{
			Type:        graphql.String,
			Description: "The date of the game.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if game, ok := p.Source.(shared.Game); ok == true {
					return game.Date.Format(time.RFC3339), nil
				}
				return nil, nil
			},
		},
		"teams": &graphql.Field{
			Type:        graphql.NewList(teamType),
			Description: "The teams in this game.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if game, ok := p.Source.(shared.Game); ok == true {
					return game.Teams, nil
				}
				return nil, nil
			},
		},
	},
})

var queryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Query",
	Fields: graphql.Fields{
		"team": &graphql.Field{
			Type: graphql.NewList(teamType),
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Description: "The ID of the team.",
					Type:        graphql.String,
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				var id int64 = 0
				if p.Args["id"] != nil {
					id, _ = strconv.ParseInt(p.Args["id"].(string), 10, 64)
				}
				return shared.GetTeams(db, id), nil
			},
		},
		"game": &graphql.Field{
			Type: graphql.NewList(gameType),
			Args: graphql.FieldConfigArgument{
				"teamId": &graphql.ArgumentConfig{
					Description: "The ID of the team.",
					Type:        graphql.String,
				},
				"season": &graphql.ArgumentConfig{
					Description: "The year of the season.",
					Type:        graphql.Int,
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				var teamId int64 = 0
				var season int = 0
				if p.Args["teamId"] != nil {
					teamId, _ = strconv.ParseInt(p.Args["teamId"].(string), 10, 64)
				}
				if p.Args["season"] != nil {
					season = p.Args["season"].(int)
				}
				return shared.GetGames(db, teamId, season), nil
			},
		},
		// TODO rankings
		// TODO rivalries
		// TODO circles
		// TODO winstreaks
		// TODO margins of victory
	},
})

type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func makeGzipHandler(fn http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			fn(w, r)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		gzr := gzipResponseWriter{Writer: gz, ResponseWriter: w}
		fn(gzr, r)
	}
}

func handler(schema graphql.Schema) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// log.Println(r)
		w.Header().Set("Access-Control-Allow-Methods", "*")
		w.Header().Set("Access-Control-Allow-Headers", "*")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		var opts RequestOptions
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			log.Fatal(err)
		}
		err = json.Unmarshal(body, &opts)
		result := graphql.Do(graphql.Params{
			Schema:         schema,
			RequestString:  opts.Query,
			VariableValues: opts.Variables,
			OperationName:  opts.OperationName,
		})
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

var db *sqlx.DB

func api() {
	db = shared.InitDatabase()

	// Serve a static graphiql
	fs := http.FileServer(http.Dir("public"))
	http.Handle("/", fs)

	var schema, _ = graphql.NewSchema(graphql.SchemaConfig{
		Query: queryType,
	})

	// serve a GraphQL endpoint at `/graphql`
	http.Handle("/graphql", makeGzipHandler(handler(schema)))

	port := "3000"
	if os.Getenv("PORT") != "" {
		port = os.Getenv("PORT")
	}
	log.Println("Listening on " + port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
