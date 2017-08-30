/**
 * The default brain selector: Sends the message to the defaultBrain.
 */
const debug = require('debug')('genie-router:brainSelector:default')

let defaultBrain = null

function messageDefaultBrain (brains, message) {
  return new Promise(function (resolve, reject) {
    if (brains[defaultBrain]) {
      debug('Resolving brain resolution to %s', defaultBrain)
      resolve({brain: brains[defaultBrain]})
      return
    }
    debug('Default brain not found in list of brains.')
    reject(new Error('Default brain not found in list of brains'))
  })
}

function getDefaultBrainSelector (configuredDefaultBrain) {
  return new Promise(function (resolve, reject) {
    defaultBrain = configuredDefaultBrain
    resolve(messageDefaultBrain)
  })
}

module.exports = getDefaultBrainSelector
