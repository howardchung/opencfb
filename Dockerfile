FROM golang:1.10-stretch
RUN apt-get install git
# Download and install the latest release of dep
ADD https://github.com/golang/dep/releases/download/v0.5.0/dep-linux-amd64 /usr/bin/dep
RUN chmod +x /usr/bin/dep
# Copy the code from the host and compile it
WORKDIR $GOPATH/src/app
COPY Gopkg.toml Gopkg.lock ./
RUN dep ensure --vendor-only
COPY . ./
# run
CMD ["go", "run", "*.go"]
