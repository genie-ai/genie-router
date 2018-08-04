/**
 * The default brain selector: Sends the message to the defaultBrain.
 */
const debug = require('debug')('genie-router:brainSelector:default')

let defaultBrain = null

async function messageDefaultBrain (brains, message) {
  if (brains[defaultBrain]) {
    debug('Resolving brain resolution to %s', defaultBrain)
    return { brain: brains[defaultBrain] }
  }

  debug('Default brain not found in list of brains.')
  throw new Error('Default brain not found in list of brains');
}

async function getDefaultBrainSelector (configuredDefaultBrain) {
    defaultBrain = configuredDefaultBrain
    return messageDefaultBrain;
}

module.exports = getDefaultBrainSelector
