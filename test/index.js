'use strict';

const plugin = require('../');
const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');

describe('plugin', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    describe('test collection modification', () => {
        [
            'master',
            'worker'
        ].forEach((proc) => {
            describe(`in ${proc}`, () => {
                const mkHermione_ = () => {
                    const hermione = new EventEmitter();
                    hermione.events = {
                        AFTER_TESTS_READ: 'afterTestsRead'
                    };
                    hermione.isWorker = sinon.stub().returns(proc === 'worker');
                    return hermione;
                };

                const mkTestCollection = (tests = []) => {
                    return {
                        eachTest: (cb) => tests.forEach(cb)
                    };
                };

                const emitAfterTestsRead = (test) => {
                    const hermione = mkHermione_();
                    plugin(hermione);

                    const collection = mkTestCollection([test]);
                    hermione.emit(hermione.events.AFTER_TESTS_READ, collection);
                };

                describe('config', () => {
                    afterEach(() => {
                        delete process.env['hermione_skip_runner_enabled'];
                    });

                    it('should be enabled by default', () => {
                        const hermione = mkHermione_();
                        sandbox.spy(hermione, 'on');

                        plugin(hermione, {});

                        assert.called(hermione.on);
                    });

                    it('should do nothing if disabled', () => {
                        const hermione = mkHermione_();
                        sandbox.spy(hermione, 'on');

                        plugin(hermione, {enabled: false});

                        assert.notCalled(hermione.on);
                    });

                    it('should enable plugin by environment variable', () => {
                        const hermione = mkHermione_();
                        sandbox.spy(hermione, 'on');
                        process.env['hermione_skip_runner_enabled'] = true;

                        plugin(hermione, {enabled: false});

                        assert.called(hermione.on);
                    });
                });

                it('should enable skipped tests', () => {
                    const test = {pending: true};

                    emitAfterTestsRead(test);

                    assert.propertyVal(test, 'pending', false);
                });

                it('should disable enabled tests', () => {
                    const test = {};

                    emitAfterTestsRead(test);

                    assert.propertyVal(test, 'pending', true);
                    assert.propertyVal(test, 'silentSkip', true);
                });

                it('should do nothing with silently skipped tests', () => {
                    const test = {pending: true, silentSkip: true};

                    emitAfterTestsRead(test);

                    assert.propertyVal(test, 'pending', true);
                    assert.propertyVal(test, 'silentSkip', true);
                });
            });
        });
    });

    describe('wrapping runTest method', () => {
        const mkHermione_ = () => {
            const hermione = new EventEmitter();
            hermione.events = {
                AFTER_TESTS_READ: 'afterTestsRead'
            };
            hermione.isWorker = sinon.stub().returns(true);
            hermione.runTest = sinon.stub().resolves();
            return hermione;
        };

        describe('in master', () => {
            it('should not wrap runTest method', () => {
                const hermione = mkHermione_();
                hermione.isWorker.returns(false);
                const runTest = sinon.spy().named('runTest');
                hermione.runTest = runTest;

                plugin(hermione);

                assert.equal(hermione.runTest, runTest);
            });
        });

        describe('in worker', () => {
            const initPlugin_ = (hermione, opts = {}) => {
                plugin(hermione, _.defaults(opts, {
                    ignoreTestFail: true
                }));
            };

            it('should do nothing if ignoreTestFail option set to false', () => {
                const hermione = mkHermione_();
                const runTest = hermione.runTest;

                initPlugin_(hermione, {ignoreTestFail: false});

                assert.equal(hermione.runTest, runTest);
            });

            it('should call base runTest method', () => {
                const hermione = mkHermione_();
                const runTest = hermione.runTest;

                initPlugin_(hermione);

                hermione.runTest('full title', {some: 'opts'});

                assert.calledOnce(runTest);
                assert.calledOn(runTest, hermione);
                assert.calledWith(runTest, 'full title', {some: 'opts'});
            });

            it('should resolve with base runTest result', async () => {
                const hermione = mkHermione_();
                hermione.runTest.resolves({foo: 'bar'});

                initPlugin_(hermione);

                const result = await hermione.runTest();

                assert.deepEqual(result, {foo: 'bar'});
            });

            it('should not reject on error', async () => {
                const hermione = mkHermione_();
                hermione.runTest.rejects(new Error());

                initPlugin_(hermione);

                try {
                    await hermione.runTest();
                } catch (e) {
                    assert.fail(`should not reject, but got ${e}`);
                }
            });

            it('should resolve with empty object on error', async () => {
                const hermione = mkHermione_();
                hermione.runTest.rejects(new Error());

                initPlugin_(hermione);

                const result = await hermione.runTest();

                assert.deepEqual(result, {});
            });

            it('should remove assertViewResults from test results', async () => {
                const hermione = mkHermione_();
                hermione.runTest.resolves({
                    foo: 'bar',
                    hermioneCtx: {
                        baz: 'qux',
                        assertViewResults: [new Error()]
                    }
                });

                initPlugin_(hermione);

                const result = await hermione.runTest();

                assert.deepEqual(result, {
                    foo: 'bar',
                    hermioneCtx: {baz: 'qux'}
                });
            });
        });
    });
});
