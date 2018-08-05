/* global describe, it, beforeEach */

const assert = require('assert');
const sinon = require('sinon');
const noop = require('../../../lib/utils/noop');

describe('BrainSelector', () => {
    const BrainSelector = require('../../../lib/brainSelector/index.js'); // eslint-disable-line global-require
    let brainSelector = null;

    /**
     * Will set the brainSelector variable to an instance of the BrainSelector class.
     */
    beforeEach(() => {
        brainSelector = new BrainSelector('default', 120);
    });

    describe('constructor', () => {
        it('should set the defaultBrain on the constructor', () => {
            assert.equal('default', brainSelector.defaultBrain, 'Default brain not set to default');
            assert.equal(120, brainSelector.brainStickiness, 'Brain stickiness not set to 120');
        });
    });

    describe('use()', () => {
        it('should add the function to the list', () => {
            brainSelector.use('test', noop);
            assert.equal(noop, brainSelector.selectors[0]);
        });
        it('should check that the selector is a function', () => {
            try {
                brainSelector.use('fails', {});
                assert.ok(false, 'Error expected');
            } catch (e) {
                assert.ok(true, 'Error thrown');
                assert.equal('Selector is not a function.', e.message);
            }
        });
    });

    describe('setBrains()', () => {
        it('should set the brains on a local property', () => {
            const localBrainSelector = new BrainSelector();
            const brainList = [{ brain: { start: noop, process: noop } }];
            localBrainSelector.setBrains(brainList);
            assert.equal(brainList, localBrainSelector.brains);
        });
    });

    describe('getBrainForInput', () => {
        it('should select a matching promise', async () => {
            const selectedBrain = { process: noop, start: noop };
            const selector = () => Promise.resolve(selectedBrain);

            const defaultSelectorStub = sinon.mock().never();
            brainSelector.defaultSelector = defaultSelectorStub;

            brainSelector.use('test', selector);

            const brain = await brainSelector.getBrainForInput({ input: 'heard', plugin: 'test' });
            assert.deepEqual(selectedBrain, brain);
            assert.equal(1, Object.keys(brainSelector.lastSelectedBrainsPerClient).length, 'Plugin not stored in lastSelectedBrainsPerClient.');
            assert.notEqual(undefined, brainSelector.lastSelectedBrainsPerClient.test);
        });

        it('should use a sticky brain if there is one for the client', async () => {
            const stickyBrain = { process: noop, start: noop };
            brainSelector.lastSelectedBrainsPerClient.test = { now: (new Date()).getTime() / 1000, brain: stickyBrain };
            const selector = () => Promise.resolve(stickyBrain);

            const defaultSelectorStub = sinon.mock().never();
            brainSelector.defaultSelector = defaultSelectorStub;

            brainSelector.use('test', selector);

            const brain = await brainSelector.getBrainForInput({ input: 'heard', plugin: 'test' });
            assert.deepEqual(stickyBrain, brain, 'the returned brain is not the sticky brain.');
        });

        it('should skip a sticky brain if it was selected too long ago', async () => {
            const stickyBrain = { process: noop, start: noop };
            brainSelector.lastSelectedBrainsPerClient.test = { now: 5, brain: stickyBrain };
            const selector = () => Promise.resolve(stickyBrain);

            const defaultSelectorStub = sinon.mock().once();
            brainSelector.defaultSelector = defaultSelectorStub;

            brainSelector.use('test', selector);

            await brainSelector.getBrainForInput({ input: 'heard', plugin: 'test' });
        });

        it('should fallback to defaultSelector if there is no middleware', () => {
            const defaultSelectorStub = sinon.stub();
            brainSelector.defaultSelector = defaultSelectorStub;

            brainSelector.getBrainForInput({ input: 'heard' });
            assert.ok(defaultSelectorStub.calledOnce);
            assert.ok(defaultSelectorStub.calledWithExactly(sinon.match.any, { input: 'heard' }));
        });

        it('should fallback to defaultSelector if there are no matches', async () => {
            const defaultSelectorStub = sinon.stub();
            brainSelector.defaultSelector = defaultSelectorStub;
            brainSelector.selectors = [() => Promise.reject()];

            await brainSelector.getBrainForInput({ input: 'heard' });
            assert.ok(defaultSelectorStub.calledOnce);
            assert.ok(defaultSelectorStub.calledWithExactly(sinon.match.any, { input: 'heard' }));
        });
    });
});
