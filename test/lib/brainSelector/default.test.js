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

  it('should return a Promise that resolves to a function', async function () {
    let output = defaultFn('default')
    assert.ok(
      typeof output.then === 'function' &&
      typeof output.catch === 'function'
    )

    try {
      const promiseResult = await output
      assert.ok(typeof promiseResult === 'function')
      resolvedFunction = promiseResult
    } catch(err) {
        assert.ok(false, 'We should not reach the catch().')
    }
  })

  it('should fail on unknown defaultBrain', async function () {
    try {
      const brain = await resolvedFunction({notdefault: 1, othernotdefault: 2}, {input: 'heard'})
      assert.ok(false, 'Promise should fail.')
    } catch(err) {
      assert.equal('Default brain not found in list of brains', err.message)
    }
  })

  it('should resolve with a result object with a brain attribute', async function () {
    const result = await resolvedFunction({default: {process: noop, start: noop}}, {input: 'heard'})
    assert.equal('function', typeof result.brain.process)
    assert.equal('function', typeof result.brain.start)
  })
})
