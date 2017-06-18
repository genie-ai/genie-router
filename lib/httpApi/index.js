const http = require('../http')
const uuidv4 = require('uuid/v4')
const getFromObject = require('../utils/getFromObject')

/**
 * Exposes a HTTP route to send messages to that are then processed by the brains.
 */
class HttpApi {

  constructor (config) {
    this.config = config
    this.openRequests = {}
  }

  start (router) {
    this.router = router
    return http()
      .then((app) => {
        console.log('Binding HTTP Api endpoint to', this.config.endpoint)
        if (getFromObject(this.config, 'accessToken')) {
            app.post(
              getFromObject(this.config, 'endpoint', '/api/message'),
              this._isAuthenticated.bind(this),
              this._handleMessage.bind(this)
            )
        } else {
          app.post(getFromObject(this.config, 'endpoint', '/api/message'), this._handleMessage.bind(this))
        }
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
    })
  }

  _isAuthenticated (req, res, next) {
    const accessToken = this.config.accessToken
    if (req.headers['authorization'] && req.headers['authorization'] === 'Bearer ' + accessToken)
        return next()

    // unvalid token
    res.status(401).send(JSON.stringify({"error": "Invalid accessToken"}))
  }

  _handleMessage (req, res) {
    return new Promise((resolve, reject) => {
      const uuid = uuidv4()
      console.log('Handling request, marking with uuid', uuid, req.body)
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
        reject(new Error('Timeout contacting brain.'))
      }, getFromObject(this.config, 'timeout', 5000))

      this.router.heard({input: req.body.input, metadata: {uuid: uuid, requestMetadata: requestMetadata}})
      // set a marker in the openRequests list so that when a reply is returned, we
      // can map it to the request and send a response.
      this.openRequests[uuid] = {res: res, timer: timer}
    })
  }
}

module.exports = HttpApi
