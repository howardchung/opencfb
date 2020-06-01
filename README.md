# opencfb

An open source project for exploring American college football data.

# Quickstart

- `npm run server`: The API is implemented using Node.js. There is a semi-working one in Go.
- The API serves a [GraphQL](https://github.com/graphql) server, you can run queries against it using the graphiql interface at `/`
- Configure the application with a `.env` file in the root of the server directory

# Data Ingestion

- Install Go
- Go to the `golang` directory
- This project uses go modules, added in Go 1.11. If the project exists within the GOPATH, it may not work properly. Changing the GOPATH can resolve this: `export GOPATH=/home/ubuntu`
- Running the ingestion workers yourself:
  - `SVC=jhowell go run *.go`: Fetch data from jhowell and save to CSV file, import data from CSV file and insert into DB, mapping teams to ESPN teams
  - `SVC=espn go run *.go`: Fetch data from ESPN and insert into DB
- Build a binary: `go build`

# Getting preloaded data

- `git submodule update --init --recursive`

# Tech

- React
- Node.js
- TypeScript
- Golang
- SQLite
