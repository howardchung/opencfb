package main

import (
	"encoding/json"
	"github.com/graphql-go/graphql"
	"github.com/jmoiron/sqlx"
	"io/ioutil"
	"log"
	"net/http"
	"opencfb/pkg/shared"
	"os"
	// "strings"
	// "time"
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
			Type:        graphql.Int,
			Description: "The ID of the team.",
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				if team, ok := p.Source.(shared.Team); ok == true {
					return team.Id, nil
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
	},
})

var queryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Query",
	Fields: graphql.Fields{
		"team": &graphql.Field{
			Type: teamType,
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Description: "The ID of the team.",
					Type:        graphql.Int,
				},
			},
			Resolve: func(p graphql.ResolveParams) (interface{}, error) {
				return shared.GetTeam(db, p.Args["id"].(int)), nil
			},
		},
		// TODO game
	},
})

func writeData(w http.ResponseWriter, jData []byte) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.Write(jData)
}

func handler(schema graphql.Schema) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

var db *sqlx.DB

func api() {
	db = shared.InitDatabase()
	//todo compression

	// Serve a static graphiql
	fs := http.FileServer(http.Dir("public"))
	http.Handle("/", fs)

	var schema, _ = graphql.NewSchema(graphql.SchemaConfig{
		Query: queryType,
	})

	// serve a GraphQL endpoint at `/graphql`
	http.Handle("/graphql", handler(schema))

	http.HandleFunc("/teams", func(w http.ResponseWriter, r *http.Request) {
		response := shared.GetTeams(db)
		jData, err := json.Marshal(response)
		if err != nil {
			log.Fatal(err)
		}
		writeData(w, jData)
	})

	http.HandleFunc("/rankings", func(w http.ResponseWriter, r *http.Request) {
		response := shared.GetAllTimeRankings(db)
		jData, err := json.Marshal(response)
		if err != nil {
			log.Fatal(err)
		}
		writeData(w, jData)
	})
	port := "3000"
	if os.Getenv("PORT") != "" {
		port = os.Getenv("PORT")
	}
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
