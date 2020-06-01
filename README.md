# opencfb

An open source project for exploring American college football data.

# Quickstart

- `npm run server`: The API is implemented using Node.js. There is a semi-working one in Go.
- The API serves a [GraphQL](https://github.com/graphql) server. You can run queries against it using the graphiql interface at `/`
- Configure the application with a `.env` file in the root of the server directory

# Data Ingestion

- Install Go
- Go to the `golang` directory
- This project uses go modules, added in Go 1.11. If the project exists within the GOPATH, it may not work properly. Changing the GOPATH can resolve this: `export GOPATH=/home/ubuntu`
- Running the ingestion workers yourself:
  - `SVC=jhowell go run *.go`: Fetch data from jhowell and save to CSV file, import data from CSV file and insert into DB, mapping teams to ESPN teams
  - `SVC=espn go run *.go`: Fetch data from ESPN and insert into DB
- Build a binary for the JS application to use: `go build`

# Getting preloaded data

- `git clone https://github.com/howardchung/opencfb-data`

# Auto-syncing data to GitHub

- Setting `GH_ACCESS_TOKEN` and `ENABLE_GH_DB_SYNC` allows the application to pull and write data back to a GitHub repo.

# Tech

- React
- Node.js
- TypeScript
- Golang
- SQLite
