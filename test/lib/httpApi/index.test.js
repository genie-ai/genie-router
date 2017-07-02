const assert = require('assert')
const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')

describe('HttpApi', function () {
  describe('Class', function () {
    let HttpApi = require('../../../lib/httpApi/index.js')

    it('should be a function (class)', function () {
      assert.ok(typeof HttpApi === 'function')
    })

    it('must store config parameters', function () {
      let config = {foo: 'bar'}
      let httpApi = new HttpApi(config)
      assert.equal(httpApi.config, config)
    })
  })

  describe('start()', function () {
    //define two similar testcases
    let dataProvider = [
      {label: 'must register the default route at express', config: {}, getFromObjectFirst: undefined, postArgCount: 2},
      {
        label: 'must register an authorization middleware',
        config: {accessToken: 'access-token'},
        getFromObjectFirst:
        'access-token',
        postArgCount: 3
      }
    ]
    dataProvider.forEach(function (data) {
      it(data.label, function () {
        //create an AppStub to let the Promise return
        let appStub = {
          post: sinon.stub(),
          options: sinon.stub()
        }

        //stub http
        let httpStub = sinon.stub()
        httpStub.resolves(appStub)

        //getFromObject stub
        let getFromObjectStub = sinon.stub()
        getFromObjectStub.onFirstCall().returns('/api/message')
        getFromObjectStub.onSecondCall().returns(data.getFromObjectFirst)

        let HttpApi = proxyquire('../../../lib/httpApi/index.js', {'../http': httpStub, '../utils/getFromObject': getFromObjectStub})
        let httpApi = new HttpApi(data.config)
        return httpApi.start()
          .then(function () {
            let endpointCall = getFromObjectStub.getCall(0)
            assert.ok(endpointCall.calledWithExactly(data.config, 'endpoint', '/api/message'))
            let accessTokenCall = getFromObjectStub.getCall(1)
            assert.ok(accessTokenCall.calledWithExactly(data.config, 'accessToken'))
            assert.ok(appStub.post.calledWith('/api/message'))
            assert.equal(data.postArgCount, appStub.post.getCall(0).args.length)
            assert.ok(appStub.options.calledOnce)
            assert.ok(appStub.options.calledWith('/api/message'))
          })
      })
    })
  })

  describe('reply()', function () {
    it('sends a reply', function () {
      let resStub = {send: sinon.stub()}
      let HttpApi = require('../../../lib/httpApi/index.js')
      let httpApi = new HttpApi({})

      //set up the list of open requests
      httpApi.openRequests = {uuid: {res: resStub, timer: undefined}}
      let message = {output: 'reply', metadata: {uuid: 'uuid', requestMetadata: {}}}

      return httpApi.reply(message)
        .then(function () {
          //test that the reply is send
          let expectedMessage = {id: 'uuid', message: {message: 'reply', metadata: {}}}
          assert.equal(JSON.stringify(expectedMessage), resStub.send.getCall(0).args[0])

          //test that the openRequest is cleaned up
          assert.equal(undefined, httpApi.openRequests.uuid)
        })
    })

    it('fails if there is no open request', function () {
      let HttpApi = require('../../../lib/httpApi/index.js')
      let httpApi = new HttpApi({})

      let message = {output: 'reply', metadata: {uuid: 'uuid', requestMetadata: {}}}
      return httpApi.reply(message)
        .then(function () { throw new Error('catch() was expected, not then()') })
        .catch(function (err) {
          assert.equal('Uuid not found in list of open requests.', err)
        })
    })
  })

  describe('_isAuthenticated()', function () {
    it('allows a request with valid accessToken', function () {
      let reqStub = {
        headers: {
          authorization: 'Bearer access-token'
        }
      }

      let nextStub = sinon.stub()
      nextStub.returns('ok - nextStub')
      let HttpApi = require('../../../lib/httpApi/index.js')
      let httpApi = new HttpApi({accessToken: 'access-token'})

      let result = httpApi._isAuthenticated(reqStub, {}, nextStub)
      assert.equal('ok - nextStub', result)
      assert.ok(nextStub.calledOnce)
    })

    let dataProvider = [
      {label: 'returns a 401 on no Authorization header', headers: []},
      {label: 'returns a 401 on invalid Authorization header', headers: {authorization: 'invalid'}}
    ]

    dataProvider.forEach(function (data) {
      it(data.label, function () {
        let reqStub = {
          headers: data.headers
        }
        let resStub = {
          status: sinon.stub(),
          send: sinon.stub()
        }
        resStub.status.returns(resStub)

        let nextStub = sinon.stub()
        let HttpApi = require('../../../lib/httpApi/index.js')
        let httpApi = new HttpApi({accessToken: 'access-token'})

        httpApi._isAuthenticated(reqStub, resStub, nextStub)
        assert.ok(nextStub.notCalled)
        assert.ok(resStub.status.calledOnce)
        assert.ok(resStub.status.calledWithExactly(401))
        assert.ok(resStub.send.calledOnce)
        assert.equal(JSON.stringify({error: 'Invalid accessToken'}), resStub.send.getCall(0).args[0])
      })
    })
  })

  describe('_handleMessage', function () {
    let uuidv4Stub = sinon.stub()
    let setHeaderStub = sinon.stub()
    let clock = null

    afterEach(function () {
      uuidv4Stub.reset()
      setHeaderStub.reset()
      if (clock !== null) {
        clock.restore()
        clock = null
      }
    })
    beforeEach(function () {
      uuidv4Stub.returns('uuidv4')
    })

    it('forwards the message to the router', function () {
      let HttpApi = proxyquire('../../../lib/httpApi/index.js', {'uuid/v4': uuidv4Stub})
      let heardStub = sinon.stub()

      let httpApi = new HttpApi({}, {heard: heardStub})
      let sendStub = sinon.stub()
      let res = {setHeader: setHeaderStub, send: sendStub}
      sinon.stub(httpApi, '_sendCorsHeaders')

      return httpApi._handleMessage({body: {input: 'hello'}}, res)
        .then(function () {
          assert.ok(uuidv4Stub.calledOnce)
          assert.ok(httpApi._sendCorsHeaders.calledOnce)
          assert.ok(setHeaderStub.calledOnce)
          assert.ok(setHeaderStub.calledWithExactly('Content-Type', 'application/json'))
          assert.ok(heardStub.calledOnce)
          assert.deepEqual({input: 'hello', metadata: {uuid: 'uuidv4', requestMetadata: {}}}, heardStub.getCall(0).args[0])
          assert.equal(1, Object.keys(httpApi.openRequests).length)
          assert.notEqual(undefined, httpApi.openRequests['uuidv4'])
          assert.deepEqual(res, httpApi.openRequests['uuidv4'].res)
        })
    })
    it('fails if there is no input attribute in request', function () {
      let HttpApi = proxyquire('../../../lib/httpApi/index.js', {'uuid/v4': uuidv4Stub})
      let httpApi = new HttpApi({})
      let sendStub = sinon.stub()
      sinon.stub(httpApi, '_sendCorsHeaders')

      return httpApi._handleMessage({body: {}}, {setHeader: setHeaderStub, send: sendStub})
        .then(function () { throw new Error('Error is expected.') })
        .catch(function () {
          assert.ok(uuidv4Stub.calledOnce)
          assert.equal(1, setHeaderStub.callCount)
          assert.ok(setHeaderStub.calledWithExactly('Content-Type', 'application/json'))
          assert.ok(sendStub.calledOnce)
          assert.equal(
            JSON.stringify({id: 'uuidv4', error: 'No input attribute found in request.'}),
            sendStub.getCall(0).args[0]
          )
          httpApi._sendCorsHeaders.restore()
        })

    })
    it('sets a timeout', function () {
      clock = sinon.useFakeTimers()

      let HttpApi = proxyquire('../../../lib/httpApi/index.js', {'uuid/v4': uuidv4Stub})
      let heardStub = sinon.stub()

      let httpApi = new HttpApi({}, {heard: heardStub})
      let sendStub = sinon.stub()
      let res = {setHeader: setHeaderStub, send: sendStub}
      sinon.stub(httpApi, '_sendCorsHeaders')

      let promise = httpApi._handleMessage({body: {input: 'hello'}}, res)
        .then(function () {
          clock.tick(5001)
          assert.equal(0, Object.keys(httpApi.openRequests).length)
          assert.ok(res.send.calledOnce)
          assert.equal(JSON.stringify({id: 'uuidv4', error: 'Timeout contacting brain.'}), res.send.getCall(0).args[0])
        })
      return promise
    })
  })

  describe('_sendCorsHeaders()', function () {
    it('sends CORS headers', function () {
      let HttpApi = require('../../../lib/httpApi/index.js')
      let headerStub = sinon.stub()

      let httpApi = new HttpApi()
      httpApi._sendCorsHeaders({header: headerStub})
      assert.ok(headerStub.calledThrice)
      assert.ok(headerStub.getCall(0).calledWithExactly('Access-Control-Allow-Origin', '*'))
      assert.ok(headerStub.getCall(1).calledWithExactly('Access-Control-Allow-Methods', 'POST,OPTIONS'))
      assert.ok(headerStub.getCall(2).calledWithExactly('Access-Control-Allow-Headers', 'Content-Type,Authorization'))
    })
  })
})
