# Jira Worklog Reporter

Node console application to help you log time in jira issues.

## Prerequisites
You will need node properly installed on your computer.

## Installation
`npm install -g jira-worklog-reporter`

## Configuration
* Run `jira-worklog-reporter` to start interactive configuration of auth and issues to log.
* Run the command again when you want to submit the worklog you configured that day

## Motivation
I use jira with multiple clients, and most of the time i need to log to the same issues, so, created this project, that uploads the worklog for me daily.

I created a cron job in my machine that runs this command at the end of the day, and... no more administrative job for me! :tada:

If that's your case, this may come in handy.
