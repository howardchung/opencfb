# opencfb

An open source project for exploring American college football data.

# Quickstart

- `npm install`
- `npm start`: Runs the React app
- This project uses sql.js-httpvfs to fetch data from a statically hosted SQLite DB
- This allows it to be deployed as a static site
- We use GitHub Actions to rebuild and update daily using the Go and Node.js ingestion/processing services

# Data Ingestion

- Install Go (this is needed to build the data ingestion workers)
- Run the script that triggers data ingestion, computes ratings, streaks, and other data: `npm run fetch`

# Tech

- React
- Node.js
- TypeScript
- Golang
- SQLite
