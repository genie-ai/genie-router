const SuperPlug = require('superplug')
const http = require('../http')
const getFromObject = require('../utils/getFromObject')
const debug = require('debug')('genie-router:plugins/Loader')
const path = require('path')
const os = require('os')
const Promise = require('bluebird')
const stat = Promise.promisify(require('fs').stat)
const mkdir = Promise.promisify(require('fs').mkdir)
const writeFile = Promise.promisify(require('fs').writeFile)
const npmUtils = require('npm-utils')

class Loader
{
  constructor (config, clientStartObjectGenerator, brainSelector, eventEmitter) {
    this.config = config
    this.plugins = {}
    this.clients = {}
    this.clientStartObjectGenerator = clientStartObjectGenerator
    this.brainSelector = brainSelector
    this.eventEmitter = eventEmitter
  }

  setHttpEnabled (value) {
    this.httpEnabled = value
  }

  /**
   * Returns a promise that resolves when all plugins are loaded.
   * @return {Promise}
   */
  startPlugins () {
    return this._getPluginStoreLocation()
      .then((location) => {
        this.location = location
        return stat(path.join(location, 'node_modules'))
      })
      .catch((err) => {
        if (err.code === 'ENOENT') {
          return this._npmInstall()
        }
        throw err
      })
      .then(() => {
        this._superPlug = new SuperPlug({
          location: this.location,
          packageProperty: 'genieRouterPlugin'
        })
      })
      .then(this._loadPlugins.bind(this))
      .then(this._startPlugins.bind(this))
  }

  /**
   * If this a configured path, make sure we can access it, if it is the default, create it if it does not exists.
   * @return Promise
   */
  _getPluginStoreLocation () {
    const configuredPath = getFromObject(this.config, 'pluginStore.location', false)
    if (configuredPath) {
      debug('Found configured path', configuredPath)
      return this._checkConfiguredPath(configuredPath)
    } else {
      return this._useDefaultConfigurationPath()
    }
  }

  /**
   * Make sure that we can access the configured path.
   * @return Promise
   */
  _checkConfiguredPath (configuredPath) {
    return stat(configuredPath)
      .then((result) => {
        if (result.isDirectory()) {
          return configuredPath
        }
        throw new Error('Configured pluginStore location is not a directory.')
      })
      .then(this._checkPluginLocation)
  }

  /**
   * Check if the default configuration path ($HOME/.genie-router) exists,
   * if not, create it.
   */
  _useDefaultConfigurationPath () {
    const defaultPath = path.join(os.homedir(), '.genie-router')
    return stat(defaultPath)
      .then((result) => {
        debug(defaultPath, 'found')
        if (!result.isDirectory()) {
          throw new Error(defaultPath + ' exists, but is not a directory')
        }
        return defaultPath
      })
      .catch((err) => {
        if (err.code === 'ENOENT') {
          debug(defaultPath, 'did not exist.')
          // Attempt to create the folder
          return mkdir(defaultPath)
            .then(() => {
              debug('Created', defaultPath)
              return defaultPath
            })
        } else {
          throw err
        }
      })
      .then(this._checkPluginLocation)
  }

  _checkPluginLocation (pluginPath) {
    debug('Checking if ' + pluginPath + '/package.json exists')

    return stat(path.join(pluginPath, 'package.json'))
      .then((statResult) => {
        if (statResult.isFile()) {
          debug('Found package.json in ', pluginPath)
          return pluginPath // It exists, we can return the Promise
        }
        throw new Error(pluginPath + '/package.json is not a file.')
      })
      .catch((err) => {
        if (err.code !== 'ENOENT') {
          throw err
        }

        // Create package.json
        debug('Creating package.json in folder', pluginPath)
        return writeFile(
          path.join(pluginPath, 'package.json'),
          JSON.stringify({
            name: 'genie-router-plugins',
            dependencies: { // Default dependencies
              'genie-router-cli-local': 'github:matueranet/genie-router-plugin-cli-local',
              'genie-router-plugin-echo': 'github:matueranet/genie-router-plugin-echo'
            }
          })
        )
      })
      .then(() => {
        return pluginPath
      })
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
      if (plugin.listener) {
        promises.push(
          this.plugins[pluginName].listener.start(config, this.eventEmitter)
        )
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

  /**
   * Runs 'npm install' without a module name, so that the modules are installed/updated.
   * @return Promise
   */
  _npmInstall () {
    const cwd = process.cwd()
    process.chdir(this.location)
    return npmUtils.install({
      name: '',
      flags: ['--quiet', '--production']
    })
      .then(() => {
        // move back to the old current dir
        process.chdir(cwd)
      })
  }
}

module.exports = Loader
