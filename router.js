'use strict'

const echoPlugin = require('./lib/plugins/brains/echo')
const getFromObject = require('./lib/utils/getFromObject')

var clientPlugins = {
  cli: require('./lib/plugins/clients/cli'),
  telegram: require('./lib/plugins/clients/telegram')
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
    return echoPlugin.start(
      getFromObject(that.config, 'plugins.brains.echo')
    ).then(function (brain) {
      that.brains.echo = brain
    })
  }

  _processHeardInput (input) {
    var that = this
    this.brains.echo.process(input.message)
      .then(function (output) {
        var outputClone = JSON.parse(JSON.stringify(output))
        outputClone.metadata = input.message.metadata
        return that.clients[input.plugin].speak(outputClone)
      })
  }
}

module.exports = Router
