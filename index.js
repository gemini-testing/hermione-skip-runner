'use strict';

const parseConfig = require('./config');
const _ = require('lodash');

module.exports = (hermione, opts) => {
    const config = parseConfig(opts);
    if (!config.enabled) {
        return;
    }

    hermione.on(hermione.events.BEFORE_FILE_READ, (data) => {
        addEventHandler(data.suite, ['suite', 'test'], (runnable) => {
            if (runnable.pending && !runnable.silentSkip) {
                runnable.wasPending = true;
                runnable.pending = false;
                runnable.fn = runnable.fn || (() => Promise.resolve());
            }
        });

        if (config.ignoreTestFail) {
            addEventHandler(data.suite, 'test', (test) => {
                const baseFn = test.fn;

                test.fn = function() {
                    return baseFn.apply(this, arguments)
                        .catch((e) => Boolean(test.ctx.browser) || Promise.reject(e));
                };
            });
        }
    });

    hermione.on(hermione.events.AFTER_FILE_READ, (data) => rmNotPending(data.suite));
};

function addEventHandler(suite, events, cb) {
    events = [].concat(events);

    const listenSuite = (suite) => {
        suite.on('suite', listenSuite);
        events.forEach((e) => suite.on(e, cb));
    };

    listenSuite(suite);
}

function rmNotPending(suite) {
    if (suite.wasPending) {
        return;
    }

    suite.suites.forEach(rmNotPending);
    suite.tests = suite.tests.filter((t) => t.wasPending);
    suite.suites = suite.suites.filter((s) => !_.isEmpty(s.tests));
}
