#!/bin/bash
cd opencfb-data
git add opencfb.sqlite
git -c user.name='Auto Updater' -c user.email='auto@opencfb.com' commit -m "Update database"
git push origin master -f