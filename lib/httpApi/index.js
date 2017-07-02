const http = require('../http')
const uuidv4 = require('uuid/v4')
const getFromObject = require('../utils/getFromObject')
const debug = require('debug')('genie-router:httpApi')

/**
 * Exposes a HTTP route to send messages to that are then processed by the brains.
 */
class HttpApi {

  constructor (config, router) {
    this.config = config
    this.openRequests = {}
    this.router = router
  }

  start () {
    return http()
      .then((app) => {
        let endpoint = getFromObject(this.config, 'endpoint', '/api/message')

        debug('Binding HTTP Api endpoint to %s', endpoint)
        if (getFromObject(this.config, 'accessToken')) {
          app.post(
              endpoint,
              this._isAuthenticated.bind(this),
              this._handleMessage.bind(this)
            )
        } else {
          app.post(endpoint, this._handleMessage.bind(this))
        }
        app.options(endpoint, (req, res) => {
          this._sendCorsHeaders(res)
          res.sendStatus(200)
        })
      })
  }

  reply (message) {
    return new Promise((resolve, reject) => {
      const uuid = message.metadata.uuid
      if (!this.openRequests[uuid]) {
        reject('Uuid not found in list of open requests.')
        return
      }

      const res = this.openRequests[uuid].res
      res.send(
        JSON.stringify(
          {
            id: uuid,
            message: {
              message: message.output,
              metadata: message.metadata.requestMetadata
            }
          }
        )
      )
      clearTimeout(this.openRequests[uuid].timer)
      delete this.openRequests[uuid]
      resolve()
      return
    })
  }

  _isAuthenticated (req, res, next) {
    const accessToken = this.config.accessToken
    if (req.headers['authorization'] && req.headers['authorization'] === 'Bearer ' + accessToken) {
      return next()
    }

    // unvalid token
    res.status(401).send(JSON.stringify({'error': 'Invalid accessToken'}))
  }

  _handleMessage (req, res) {
    return new Promise((resolve, reject) => {
      const uuid = uuidv4()

      debug('Handling request, marking with uuid %s %s', uuid, JSON.stringify(req.body))
      this._sendCorsHeaders(res)
      res.setHeader('Content-Type', 'application/json')

      if (!req.body.input) {
        res.send(JSON.stringify({id: uuid, error: 'No input attribute found in request.'}))
        reject(new Error('No input found in request.'))
        return
      }

      const requestMetadata = req.body.metadata ? req.body.metadata : {}
      // set a timeout for processing
      const timer = setTimeout(() => {
        res.send(JSON.stringify({id: uuid, error: 'Timeout contacting brain.'}))
        delete this.openRequests[uuid]
      }, getFromObject(this.config, 'timeout', getFromObject(this.config, 'timeout', 5000)))

      this.router.heard({input: req.body.input, metadata: {uuid: uuid, requestMetadata: requestMetadata}})
      // set a marker in the openRequests list so that when a reply is returned, we
      // can map it to the request and send a response.
      this.openRequests[uuid] = {res: res, timer: timer}
      resolve()
      return
    })
  }

  _sendCorsHeaders (res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  }
}

module.exports = HttpApi
