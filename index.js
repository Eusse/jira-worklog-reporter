#!/usr/bin/env node

const commander = require('commander');
const inquirer = require('inquirer');
const fs = require("fs");

fs.exists('config.json', (exists) => {
  if(exists){
    console.log('Configuration file found. Loading settings.');
    var content = fs.readFileSync("config.json");
    console.log(content);
  }else{
    console.log('No configuration file found. Starting to create one interactively');
    var questionsfile = fs.readFileSync("config-generator.json");
    let config = JSON.parse(questionsfile);
    inquirer.prompt(config.questions).then(function (answers) {
      let authToken = new Buffer(`${answers.user}:${answers.pass}`).toString('base64');
      console.log(authToken);
    });
  }
});
