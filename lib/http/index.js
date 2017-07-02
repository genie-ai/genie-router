const express = require('express')
const bodyparser = require('body-parser')
const getFromObject = require('../utils/getFromObject')
const debug = require('debug')('genie-router:http')
let app = null

function start (config) {
  return new Promise((resolve, reject) => {
    // start is invoked earlier and http is enabled, return the initialized app
    if (app !== null) {
      console.log('returning immeidjate')
      resolve(app)
      return
    }

    app = express()
    app.use(bodyparser.json({type: 'application/json'}))
    app.listen(getFromObject(config, 'port', 3001))
    debug('Listening for HTTP on port %d', config.port)
    resolve(app)
  })
}

module.exports = start
