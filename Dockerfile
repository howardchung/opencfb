FROM golang:1.10-stretch
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
ADD pkg pkg
# run
CMD ["go", "run", "pkg/api.go"]