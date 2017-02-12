'use strict'

const cliPlugin = require('./lib/plugins/clients/cli')
const echoPlugin = require('./lib/plugins/brains/echo')

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
      that._getConfig('plugins.cli'),
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
      this._getConfig('plugins.brains.echo')
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

  _getConfig (key, defaultVal) {
    var val = this._readFromObject(this.config, key)
    if (val !== undefined) {
      return val
    }
    return defaultVal
  }

  _readFromObject (object, key) {
    var parts = key.split('.', 2)
    if (parts.length === 1) {
      // there is no sublevel more to read
      return object[parts[0]]
    } else {
      // the key demands more sublevels
      if (object[parts[0]]) {
        return this._readFromObject(object[parts[0]], parts[1])
      }
      return undefined
    }
  }
}

module.exports = Router
