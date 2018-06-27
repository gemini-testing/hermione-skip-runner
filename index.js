'use strict';

const parseConfig = require('./config');

module.exports = (hermione, opts) => {
    const config = parseConfig(opts);
    if (!config.enabled) {
        return;
    }

    hermione.on(hermione.events.AFTER_TESTS_READ, (collection) => {
        collection.eachTest((test) => {
            if (test.pending) {
                if (!test.silentSkip) {
                    test.pending = false;
                }
            } else {
                test.pending = true;
                test.silentSkip = true;
            }
        });
    });

    if (!hermione.isWorker() || !config.ignoreTestFail) {
        return;
    }

    const runTest = hermione.runTest;
    hermione.runTest = function(...args) {
        return runTest.call(this, ...args)
            .then((data) => {
                delete (data.hermioneCtx || {}).assertViewResults;
                return data;
            })
            .catch(() => ({}));
    };
};
