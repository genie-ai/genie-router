const Promise = require('bluebird')
const uuid = require('uuid')

const Wit = require('node-wit').Wit
let witClient = null
const sessionId = uuid.v1()
let context = {}
let outputMessage = {}

const actions = {
  send (request, response) {
    outputMessage = {output: response.text, replies: response.quickreplies}
  }
}

function start (config) {
  return new Promise(function (resolve, reject) {
    if (!config.accessToken) {
      reject(new Error('No Wit.ai accessToken provided.'))
    }

    try {
      witClient = new Wit({accessToken: config.accessToken, actions: actions})
    } catch (e) {
      reject(e)
    }

    resolve({process: process})
  })
}

function process (message) {
  return witClient.runActions(
    sessionId,
    message.input,
    context
  ).then((witContext) => {
    context = witContext // update the context
    return outputMessage
  })
  .catch((err) => {
    console.error('Oops! Got an error from Wit: ', err.stack || err)
  })
}

module.exports = {start: start}
