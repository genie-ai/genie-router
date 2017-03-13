const Promise = require('bluebird')
const request = require('request-promise')

let accessToken = null
let endpoint = null

function start (config) {
  return new Promise(function (resolve, reject) {
    if (!config.accessToken) {
      reject(new Error('No Gladys accessToken provided.'))
    } else if (!config.endpoint) {
      reject(new Error('No endpoint attribute provided.'))
    } // else if (!config.endpoint.substring(config.endpoint.length - 1, config.endpoint.length) !== '/') {
    //  reject(new Error('Endpoint does not end with a /.'))
    // }

    endpoint = config.endpoint
    accessToken = config.accessToken

    resolve({process: process})
  })
}

function process (message) {
  let options = {
    uri: endpoint + 'brain/classify?token=' + accessToken + '&q=' + encodeURIComponent(message.input)

  }
  console.log(options)

  return request(options)
    .then(function (response) {
      console.log('Gladys responded with', response)
      let outputMessage = {output: getRandomConfirmation()}
      return outputMessage
    })
    .catch(function (e) {
      console.log('Retrieving data from Gladys failed')
      throw e
    })
}

/**
 * The Gladys brain classify function does not return any message to speak.
 * So this function returns a random confirmation text to inform the user.
 */
function getRandomConfirmation () {
  let messages = [
    'Ok',
    'Message sent',
    'Gladys accepted the message',
    'Confirmed',
    'Sure!'
  ]

  return messages[Math.floor(Math.random() * messages.length)]
}

module.exports = {start: start}
