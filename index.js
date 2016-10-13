#!/usr/bin/env node

const commander = require('commander'),
inquirer = require('inquirer'),
fs = require("fs"),
JiraClient = require('jira-connector');

var config = {}, questions = {}, issues = [], jira;
try {
  let file = fs.readFileSync("config.json");
  config = JSON.parse(file);
  file = fs.readFileSync("config-questions.json");
  questions = JSON.parse(file);
  console.log('Configuration file found');
  try{
    jira = new JiraClient({
      host: config.host,
      protocol: config.protocol,
      apiVersion: config.apiVersion,
      basic_auth: {
        base64: config.authToken
      }
    });
    //TODO: Verify that the credentials works
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

function viewIssues(){
  let total = issues.length;
  console.log();
  issues.forEach(function (issue) {
    console.log(`${issue.key}: ${issue.log} (${issue.time})`);
  });
  let plural = (total == 1) ? 'log' : 'logs';
  console.log(`A total of ${total} ${plural} per day`);
  console.log();
}

function saveIssues(){
  config.issues = issues;
  let buffer = new Buffer(JSON.stringify(config));
  fs.writeFileSync(`${__dirname}/config.json`, buffer, {'flag': 'w'}, (error) => {
    if (error){
      console.log(`Cloud not save configuration file. ${error.message}`);
      throw error;
    } else{
      console.log('Worklog configuration saved');
    }
  });
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
  console.log(`Validating issue ${key.key}. Please wait.`);
  //TODO: put some kind of activity indicator?
  try{
    jira.issue.getIssue({
      issueKey: key.key
    }, function(error, issue) {
      if(!error){
        console.log(`Issue ${key.key} found: ${issue.fields.summary}`);
        inquirer.prompt([questions.issues.issueTime, questions.issues.issueLog]).then(function(answers){
          let issue = {
            'key': key.key.toUpperCase(),
            'time': answers.time,
            'log': answers.log
          };
          issues.push(issue);
          inquirer.prompt(questions.issues.keyMenu).then(keyMenuHandler);
        });
      }else{
        console.log(`Error: ${error.errorMessages}`);
        inquirer.prompt(questions.issues.issueKey).then(askForIssueKey);
      }
    });
  }catch(error){
    console.log(error);
  }
}

function keyMenuHandler(answer){
  switch (answer.keyMenuOption) {
    case 'more':
      inquirer.prompt(questions.issues.mainMenu).then(mainMenuHandler);
      break;
    case 'view':
      viewIssues();
      inquirer.prompt(questions.issues.keyMenu).then(keyMenuHandler);
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
