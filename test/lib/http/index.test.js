const assert = require('assert')
const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')
const express = require('express')
const bodyparser = require('body-parser')
const noop = require('../../../lib/utils/noop')

describe('http()', function () {
  let expressMock = null;
  let bodyParserStub = null
  let http = null

  beforeEach(function () {
    expressStub = sinon.stub()
    bodyParserStub = sinon.stub()
    http = proxyquire('../../../lib/http/index.js', {express: expressStub, 'body-parser': {json: bodyParserStub}})
  })

  it('should be a function', function () {
    assert.ok(typeof http === 'function')
  })

  it('should return a promise', function() {
    //set up Express mock
    expressStub.returns({listen: noop, use: noop})

    //Run test
    let promise = http({port: 80})
    assert.ok(
      typeof promise.then === 'function' &&
      typeof promise.catch === 'function'
    )
  })

  it('should initialize express and bodyparser', function() {
    //set up Express mock
    const listenSpy = sinon.spy()
    const useSpy = sinon.spy()
    expressStub.returns({listen: listenSpy, use: useSpy})

    let promise = http({port: 80})
    return promise.then(() => {
      assert.ok(bodyParserStub.alwaysCalledWith({type: 'application/json'}))
      assert.ok(listenSpy.calledOnce)
      assert.ok(listenSpy.alwaysCalledWith(80))
      assert.ok(useSpy.calledOnce)
    })
  })
})
