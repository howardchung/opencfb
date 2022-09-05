# opencfb

An open source project for exploring American college football data.

# Quickstart

- `npm install`
- `npm start`: Runs the React app
- This project uses sql.js-httpvfs to fetch data from a statically hosted SQLite DB
- This allows it to be deployed as a static site
- GitHub Actions occasionally update the SQLite DB in the background using a combination of the Go and Node.js ingestion/processing services

# Data Ingestion

- Install Go
- Go to the `golang` directory
- This project uses go modules, added in Go 1.11. If the project exists within the GOPATH, it may not work properly. Changing the GOPATH can resolve this: `export GOPATH=/home/ubuntu`
- Running the ingestion workers yourself:
  - `DB_PATH=<path_to_sqlite> SVC=jhowell go run *.go`: Fetch data from jhowell and save to CSV file, import data from CSV file and insert into DB, mapping teams to ESPN teams
  - `DB_PATH=<path_to_sqlite> SVC=espn go run *.go`: Fetch data from ESPN and insert into DB
- Build a binary for the JS application to use: `go build`

# Database

- The application expects a SQLite database `opencfb.sqlite` in the public directory

# Tech

- React
- Node.js
- TypeScript
- Golang
- SQLite
