FROM golang:1.11 AS builder

WORKDIR .
RUN go build

CMD ["./opencfb"]

# FROM golang:alpine as builder
# RUN mkdir /build 
# ADD . /build/
# WORKDIR /build 
# RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o main .
# FROM scratch
# COPY --from=builder /build/main /app/
# WORKDIR /app
# CMD ["./main"]