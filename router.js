'use strict'

const getFromObject = require('./lib/utils/getFromObject')
const SuperPlug = require('superplug')
const Promise = require('bluebird')

let clientPlugins = {
  cli: require('./lib/plugins/clients/cli')
}

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
      .then(this._startClients.bind(this))
      .then(this._startBrains.bind(this))
  }

  _loadPlugins () {
    return this.pluginLoader.getPlugins()
      .then(function (foundPlugins) {
        let promises = new Array()
        for (var iter in foundPlugins) {
          let foundPlugin = foundPlugins[iter]
          promises.push(foundPlugin.getPlugin()
            .then(function(pluginModule) {
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
    const that = this
    const clients = Object.keys(clientPlugins)
    var configuredClients = clients.filter(function (clientName) {
      return getFromObject(that.config, 'plugins.' + clientName) !== undefined
    })
    var promises = []
    configuredClients.forEach(function (clientName) {
      promises.push(
        clientPlugins[clientName].start(
          getFromObject(that.config, 'plugins.' + clientName),
          that._getClientStartObjects(clientName)
        ).then(function (client) {
          that.clients[clientName] = client
        })
      )
    })

    return Promise.all(promises)
  }

  _getClientStartObjects (clientPluginName) {
    const that = this
    return {
      heard: function (message) {
        that._processHeardInput({
          plugin: clientPluginName,
          message: message
        })
      }
    }
  }

  _startBrains () {
    var that = this
    let plugin = brainPlugins[this.config.defaultBrain]
    return plugin.start(
      getFromObject(this.config, 'plugins.' + this.config.defaultBrain, {})
    ).then(function (brain) {
      that.brains[that.config.defaultBrain] = brain
    })
  }

  _processHeardInput (input) {
    var that = this
    this.brains[this.config.defaultBrain].process(input.message)
      .then(function (output) {
        var outputClone = JSON.parse(JSON.stringify(output))
        outputClone.metadata = input.message.metadata
        return that.clients[input.plugin].speak(outputClone)
      })
  }
}

module.exports = Router
