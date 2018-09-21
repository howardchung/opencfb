opencfb
====

Quickstart
====
* Install Go: `sudo rm -rf /opt/go && curl https://dl.google.com/go/go1.11.linux-amd64.tar.gz | sudo tar -C /opt -xz`
* Put the go binary in the PATH: `export PATH=$PATH:/opt/go/bin`
* Build: `go build`
* Clone the data from the data repo: `git clone https://github.com/howardchung/opencfb-data`
* Alternatively, run the ingestion workers yourself:
  * Fetch data from jhowell and save to CSV file, import data from CSV file and insert into DB, mapping teams to ESPN teams: `SVC=jhowell go run *.go`
  * Fetch data from ESPN and insert into DB: `SVC=espn go run *.go`
* Start the API on the `PORT` environment variable: `SVC=api go run *.go`
* The API serves a [GraphQL](https://github.com/graphql) server, you can run queries against it using the graphiql interface at `/`
* For live reloading of the web server:
  * `curl -sSL https://github.com/cortesi/modd/releases/download/v0.7/modd-0.7-linux64.tgz | tar zxv --strip-components 1`
  * `./modd`
* Configure the application with a `.env` file in the root of the repo

Building a Docker container
====
* `docker build . -t opencfb/opencfb`

Features
====
* circles of parity
* all time rankings
* team pages
* all time win streaks
* active win streaks
* margins of victory
* rivalry games
