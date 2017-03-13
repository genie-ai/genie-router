'use strict'

const getFromObject = require('./lib/utils/getFromObject')

let clientPlugins = {
  cli: require('./lib/plugins/clients/cli'),
  telegram: require('./lib/plugins/clients/telegram')
}

let brainPlugins = {
  echo: require('./lib/plugins/brains/echo'),
  wit: require('./lib/plugins/brains/wit'),
  gladys: require('./lib/plugins/brains/gladys')
}

class Router {

  constructor (config) {
    this.config = config
    this.clients = {}
    this.brains = {}
  }

  start () {
    var that = this
    return this._startClients()
      .then(function () {
        return that._startBrains()
      })
  }

  _startClients () {
    const that = this
    const clients = ['cli', 'telegram']
    var configuredClients = clients.filter(function (clientName) {
      return getFromObject(that.config, 'clients.' + clientName) !== undefined
    })
    var promises = []
    configuredClients.forEach(function (clientName) {
      promises.push(
        clientPlugins[clientName].start(
          getFromObject(that.config, 'clients.' + clientName),
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
      getFromObject(this.config, 'brains.' + this.config.defaultBrain, {})
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
