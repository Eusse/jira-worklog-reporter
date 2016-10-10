#!/usr/bin/env node

const commander = require('commander'),
inquirer = require('inquirer'),
fs = require("fs"),
JiraClient = require('jira-connector');

var config = {};
try {
  let file = fs.readFileSync("config.json");
  config = JSON.parse(file);
  try{
    var jira = new JiraClient({
      host: config.host,
      basic_auth: {
        base64: config.authToken
      }
    });
    try {
      jira.search.search({
        jql: 'assignee=currentuser()'
      }, function(error, issue) {
        console.log(issue);
      });
    }catch(error){
      console.log('Failed to query for yout issues');
      console.log('Error details: ' + error.message);
    }
  } catch (error){
    console.log('Config file could be corrupted. Run the command again with the --config option.');
    console.log('Error details: ' + error.message);
  }
} catch (e) {
  console.log('No configuration file found. Starting to create one interactively');
  var questionsfile = fs.readFileSync("config-generator.json");
  let config = JSON.parse(questionsfile);
  var configContent = {};
  inquirer.prompt(config.questions).then(function (answers) {
    let authToken = new Buffer(`${answers.user}:${answers.pass}`).toString('base64');
    configContent = {
      'host' : answers.host,
      'authToken': authToken
    };
    let buffer = new Buffer(JSON.stringify(configContent));
    fs.writeFileSync(`${__dirname}/config.json`, buffer, {'flag': 'w+'}, (error) => {
      if (error) throw err;
      console.log('Config file saved');
    });
    console.log('Configuration complete. Run the command again for more options');
  });
}
