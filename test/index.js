'use strict';

const plugin = require('../');
const mkTree = require('./utils').mkTree;
const treeToObj = require('./utils').treeToObj;
const flatten = require('./utils').flatten;
const mkRunnableStub = require('./utils').mkRunnableStub;
const mkSuiteStub = require('./utils').mkSuiteStub;
const mkTestStub = require('./utils').mkTestStub;
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');

describe('plugin', () => {
    const mkHermione_ = () => {
        const hermione = new EventEmitter();
        hermione.events = {
            BEFORE_FILE_READ: 'beforeFileRead',
            AFTER_FILE_READ: 'afterFileRead'
        };
        hermione.isWorker = sinon.stub().returns(false);
        return hermione;
    };

    describe('config', () => {
        afterEach(() => {
            delete process.env['hermione_skip_runner_enabled'];
        });

        it('should be enabled by default', () => {
            const hermione = mkHermione_();

            plugin(hermione, {});

            assert.equal(hermione.listeners(hermione.events.BEFORE_FILE_READ).length, 1);
            assert.equal(hermione.listeners(hermione.events.AFTER_FILE_READ).length, 1);
        });

        it('should do nothing if disabled', () => {
            const hermione = mkHermione_();

            plugin(hermione, {enabled: false});

            assert.equal(hermione.listeners(hermione.events.BEFORE_FILE_READ).length, 0);
            assert.equal(hermione.listeners(hermione.events.AFTER_FILE_READ).length, 0);
        });

        it('should enable plugin by environment variable', () => {
            const hermione = mkHermione_();
            process.env['hermione_skip_runner_enabled'] = true;

            plugin(hermione, {enabled: false});

            assert.equal(hermione.listeners(hermione.events.BEFORE_FILE_READ).length, 1);
            assert.equal(hermione.listeners(hermione.events.AFTER_FILE_READ).length, 1);
        });
    });

    describe('on BEFORE_FILE_READ', () => {
        const init_ = (config) => {
            const hermione = mkHermione_();

            config = _.defaults(config, {enabled: true});
            plugin(hermione, config);

            const rootSuite = mkSuiteStub();
            hermione.emit(hermione.events.BEFORE_FILE_READ, {suite: rootSuite});
            return rootSuite;
        };

        it('should enable created suite', () => {
            const rootSuite = init_();
            const suite = mkSuiteStub({pending: true});

            rootSuite.emit('suite', suite);

            assert.propertyVal(suite, 'pending', false);
        });

        it('should not enable silently skipped suite', () => {
            const rootSuite = init_();
            const suite = mkSuiteStub({pending: true, silentSkip: true});

            rootSuite.emit('suite', suite);

            assert.propertyVal(suite, 'pending', true);
            assert.propertyVal(suite, 'silentSkip', true);
        });

        it('should enable created test', () => {
            const rootSuite = init_();
            const test = mkTestStub({pending: true});

            rootSuite.emit('test', test);

            assert.propertyVal(test, 'pending', false);
        });

        it('should not enable silently skipped test', () => {
            const rootSuite = init_();
            const test = mkTestStub({pending: true, silentSkip: true});

            rootSuite.emit('test', test);

            assert.propertyVal(test, 'pending', true);
            assert.propertyVal(test, 'silentSkip', true);
        });

        it('should restore pending test callback', () => {
            const rootSuite = init_();
            const test = mkTestStub({pending: true, fn: null});

            rootSuite.emit('test', test);

            assert.ok(test.fn);
        });

        describe('ignoreTestFail', () => {
            it('should not mark failed tests as succeeded on browser start error', () => {
                const rootSuite = init_({ignoreTestFail: true});
                const test = mkTestStub({
                    pending: true,
                    fn: () => Promise.reject('No browser'),
                    ctx: {} // if browser started than there will be `browser` property in ctx
                });

                rootSuite.emit('test', test);

                return assert.isRejected(test.fn(), 'No browser');
            });

            it('should mark failed tests as succeeded', () => {
                const rootSuite = init_({ignoreTestFail: true});
                const test = mkTestStub({
                    pending: true,
                    fn: () => Promise.reject(),
                    ctx: {browser: {}}
                });

                rootSuite.emit('test', test);

                return assert.isFulfilled(test.fn());
            });

            it('should mark failed before each hooks as succeeded', () => {
                const rootSuite = init_({ignoreTestFail: true});
                const beforeEach = mkRunnableStub({
                    fn: () => Promise.reject(),
                    ctx: {browser: {}}
                });

                rootSuite.emit('beforeEach', beforeEach);

                return assert.isFulfilled(beforeEach.fn());
            });

            it('should mark failed after each hooks as succeeded', () => {
                const rootSuite = init_({ignoreTestFail: true});
                const afterEach = mkRunnableStub({
                    fn: () => Promise.reject(),
                    ctx: {browser: {}}
                });

                rootSuite.emit('afterEach', afterEach);

                return assert.isFulfilled(afterEach.fn());
            });

            it('should remove assert view results from runnable', () => {
                const rootSuite = init_({ignoreTestFail: true});
                const test = mkTestStub({
                    pending: true,
                    fn: () => Promise.resolve(),
                    ctx: {browser: {}},
                    hermioneCtx: {baz: 'qux', assertViewResults: {foo: 'bar'}}
                });

                rootSuite.emit('test', test);

                return test.fn()
                    .then(() => assert.deepEqual(test.hermioneCtx, {baz: 'qux'}));
            });
        });
    });

    describe('workers', () => {
        it('should not modify suite tree', () => {
            const hermione = mkHermione_();

            hermione.isWorker.returns(true);

            plugin(hermione, {});

            assert.equal(hermione.listeners(hermione.events.AFTER_FILE_READ).length, 0);
        });
    });

    describe('on AFTER_FILE_READ', () => {
        const imitateParsing_ = (rootSuite) => {
            const emit_ = (suite) => {
                suite.suites.forEach((s) => {
                    suite.emit('suite', s);
                    emit_(s);
                });
                suite.tests.forEach((t) => suite.emit('test', t));
            };

            emit_(rootSuite);
        };

        const applyPlugin_ = (rootSuite) => {
            const hermione = mkHermione_();

            plugin(hermione, {enabled: true});

            hermione.emit(hermione.events.BEFORE_FILE_READ, {suite: rootSuite});
            imitateParsing_(rootSuite);
            hermione.emit(hermione.events.AFTER_FILE_READ, {suite: rootSuite});
        };

        it('should leave only pending tests', () => {
            const tree = mkTree({
                someSuite: ['bar test'],
                otherSuite: ['pending test'],
                pendingSuite: ['foo test'],
                otherPendingSuite: ['baz test', 'pending baz test']
            });

            applyPlugin_(tree);

            assert.deepEqual(treeToObj(tree), {
                otherSuite: ['pending test'],
                pendingSuite: ['foo test'],
                otherPendingSuite: ['baz test', 'pending baz test']
            });
        });

        it('should leave pending tests which are nested in several suites', () => {
            const tree = mkTree({
                someSuite: {
                    anotherSuite: ['pending test in nested suite']
                }
            });

            applyPlugin_(tree);

            assert.deepEqual(treeToObj(tree), {
                someSuite: {
                    anotherSuite: ['pending test in nested suite']
                }
            });
        });

        it('should enable pending suites and tests', () => {
            const tree = mkTree({
                pendingSuite: ['foo test'],
                otherSuite: ['pending test'],
                otherPendingSuite: ['bar test', 'pending bar test']
            });

            applyPlugin_(tree);

            flatten(tree).forEach((runnable) => assert.propertyVal(runnable, 'pending', false));
        });
    });
});
