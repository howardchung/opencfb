opencfb
====

Quickstart
====
* Install Go: `curl https://dl.google.com/go/go1.10.linux-amd64.tar.gz | tar -C /usr/local -xz && export PATH=$PATH:/usr/local/go/bin`
* Install Docker: `curl -sSL https://get.docker.com/ | sh`
* Install Dep: `go get github.com/golang/dep && pushd $GOPATH/src/github.com/golang/dep && go install ./... && popd`
* Install dependencies via Dep: `dep ensure`
* `bash scripts/init.sh`: Sets up the database
* `SVC=jhowell go run pkg/*.go`: Fetch data from jhowell and save to CSV file, import data from CSV file and inserts into DB
* `SVC=espn go run pkg/*.go`: Fetches data from ESPN and inserts into DB
* `SVC=api go run pkg/*.go`: Starts the API on the `PORT` environment variable

Features
====
* circles of parity
* all time rankings
* team pages
* all time win streaks
* active win streaks
* margins of victory
* rivalry games
