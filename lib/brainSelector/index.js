const Promise = require('bluebird');
const debug = require('debug')('genie-router:brainSelector')
const getDefaultSelector = require('./default')

/**
 * Class that enables plugins to influence which brains
 * gets selected on input. It is first set up, and when configured
 * an input message can be handled.
 * Before invoking getBrainForInput, all available brains must be set
 * via setBrains().
 */
class BrainSelector
{
  constructor (defaultBrain, brainStickiness) {
    this.selectors = []
    this.lastSelectedBrainsPerClient = {}
    this.defaultBrain = defaultBrain
    this.brainStickiness = brainStickiness // The time a brain selected for a certain client is used as the default
    getDefaultSelector(this.defaultBrain)
      .then((defaultSelector) => {
        this.defaultSelector = defaultSelector
      })
  }

  /**
   * The selector is a function which returns a promise. If the selector
   * selects the brain, it must resolve with an object with at least 1 attribute:
   * brain. If the selector also manipulates the received input message, the altered
   * version of the input should be returned in the input attribute.
   */
  use (label, selector) {
    if (typeof selector !== 'function') {
      throw new Error('Selector is not a function.')
    }
    debug('Adding selector %s', label)
    this.selectors.push(selector)
  }

  /**
   * @param Object brains An object where the key is the name of the plugin, and brain
   * is the function to invoke when the brain is selected.
   * @return Promise
   */
  setBrains (brains) {
    this.brains = brains
  }

  /**
   * @param Object input An object with an attribute 'message' which contains the text input.
   * @return Promise
   */
  async getBrainForInput (input) {
    let promises = []

    this.selectors.forEach((selector) => {
      promises.push(selector(this.brains, input))
    })

    if (promises.length === 0) {
      return this.defaultSelector(this.brains, input)
    }

    try {
      const brain = await Promise.any(promises);
      // Set the lastSelectedBrainsPerClient value for this client
      this.lastSelectedBrainsPerClient[input.plugin] = {time: (new Date()).getTime(), brain: brain}
      return brain
    } catch(err) {
      if (this.lastSelectedBrainsPerClient[input.plugin]) {
        let selectedInfo = this.lastSelectedBrainsPerClient[input.plugin]
        let now = (new Date()).getTime()

        if ((now - selectedInfo.time) / 1000 < this.brainStickiness) {
          selectedInfo.time = (new Date()).getTime()
          // Re-initialize the last selected time for this brain
          this.lastSelectedBrainsPerClient[input.plugin] = selectedInfo
          debug('Selected brain because of its stickiness.')
          return selectedInfo.brain
        }
      }
      debug('Falling back to the default brain selector', err.message)
      return this.defaultSelector(this.brains, input)
    }
  }
}

module.exports = BrainSelector
