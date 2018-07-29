const getFromObject = require('../utils/getFromObject')
const Promise = require('bluebird')
const writeFile = Promise.promisify(require('fs').writeFile)
const readFile = Promise.promisify(require('fs').readFile)
const mkdir = Promise.promisify(require('fs').mkdir)
const access = Promise.promisify(require('fs').access)
const os = require('os')
const path = require('path')
const fs = require('fs')

class Storage {
  constructor (config) {
    this.config = config
    this.file = null
    this.store = null
  }

  get (key, defaultVal) {
    return this._readFromDisk()
      .then((store) => {
        return getFromObject(store, key, defaultVal)
      })
  }

  put (key, value) {
    return this._readFromDisk()
      .then((store) => {
        this._putToStorage(store, key, value)
        return this._persist()
      })
  }

  _persist () {
    return writeFile(this.file, JSON.stringify(this.store), 'utf8')
  }

  _readFromDisk () {
    if (this.store !== null) {
      return Promise.resolve(this.store) // has already been read
    }

    const defaultPath = path.join(os.homedir(), '.genie-router', 'storage.json')
    const storeFile = getFromObject(this.config, 'storage.location', defaultPath)
    this.file = storeFile
    return this._makeSureDirectoryExists(storeFile)
      .then(() => {
        return access(storeFile, fs.constants.W_OK | fs.constants.R_OK)
      })
      .then(() => {
        return readFile(storeFile, 'utf8')
      })
      .then((contents) => {
        this.store = JSON.parse(contents)
        return this.store
      })
      .catch((error) => {
        if (error.code === 'ENOENT') {
          this.store = {}
          return this.store
        }
        throw error
      })
  }

  _putToStorage (object, key, value) {
    var parts = key.split('.', 2)
    if (parts.length === 1) {
      // there is no sublevel more to read
      object[key] = value
      return object
    } else {
      // the key demands more sublevels
      if (object[parts[0]] === undefined) {
        object[parts[0]] = {}
      }
      object[parts[0]] = this._putToStorage(object[parts[0]], parts[1], value)
      return object
    }
  }

  _makeSureDirectoryExists (location) {
    const dir = path.dirname(location)
    return access(dir, fs.constants.W_OK | fs.constants.R_OK)
      .catch((error) => {
        if (error.code === 'ENOENT') {
          return mkdir(dir) // We checked that the dir exists, now let the calling function handle the existence of the file.
        }
      })
  }
}

module.exports = Storage
