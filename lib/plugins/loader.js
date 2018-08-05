const SuperPlug = require('superplug');
const http = require('../http');
const getFromObject = require('../utils/getFromObject');
const debug = require('debug')('genie-router:plugins/Loader');
const path = require('path');
const os = require('os');
const Promise = require('bluebird');
const stat = Promise.promisify(require('fs').stat);
const mkdir = Promise.promisify(require('fs').mkdir);
const writeFile = Promise.promisify(require('fs').writeFile);
const npmUtils = require('npm-utils');
const express = require('express');
const objectGenerator = require('./objectGenerator');

class Loader {
    constructor(config, clientStartObjectGenerator, brainSelector, eventEmitter) {
        this.config = config;
        this.plugins = {};
        this.clients = {};
        this.clientStartObjectGenerator = clientStartObjectGenerator;
        this.brainSelector = brainSelector;
        this.eventEmitter = eventEmitter;
    }

    setHttpEnabled(value) {
        this.httpEnabled = value;
    }

    /**
   * Returns a promise that resolves when all plugins are loaded.
   * @return {Promise}
   */
    async startPlugins() {
        try {
            this.location = await this._getPluginStoreLocation();
            await stat(path.join(this.location, 'node_modules'));
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
            // TODO this is to to check if node_modules does not exist, but if a parent folder
            // also does not exist, it fails with weird errors.
            await this._npmInstall();
        }

        this._superPlug = new SuperPlug({
            location: this.location,
            packageProperty: 'genieRouterPlugin',
        });
        await this._loadPlugins();
        await this._startPlugins();
    }

    /**
   * If this a configured path, make sure we can access it, if it is the default, create it if it does not exists.
   * @return Promise
   */
    async _getPluginStoreLocation() {
        const configuredPath = getFromObject(this.config, 'pluginStore.location', false);
        if (configuredPath) {
            debug('Found configured path', configuredPath);
            await this._checkConfiguredPath(configuredPath);
            return configuredPath;
        }
        return this._useDefaultConfigurationPath();
    }

    /**
   * Make sure that we can access the configured path.
   * @return Promise
   */
    async _checkConfiguredPath(configuredPath) {
        const result = await stat(configuredPath);
        if (!result.isDirectory()) {
            throw new Error('Configured pluginStore location is not a directory.');
        }
        await this._checkPluginLocation(configuredPath);
    }

    /**
   * Check if the default configuration path ($HOME/.genie-router) exists,
   * if not, create it.
   */
    async _useDefaultConfigurationPath() {
        const defaultPath = path.join(os.homedir(), '.genie-router');

        let result;
        try {
            result = await stat(defaultPath);
        } catch (err) {
            if (err.code === 'ENOENT') {
                debug(defaultPath, 'did not exist.');
                // Attempt to create the folder
                await mkdir(defaultPath);
                debug('Created', defaultPath);
                return defaultPath;
            }
            throw err;
        }
        debug(defaultPath, 'found');
        if (!result.isDirectory()) {
            throw new Error(`${defaultPath} exists, but is not a directory`);
        }

        await this._checkPluginLocation(defaultPath);
        return defaultPath;
    }

    async _checkPluginLocation(pluginPath) {
        debug(`Checking if ${pluginPath}/package.json exists`);

        try {
            const statResult = await stat(path.join(pluginPath, 'package.json'));
            if (!statResult.isFile()) {
                throw new Error(`${pluginPath}/package.json is not a file.`);
            }
            debug('Found package.json in ', pluginPath);
            return pluginPath; // It exists, we can return the Promise
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }

        // Create package.json
        debug('Creating package.json in folder', pluginPath);
        await writeFile(
            path.join(pluginPath, 'package.json'),
            JSON.stringify({
                name: 'genie-router-plugins',
                dependencies: { // Default dependencies
                    'genie-router-cli-local': 'github:matueranet/genie-router-plugin-cli-local',
                    'genie-router-plugin-echo': 'github:matueranet/genie-router-plugin-echo',
                    'genie-router-plugin-brain-mentions': 'github:matueranet/genie-router-plugin-brain-mentions',
                },
            }),
        );

        return pluginPath;
    }

    getClients() {
        return this.clients;
    }

    _startPlugins() {
        const plugins = Object.keys(this.plugins);
        debug('Found plugins: ', plugins);
        const promises = [];
        const brains = {};
        plugins.forEach((pluginName) => {
            const config = getFromObject(this.config, `plugins.${pluginName}`);
            const plugin = this.plugins[pluginName];

            if (plugin.setRouter) {
                this.plugins[pluginName].setRouter(objectGenerator(this.config, pluginName));
            }
            if (plugin.brain) {
                promises.push(this.plugins[pluginName].brain.start(config)
                    .then((brain) => {
                        brains[pluginName] = brain;
                    }));
            }
            if (plugin.client) {
                // thing here is that the startObject needs the speak function, which
                // is only available after the start function has been invoked. Needed
                // some trickery to make it work.
                const startObject = this.clientStartObjectGenerator(pluginName, plugin);
                promises.push(this.plugins[pluginName].client.start(
                    config,
                    startObject,
                ).then((client) => {
                    this.clients[pluginName] = client;
                }));
            }
            if (plugin.brainSelector) {
                promises.push(this.plugins[pluginName].brainSelector.start(config)
                    .then((brainSelector) => {
                        this.brainSelector.use(pluginName, brainSelector);
                    }));
            }
            if (plugin.http) {
                if (!this.httpEnabled) {
                    debug('HTTP is not enabled, Ignoring http component of plugin', pluginName);
                } else {
                    promises.push(http()
                        .then(app => this.plugins[pluginName].http.start(config, app, express)));
                }
            }
            if (plugin.listener) {
                promises.push(this.plugins[pluginName].listener.start(config, this.eventEmitter));
            }
        });
        return Promise.all(promises)
            .then(() => {
                this.brainSelector.setBrains(brains);
            });
    }

    async _loadPlugins() {
        const foundPlugins = await this._superPlug.getPlugins();
        const promises = [];
        foundPlugins.forEach((foundPlugin) => {
            // Only load the plugins which have a configuration
            if (getFromObject(this.config, `plugins.${foundPlugin.getName()}`) !== undefined) {
                const p = foundPlugin.getPlugin();
                p.then((pluginModule) => {
                    this.plugins[foundPlugin.getName()] = pluginModule;
                });
                promises.push(p);
            } else {
                debug('Skipping loading plugin', foundPlugin.getName(), 'configuration is missing.');
            }
        });
        return Promise.all(promises);
    }

    /**
   * Runs 'npm install' without a module name, so that the modules are installed/updated.
   * @return Promise
   */
    async _npmInstall() {
        const cwd = process.cwd();
        process.chdir(this.location);
        await npmUtils.install({
            name: '',
            flags: ['--quiet', '--production'],
        });

        // move back to the old current dir
        process.chdir(cwd);
    }
}

module.exports = Loader;
