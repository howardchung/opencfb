#!/bin/bash
cd opencfb-data
git add opencfb.sqlite
git commit -m "update database"
git push origin master -f