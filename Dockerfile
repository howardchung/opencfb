FROM golang:1.10-stretch
RUN apt-get install git
# Download and install the latest release of dep
ADD https://github.com/golang/dep/releases/download/v0.5.0/dep-linux-amd64 /usr/bin/dep
RUN chmod +x /usr/bin/dep
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
