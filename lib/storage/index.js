const Promise = require('bluebird');
const writeFile = Promise.promisify(require('fs').writeFile);
const readFile = Promise.promisify(require('fs').readFile);
const mkdir = Promise.promisify(require('fs').mkdir);
const access = Promise.promisify(require('fs').access);
const os = require('os');
const path = require('path');
const fs = require('fs');
const getFromObject = require('../utils/getFromObject');

class Storage {
    constructor(config) {
        this.config = config;
        this.file = null;
        this.store = null;
    }

    async get(key, defaultVal) {
        const store = await this._readFromDisk();
        return getFromObject(store, key, defaultVal);
    }

    async put(key, value) {
        const store = await this._readFromDisk();
        this._putToStorage(store, key, value);
        return this._persist();
    }

    async _persist() {
        return writeFile(this.file, JSON.stringify(this.store), 'utf8');
    }

    async _readFromDisk() {
        if (this.store !== null) {
            return this.store; // has already been read
        }

        try {
            const defaultPath = path.join(os.homedir(), '.genie-router', 'storage.json');
            const storeFile = getFromObject(this.config, 'storage.location', defaultPath);
            this.file = storeFile;
            await this._makeSureDirectoryExists(storeFile);
            await access(storeFile, fs.constants.W_OK | fs.constants.R_OK); // eslint-disable-line no-bitwise
            const contents = await readFile(storeFile, 'utf8');

            this.store = JSON.parse(contents);
            return this.store;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            this.store = {};
            return this.store;
        }
    }

    _putToStorage(object, key, value) {
        const writeObject = Object.assign({}, object);
        const parts = key.split('.', 2);
        if (parts.length === 1) {
            // there is no sublevel more to read
            writeObject[key] = value;
            return writeObject;
        }
        // the key demands more sublevels
        if (writeObject[parts[0]] === undefined) {
            writeObject[parts[0]] = {};
        }
        writeObject[parts[0]] = this._putToStorage(object[parts[0]], parts[1], value);
        return writeObject;
    }

    async _makeSureDirectoryExists(location) {
        const dir = path.dirname(location);
        try {
            await access(dir, fs.constants.W_OK | fs.constants.R_OK); // eslint-disable-line no-bitwise
        } catch (error) {
            if (error.code === 'ENOENT') {
                await mkdir(dir); // We checked that the dir exists, now let the calling function handle the existence of the file.
            }
        }
    }
}

module.exports = Storage;
