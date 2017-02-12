'use strict'

const cliPlugin = require('./lib/plugins/clients/cli')
const echoPlugin = require('./lib/plugins/brains/echo')
const getFromObject = require('./lib/utils/getFromObject')

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
    var that = this
    return cliPlugin.start(
      getFromObject(that.config, 'plugins.cli'),
      {
        heard: function (message) {
          that._processHeardInput({
            plugin: 'cli',
            message: message
          })
        }
      }
    ).then(function (client) {
      that.clients.cli = client
    })
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
        return that.clients[input.plugin].speak(output)
      })
  }
}

module.exports = Router
