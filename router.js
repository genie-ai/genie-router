const Promise = require('bluebird');
const debug = require('debug')('genie-router::router');
const EventEmitter = require('events');
const getFromObject = require('./lib/utils/getFromObject');
const http = require('./lib/http');
const BrainSelector = require('./lib/brainSelector');
const PluginLoader = require('./lib/plugins/loader.js');

class Router {
    constructor(config) {
        this.config = config;
        this.httpEnabled = false;
        this.brainSelector = new BrainSelector(config.defaultBrain, getFromObject(config, 'brainStickiness', 120));
        this.eventEmitter = new EventEmitter();
        this.pluginLoader = new PluginLoader(config, this._getClientStartObjects.bind(this), this.brainSelector, this.eventEmitter);
    }

    async start() {
        try {
            await this._startHttp();
            await this.pluginLoader.setHttpEnabled(this.httpEnabled);
            await this.pluginLoader.startPlugins();
        } catch (err) {
            console.error('Error initializing', err); // eslint-disable-line no-console
            process.exit(10);
        }
    }

    _getClientStartObjects(clientPluginName) {
        return { // TODO create an object model
            heard: (message) => {
                this._processHeardInput(
                    {
                        plugin: clientPluginName,
                        message,
                    },
                    (replyMessage) => {
                        // We cannot use this function directly, because the object this.clients[clientPluginName]
                        // is not set yet when we create this startObject.
                        this.eventEmitter.emit('output.reply', clientPluginName, replyMessage);
                        this.pluginLoader.getClients()[clientPluginName].speak(replyMessage);
                    },
                );
            },
        };
    }

    /**
   * Process a received input message.
   * @param Object   input         An object with an attribute message.
   * @param function speakCallback The function to invoke with the reply from the brain.
   */
    async _processHeardInput(input, speakCallback) {
        this.eventEmitter.emit('input.heard', input.plugin, input.message);

        try {
            const selectedInfo = await this.brainSelector.getBrainForInput(input);

            const { brain } = selectedInfo;
            let updatedInput = input;
            if (selectedInfo.input) {
                updatedInput = selectedInfo.input;
            }
            const output = await brain.process(updatedInput.message);

            const outputClone = Object.assign({}, output);
            outputClone.metadata = updatedInput.message.metadata;
            outputClone.sessionId = updatedInput.message.sessionId ? updatedInput.message.sessionId : null;
            outputClone.userId = updatedInput.message.userId ? updatedInput.message.userId : null;
            await speakCallback(outputClone);
        } catch (err) {
            debug('Unable to process input %s: %s', JSON.stringify(input), `${err}`);
        }
    }

    /**
   * Start the HTTP Api, if enabled.
  */
    _startHttp() {
        this.httpEnabled = getFromObject(this.config, 'http.enabled', false);
        if (this.httpEnabled) {
            return http(getFromObject(this.config, 'http'));
        }
        return Promise.resolve();
    }
}

module.exports = Router;
