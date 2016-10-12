#!/usr/bin/env node

const commander = require('commander'),
inquirer = require('inquirer'),
fs = require("fs"),
JiraClient = require('jira-connector');

var config = {}, questions = {}, issues = [];
try {
  let file = fs.readFileSync("config.json");
  config = JSON.parse(file);
  file = fs.readFileSync("config-questions.json");
  questions = JSON.parse(file);
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
      inquirer.prompt(questions.issues.mainMenu).then(mainMenuHandler);
    }
  } catch (error){
    console.log('Config file could be corrupted. Run the command again with the --config option.');
    console.log('Error details: ' + error.message);
  }
} catch (e) {
  console.log('No configuration file found. Starting to create one interactively');
  configureAuthentication();
}

function saveIssues(){
  console.log(issues);
  console.log('Finished asking');
}

function mainMenuHandler(answer) {
  switch (answer.mainMenuOption) {
    case 'key':
      inquirer.prompt(questions.issues.issueKey).then(askForIssueKey);
    break;
    case 'cancel':
      saveIssues();
    break;
    default:
      inquirer.prompt(questions.issues.mainMenu).then(mainMenuHandler);
  }
}

function askForIssueKey(key){
  //TODO: validate issue existance
  inquirer.prompt(questions.issues.issueTime).then(function(time){
    let issue = {
      'key': key.key,
      'time': time.time
    };
    issues.push(issue);
    inquirer.prompt(questions.issues.keyMenu).then(keyMenuHandler);
  });
}

function keyMenuHandler(answer){
  switch (answer.keyMenuOption) {
    case 'more':
      inquirer.prompt(questions.issues.mainMenu).then(mainMenuHandler);
      break;
    case 'finish':
      saveIssues();
      break;
    default:
      inquirer.prompt(questions.issues.keyMenu).then(keyMenuHandler);
  }
}

function configureAuthentication(){
  let configQuestions = fs.readFileSync("config-questions.json");
  let questions = JSON.parse(configQuestions).auth;
  var configContent = {};
  inquirer.prompt(questions).then(function (answers) {
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
      if (error){
        console.log(`Cloud not save configuration file. ${error.message}`);
        throw error;
      } else{
        console.log('Authentication config saved');
      }
    });
  });
}
