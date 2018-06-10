opencfb
====

Quickstart
====
* Install Go: `curl https://dl.google.com/go/go1.10.linux-amd64.tar.gz | sudo tar -C /opt -xz && export GOPATH=$HOME && export PATH=$PATH:/opt/go/bin`
* Install Dep: `curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh`
* Install dependencies via Dep: `$GOPATH/bin/dep ensure`
* Clone the data from the data repo: `git clone https://github.com/howardchung/opencfb-data`
* Alternatively, run the ingestion workers yourself:
  * Fetch data from jhowell and save to CSV file, import data from CSV file and insert into DB, mapping teams to ESPN teams: `SVC=jhowell go run *.go`
  * Fetch data from ESPN and insert into DB: `SVC=espn go run *.go`
* Start the API on the `PORT` environment variable: `SVC=api go run *.go`
  * For live reloading of the webserver:
    * Install modd: `go get github.com/cortesi/modd/cmd/modd`
    * Run the API: `modd`
    * The API serves a [GraphQL](https://github.com/graphql) server, you can run queries against it using the graphiql interface at `/`
* Configure the application with a `.env` file in the root of the repo

Features
====
* circles of parity
* all time rankings
* team pages
* all time win streaks
* active win streaks
* margins of victory
* rivalry games
