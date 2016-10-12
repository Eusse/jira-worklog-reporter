#!/usr/bin/env node

const commander = require('commander'),
inquirer = require('inquirer'),
fs = require("fs"),
JiraClient = require('jira-connector');

var config = {}, issues, optionsQuestion;
try {
  let file = fs.readFileSync("config.json");
  config = JSON.parse(file);
  console.log('Configuration file found');
  try{
    var jira = new JiraClient({
      host: config.host,
      protocol: config.protocol,
      path_prefix: config.path_prefix,
      port: config.port,
      apiVersion: config.apiVersion,
      basic_auth: {
        base64: config.authToken
      }
    });
    console.log('Loaded authentication from configuration file');
    if(config.issues){
      console.log('Posting time to your issues');
    }else{
      console.log('No issues configured. Starting interactive configuration');
      var issuesQuestions = fs.readFileSync("config-generator.json");
      optionsQuestion = JSON.parse(issuesQuestions).issues.options;
      inquirer.prompt(optionsQuestion).then(askOrSaveIssues);
    }
  } catch (error){
    console.log('Config file could be corrupted. Run the command again with the --config option.');
    console.log('Error details: ' + error.message);
  }
} catch (e) {
  console.log('No configuration file found. Starting to create one interactively');
  var authQuestions = fs.readFileSync("config-generator.json");
  let config = JSON.parse(authQuestions);
  var configContent = {};
  inquirer.prompt(config.auth).then(function (answers) {
    let authToken = new Buffer(`${answers.user}:${answers.pass}`).toString('base64');
    configContent = {
      'host' : answers.host,
      'protocol': answers.protocol,
      'port': answers.port,
      'path_prefix': answers.prefix,
      'apiVersion': answers.version,
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


function saveIssues(){
  console.log('Finished asking');
}

function askOrSaveIssues(answer) {
  if (answer.option == 'cancel') {
    saveIssues();
    return;
  }else{
    inquirer.prompt(optionsQuestion).then(askOrSaveIssues);
  }
}
