'use strict'

const getFromObject = require('./lib/utils/getFromObject')
const SuperPlug = require('superplug')
const Promise = require('bluebird')
const HttpApi = require('./lib/httpApi')
const http = require('./lib/http')

let clientPlugins = {}
let brainPlugins = {}

class Router {

  constructor (config) {
    this.config = config
    this.clients = {}
    this.brains = {}
    this.pluginLoader = new SuperPlug({
      location: __dirname,
      packageProperty: 'genieRouterPlugin'
    })
  }

  start () {
    return this._loadPlugins()
      .then(this._startHttp.bind(this))
      .then(this._startHttpApi.bind(this))
      .then(this._startClients.bind(this))
      .then(this._startBrains.bind(this))
      .catch((err) => {
        console.error('Error initializing', err)
      })
  }

  _loadPlugins () {
    return this.pluginLoader.getPlugins()
      .then(function (foundPlugins) {
        let promises = []
        for (var iter in foundPlugins) {
          let foundPlugin = foundPlugins[iter]
          promises.push(foundPlugin.getPlugin()
            .then(function (pluginModule) {
              if (pluginModule.brain) {
                brainPlugins[foundPlugin.getName()] = pluginModule.brain
              }
              if (pluginModule.client) {
                clientPlugins[foundPlugin.getName()] = pluginModule.client
              }
            })
          )
        }
        return Promise.all(promises)
      })
  }

  _startClients () {
    const clients = Object.keys(clientPlugins)

    var configuredClients = clients.filter((clientName) => {
      return getFromObject(this.config, 'plugins.' + clientName) !== undefined
    })
    var promises = []
    configuredClients.forEach((clientName) => {
      promises.push(
        clientPlugins[clientName].start(
          getFromObject(this.config, 'plugins.' + clientName),
          this._getClientStartObjects(clientName)
        ).then((client) => {
          this.clients[clientName] = client
        })
      )
    })

    return Promise.all(promises)
  }

  _getClientStartObjects (clientPluginName) {
    const that = this
    return {
      heard: function (message) {
        that._processHeardInput(
          {
            plugin: clientPluginName,
            message: message
          },
          that.clients[clientPluginName].speak
        )
      }
    }
  }

  _startBrains () {
    let plugin = brainPlugins[this.config.defaultBrain]
    return plugin.start(
      getFromObject(this.config, 'plugins.' + this.config.defaultBrain, {})
    ).then((brain) => {
      this.brains[this.config.defaultBrain] = brain
    })
  }

  /**
   * Process a received input message.
   * @param Object   input         An object with an attribute message.
   * @param function speakCallback The function to invoke with the reply from the brain.
   */
  _processHeardInput (input, speakCallback) {
    return this.brains[this.config.defaultBrain].process(input.message)
      .then(function (output) {
        var outputClone = JSON.parse(JSON.stringify(output))
        outputClone.metadata = input.message.metadata
        return speakCallback(outputClone)
      })
  }

  /**
   * Start the HTTP Api, if enabled.
  */
  _startHttp () {
    if (getFromObject(this.config, 'http.enabled', false)) {
      return http(getFromObject(this.config, 'http'))
    }
    return Promise.resolve()
  }

  /**
   * Start the HTTP Api endpoint.
  */
  _startHttpApi () {
    if (
      !getFromObject(this.config, 'http.enabled', false) ||
      !getFromObject(this.config, 'httpApi.enabled', false)
    ) {
      // HTTP or API is disabled
      console.log('httpAPI is disabled.')
      return Promise.resolve()
    }

    console.log('Starting HTTP Api')
    let httpApi = new HttpApi(getFromObject(this.config, 'httpApi'))
    return httpApi.start({
      heard: (message) => {
        this._processHeardInput(
          {
            plugin: 'httpApi',
            message: message
          },
          httpApi.reply.bind(httpApi)
        )
      }
    })
  }
}

module.exports = Router
