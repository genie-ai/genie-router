/* global describe, it, beforeEach */

const noop = require('../../../lib/utils/noop')
const assert = require('assert')

describe('brainSelector/default', function () {
  let defaultFn = null

  // This will contain the resolved function, for testing, with defaultBrain param
  // set to `default`.
  let resolvedFunction = null

  beforeEach(function () {
    defaultFn = require('../../../lib/brainSelector/default')
  })

  it('should return a Promise that resolves to a function', function () {
    let output = defaultFn('default')
    assert.ok(
      typeof output.then === 'function' &&
      typeof output.catch === 'function'
    )
    output
      .then(function (promiseResult) {
        assert.ok(typeof promiseResult === 'function')
        resolvedFunction = promiseResult
      })
      .catch(function () {
        assert.ok(false, 'We should not reach the catch().')
      })
  })

  it('should fail on unknown defaultBrain', function () {
    resolvedFunction({notdefault: 1, othernotdefault: 2}, {input: 'heard'})
      .then(function (brain) {
        assert.ok(false, 'Promise should fail.')
      })
      .catch(function (err) {
        assert.equal('Default brain not found in list of brains', err.message)
      })
  })

  it('should resolve with a result object with a brain attribute', function () {
    return resolvedFunction({default: {process: noop, start: noop}}, {input: 'heard'})
      .then(function (result) {
        assert.equal('function', typeof result.brain.process)
        assert.equal('function', typeof result.brain.start)
      })
  })
})
