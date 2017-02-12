var readline = require('readline')
var Promise = require('bluebird')

var providedRouter
var rl

function start (config, router) {
  return new Promise(function (resolve, reject) {
    providedRouter = router
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    })

    rl.on('line', function (cmd) {
      providedRouter.heard({input: cmd})
    })

    resolve({speak: speak})
  })
}

function speak (message) {
  return new Promise(function (resolve, reject) {
    console.log(message.output)
    resolve()
  })
}

module.exports = {start: start}
