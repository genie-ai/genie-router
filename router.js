'use strict'

const getFromObject = require('./lib/utils/getFromObject')
const SuperPlug = require('superplug')
const Promise = require('bluebird')
const http = require('./lib/http')
const BrainSelector = require('./lib/brainSelector')
const debug = require('debug')('genie-router::router')

class Router {
  constructor (config) {
    this.config = config
    this.plugins = {}
    this.clients = {}
    this.httpEnabled = false
    this.pluginLoader = new SuperPlug({
      location: __dirname,
      packageProperty: 'genieRouterPlugin'
    })
    this.brainSelector = new BrainSelector(config.defaultBrain)
  }

  start () {
    return this._loadPlugins()
      .then(this._startHttp.bind(this))
      .then(this._startPlugins.bind(this))
      .catch((err) => {
        console.error('Error initializing', err)
      })
  }

  _loadPlugins () {
    return this.pluginLoader.getPlugins()
      .then((foundPlugins) => {
        let promises = []
        for (var iter in foundPlugins) {
          let foundPlugin = foundPlugins[iter]
          // Only load the plugins which have a configuration
          if (getFromObject(this.config, 'plugins.' + foundPlugin.getName()) !== undefined) {
            const p = foundPlugin.getPlugin()
            p.then((pluginModule) => {
              this.plugins[foundPlugin.getName()] = pluginModule
            })
            promises.push(p)
          }
        }
        return Promise.all(promises)
      })
  }

  _startPlugins () {
    const plugins = Object.keys(this.plugins)
    let promises = []
    let brains = {}
    plugins.forEach((pluginName) => {
      const config = getFromObject(this.config, 'plugins.' + pluginName)
      const plugin = this.plugins[pluginName]
      if (plugin.brain) {
        promises.push(
          this.plugins[pluginName].brain.start(config)
          .then((brain) => {
            brains[pluginName] = brain
          })
        )
      }

      if (plugin.client) {
        // thing here is that the startObject needs the speak function, which
        // is only available after the start function has been invoked. Needed
        // some trickery to make it work.
        const startObject = this._getClientStartObjects(pluginName, plugin)
        promises.push(
          this.plugins[pluginName].client.start(
            config,
            startObject
          ).then((client) => {
            this.clients[pluginName] = client
          })
        )
      }
      if (plugin.brainSelector) {
        promises.push(
          this.plugins[pluginName].brainSelector.start(config)
          .then((brainSelector) => {
            this.brainSelector.use(pluginName, brainSelector)
          })
        )
      }
      if (plugin.http) {
        if (!this.httpEnabled) {
          console.log('HTTP is not enabled, Ignoring http component of plugin', pluginName)
        } else {
          promises.push(
            http()
              .then((app) => {
                return this.plugins[pluginName].http.start(config, app)
              })
          )
        }
      }
    })
    return Promise.all(promises)
      .then(() => {
        this.brainSelector.setBrains(brains)
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
            that.clients[clientPluginName].speak(message)
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
