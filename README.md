opencfb
====

Quickstart
====
* Install Go, Docker
* Install Dep: `go get github.com/golang/dep && pushd $GOPATH/src/github.com/golang/dep && go install ./... && popd`
* Install dependencies via Dep: `dep ensure`
* `bash scripts/init.sh`: Sets up the database
* `go run pkg/espnData.go`: Fetches data from ESPN and inserts into DB
* `go run pkg/jhowellFetcher.go `: Fetch data from jhowell and save to CSV file
* `go run pkg/jhowellData.go`: Import data from CSV file and inserts into DB
* `go run pkg/api.go`: Starts the API on the `PORT` environment variable

circles of parity
all time rankings
team pages
all time win streaks
active win streaks
margins of victory
rivalry games
