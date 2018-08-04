/* global describe, it, beforeEach */

const assert = require('assert')
const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')
const noop = require('../../../lib/utils/noop')

describe('Loader', function () {
  let loader = null
  const Loader = require('../../../lib/plugins/loader')

  beforeEach(function () {
    loader = new Loader({ configValue: 'a' }, noop, {}, {})
  })

  describe('constructor', function () {
    it('should set the config values provided in the constructor', function () {
      assert.deepEqual({ configValue: 'a' }, loader.config)
    })
  })

  describe('httpEnabled', function () {
    it('should set httpEnabled correctly', function () {
      loader.setHttpEnabled(true)
      assert.ok(loader.httpEnabled)
      loader.setHttpEnabled(false)
      assert.ok(!loader.httpEnabled)
    })
  })

  describe('_getPluginStoreLocation', function () {
    it('should use the configured path if available', function () {
      const checkConfiguredPath = sinon.spy()
      const useDefaultConfigurationPath = sinon.spy()

      loader._checkConfiguredPath = checkConfiguredPath
      loader._useDefaultConfigurationPath = useDefaultConfigurationPath
      loader.config = { pluginStore: { location: '/etc/genie-router' } }

      loader._getPluginStoreLocation()
      assert.ok(checkConfiguredPath.called)
      assert.ok(checkConfiguredPath.alwaysCalledWithExactly('/etc/genie-router'))
      assert.ok(!useDefaultConfigurationPath.called)
    })

    it('should fallback to default', function () {
      const checkConfiguredPath = sinon.spy()
      const useDefaultConfigurationPath = sinon.spy()

      loader._checkConfiguredPath = checkConfiguredPath
      loader._useDefaultConfigurationPath = useDefaultConfigurationPath

      loader._getPluginStoreLocation()
      assert.ok(!checkConfiguredPath.called)
      assert.ok(useDefaultConfigurationPath.called)
    })
  })

  describe('_checkConfiguredPath', function () {
    it('should check if the path exists', async function () {
      const statStub = sinon.stub()
      const Loader = proxyquire('../../../lib/plugins/loader.js', { fs: { stat: statStub, mkdir: sinon.spy(), writeFile: sinon.spy() } })
      const loader = new Loader({ configValue: 'a' }, noop, {}, {})
      const statResult = { isDirectory: sinon.stub() }
      statResult.isDirectory.returns(true)
      statStub.alwaysCalledWithExactly('/etc/genie-router')
      statStub.callsArgWith(1, null, statResult)

      const checkPluginLocation = sinon.stub()
      checkPluginLocation.returnsArg(0)
      loader._checkPluginLocation = checkPluginLocation

      const configuredPath = await loader._checkConfiguredPath('/etc/genie-router')
      assert.ok(checkPluginLocation.called)
      // verify the follow-up function is called
      assert.ok(checkPluginLocation.alwaysCalledWithExactly('/etc/genie-router'))
      assert.ok(statResult.isDirectory.called)
    })

    it('should fail if the path isn\'t a directory', async function () {
      const statStub = sinon.stub()
      const Loader = proxyquire('../../../lib/plugins/loader.js', { fs: { stat: statStub, mkdir: sinon.spy(), writeFile: sinon.spy() } })
      const loader = new Loader({ configValue: 'a' }, noop, {}, {})
      const statResult = { isDirectory: sinon.stub() }
      statResult.isDirectory.returns(false)
      statStub.alwaysCalledWithExactly('/etc/genie-router')
      statStub.callsArgWith(1, null, statResult)

      const checkPluginLocation = sinon.spy()

      try {
        await loader._checkConfiguredPath('/etc/genie-router')
        assert.ok(false, 'Promise expected to be rejected')
      } catch(error) {
          assert.ok(!checkPluginLocation.called)
          assert.ok(statResult.isDirectory.called)
          assert.equal('Configured pluginStore location is not a directory.', error.message)
      }
    })
  })
})
