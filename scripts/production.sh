#!/bin/bash
curl -sSL https://get.docker.com/ | sh
sudo docker run -d --name api --restart=always --net=host --log-opt max-size=1g opencfb/opencfb sh -c "SVC=api go run *.go"
sudo docker run -d --name espn --restart=always --net=host --log-opt max-size=1g opencfb/opencfb sh -c "SVC=espn go run *.go"
