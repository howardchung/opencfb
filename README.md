# opencfb

An open source project for exploring American college football data.

# Quickstart

- `npm install`
- `npm run dev`: Runs the React app
- This project uses sql.js-httpvfs to fetch data from a statically hosted SQLite DB
- This allows it to be deployed as a static site
- GitHub Actions occasionally update the SQLite DB in the background using a combination of the Go and Node.js ingestion/processing services

# Data Ingestion

- Install Go
- Go to the `golang` directory
- Running the ingestion workers yourself:
  - `SVC=jhowell go run *.go`: Fetch data from jhowell and save to CSV file, import data from CSV file and insert into DB, mapping teams to ESPN teams
  - `SVC=espn go run *.go`: Fetch data from ESPN and insert into DB
- Go back out to root directory and build/run the TypeScript service that computes ratings, streaks, and other data: `npm run buildServer && npm run server`

# Database

- The application expects a SQLite database `opencfb.sqlite` in the public directory

# Tech

- React
- Node.js
- TypeScript
- Golang
- SQLite
