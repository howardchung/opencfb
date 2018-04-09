#!/bin/bash
git clone --depth 0 https://$1@github.com/howardchung/opencfb-data.git
cd opencfb-data
git pull
