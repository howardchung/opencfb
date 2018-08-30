FROM golang:1.10-stretch
RUN apt-get install git
# install dep
RUN go get github.com/golang/dep
# create a working directory
WORKDIR /go/src/app
# add lockfiles
ADD Gopkg.lock Gopkg.lock
ADD Gopkg.toml Gopkg.toml
# install dependencies
RUN dep ensure
# add source code
ADD . .
# run
CMD ["go", "run", "*.go"]
