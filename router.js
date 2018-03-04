'use strict'

const getFromObject = require('./lib/utils/getFromObject')
const Promise = require('bluebird')
const http = require('./lib/http')
const BrainSelector = require('./lib/brainSelector')
const debug = require('debug')('genie-router::router')
const PluginLoader = require('./lib/plugins/loader.js')
const EventEmitter = require('events')

class Router {
  constructor (config) {
    this.config = config
    this.httpEnabled = false
    this.brainSelector = new BrainSelector(config.defaultBrain, getFromObject(config, 'brainStickiness', 120))
    this.eventEmitter = new EventEmitter()
    this.pluginLoader = new PluginLoader(config, this._getClientStartObjects.bind(this), this.brainSelector, this.eventEmitter)
  }

  start () {
    return this._startHttp()
      .then(() => {
        return this.pluginLoader.setHttpEnabled(this.httpEnabled)
      })
      .then(this.pluginLoader.startPlugins.bind(this.pluginLoader))
      .catch((err) => {
        console.error('Error initializing', err)
      })
  }

  _getClientStartObjects (clientPluginName, plugin) {
    const that = this
    return {
      heard: function (message) {
        that._processHeardInput(
          {
            plugin: clientPluginName,
            message: message
          },
          (message) => {
            // We cannot use this function directly, because the object that.clients[clientPluginName]
            // is not set yet when we create this startObject.
            that.eventEmitter.emit('output.reply', clientPluginName, message)
            that.pluginLoader.getClients()[clientPluginName].speak(message)
          }
        )
      }
    }
  }

  /**
   * Process a received input message.
   * @param Object   input         An object with an attribute message.
   * @param function speakCallback The function to invoke with the reply from the brain.
   */
  _processHeardInput (input, speakCallback) {
    this.eventEmitter.emit('input.heard', input.plugin, input.message)
    return this.brainSelector.getBrainForInput(input)
      .then((selectedInfo) => {
        let brain = selectedInfo.brain
        if (selectedInfo.input) {
          input = selectedInfo.input
        }
        return brain.process(input.message)
      }).then(function (output) {
        var outputClone = JSON.parse(JSON.stringify(output))
        outputClone.metadata = input.message.metadata
        outputClone.sessionId = input.message.sessionId ? input.message.sessionId : null
        outputClone.userId = input.message.userId ? input.message.userId : null
        return speakCallback(outputClone)
      }).catch((err) => {
        debug('Unable to process input %s: %s', JSON.stringify(input), err + '')
      })
  }

  /**
   * Start the HTTP Api, if enabled.
  */
  _startHttp () {
    this.httpEnabled = getFromObject(this.config, 'http.enabled', false)
    if (this.httpEnabled) {
      return http(getFromObject(this.config, 'http'))
    }
    return Promise.resolve()
  }
}

module.exports = Router
