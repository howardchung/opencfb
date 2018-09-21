FROM golang:alpine AS builder
RUN apk add git gcc g++ make
ADD . /build
WORKDIR /build
RUN go build
CMD ["./opencfb"]

# This attempts to copy the binary into a bare image, but fails with CGO enabled
# FROM golang:alpine as builder
# RUN apk add git
# RUN mkdir /build 
# ADD . /build/
# WORKDIR /build 
# RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o main .
# FROM scratch
# COPY --from=builder /build/main /app/
# WORKDIR /app
# CMD ["./main"]