var Promise = require('bluebird')

function start (config) {
  return new Promise(function (resolve, reject) {
    resolve({process: process})
  })
}

function process (message) {
  return new Promise(function (resolve, reject) {
    resolve({output: 'ECHO ' + message.input})
  })
}

module.exports = {start: start}
