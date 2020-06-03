#!/bin/bash
cd opencfb-data
git add opencfb.sqlite
git commit -m "Update database" --author "Auto Updater <>"
git push origin master -f