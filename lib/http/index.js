const express = require('express')
const bodyparser = require('body-parser')
const getFromObject = require('../utils/getFromObject')
let app = null

function start (config) {
  return new Promise((resolve, reject) => {
    // start is invoked earlier and http is enabled, return the initialized app
    if (app !== null) {
      resolve(app)
    }

    app = express()
    app.use(bodyparser.json({type: 'application/json'}))
    app.listen(getFromObject(config, 'port', 80))
    console.log('Listening for HTTP on port ' + config.port)
    resolve(app)
  })
}

module.exports = start
