#!/usr/bin/env node

const commander = require('commander'),
inquirer = require('inquirer'),
fs = require("fs"),
JiraClient = require('jira-connector');

var config = {}, questions = {}, issues = [], jira;
try {
  let file = fs.readFileSync(`${__dirname}/config-questions.json`);
  questions = JSON.parse(file);
  console.log('loaded questions');
  file = fs.readFileSync(`${__dirname}/config.json`);
  config = JSON.parse(file);
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
      createWorklog();
      //TODO: verify no actual logs exists for this day
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
  //TODO: Ask when to overwrite or append this configuration
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
  //TODO: Enable deleting issues from the current configuration
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
      if(issue){
        console.log(`Issue ${key.key} found: ${issue.fields.summary}`);
        inquirer.prompt([questions.issues.issueTime, questions.issues.issueLog]).then(function(answers){
          //TODO: Validate time format
          let issue = {
            'key': key.key.toUpperCase(),
            'time': answers.time,
            'log': answers.log
          };
          issues.push(issue);
          inquirer.prompt(questions.issues.keyMenu).then(keyMenuHandler);
        });
      }else if(!error.errorMessages){
        console.log('Server or credentials error. I suggest you to config authentication again.');
        console.log(error);
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
  var configContent = {};
  inquirer.prompt(questions.auth).then(function (answers) {
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

function createWorklog(){
  config.issues.forEach(function (issue) {
    let worklog = {
      comment: issue.log,
      timeSpentSeconds: jiraTimetoSeconds(issue.time)
    };
    jira.issue.addWorkLog({
        issueKey: issue.key,
        worklog: worklog
    }, function(error, response) {
        if(!error){
          console.log(`Uploading worklog ${issue.key}: ${issue.log} (${issue.time})`);
          console.log(response);
        }else{
          console.log(`Could not log work for ${issue.key}`);
          console.log(`Error details: ${error}`);
        }
    });
  });
}

function jiraTimetoSeconds(time){
  let tokens = time.split(' ');
  let seconds = 0;
  tokens.forEach(function(token){
    let value = parseFloat(token.match(/[\d.]+/).toString());
    let scope = token.match(/[a-zA-Z]+/).toString().toLowerCase();
    let int = parseInt(value);// integer part of the number
    let decimal = parseInt((value % 1).toFixed(2).substring(2)); // decimal part of the number, if exists
    let fraction = 0, //decimal part of the number in seconds
        factor = 1; //conversion factor of the desired unit to seconds.
    switch (scope) {
      case 'm':
        factor = 60; //seconds in a minute
        break;
      case 'h':
        factor = 3600; //seconds in an hour
        break;
      case 'd':
        factor = 86400; //seconds in a day
        break;
      case 'w':
        factor = 604800; //seconds in a week
        break;
      default:
        factor = 1;
    }
    if(decimal !== 0){
      fraction = ( decimal * factor / 100);
    }
    seconds += (int * factor) + fraction;
  });
  return seconds;
}
