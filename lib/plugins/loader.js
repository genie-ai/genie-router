const SuperPlug = require('superplug')
const http = require('../http')
const getFromObject = require('../utils/getFromObject')
const debug = require('debug')('genie-router:plugins/Loader')
const path = require('path')

class Loader
{
  constructor (config, clientStartObjectGenerator, brainSelector) {
    this._config = config
    this.plugins = {}
    this.clients = {}
    this.clientStartObjectGenerator = clientStartObjectGenerator
    this.brainSelector = brainSelector
  }

  setHttpEnabled (value) {
    this.httpEnabled = value
  }

  /**
   * Returns a promise that resolves when all plugins are loaded.
   * @return {Promise}
   */
  startPlugins () {
    this._superPlug = new SuperPlug({
      location: path.join(__dirname, '../../'),
      packageProperty: 'genieRouterPlugin'
    })
    return this._loadPlugins()
      .then(this._startPlugins.bind(this))
  }

  getClients () {
    return this.clients
  }

  _startPlugins () {
    const plugins = Object.keys(this.plugins)
    debug('Found plugins: ', plugins)
    let promises = []
    let brains = {}
    plugins.forEach((pluginName) => {
      const config = getFromObject(this._config, 'plugins.' + pluginName)
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
        const startObject = this.clientStartObjectGenerator(pluginName, plugin)
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

  _loadPlugins () {
    return this._superPlug.getPlugins()
      .then((foundPlugins) => {
        let promises = []
        for (var iter in foundPlugins) {
          let foundPlugin = foundPlugins[iter]
          // Only load the plugins which have a configuration
          if (getFromObject(this._config, 'plugins.' + foundPlugin.getName()) !== undefined) {
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
}

module.exports = Loader
