'use strict';

const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;

function mkRunnableStub(opts) {
    opts = _.defaults(opts || {}, {
        title: 'default-title',
        parent: null,
        fn: _.noop,
        pending: /pending/i.test(opts.title)
    });

    return _.defaults(opts, {
        fullTitle: () => opts.parent ? _.compact([opts.parent.fullTitle(), opts.title]).join(' ') : opts.title
    });
}

function mkSuiteStub(opts) {
    return mkRunnableStub(_.extend(new EventEmitter(), opts));
}

function mkTestStub(opts) {
    return mkRunnableStub(opts);
}

/*
 * Create mocha suite tree from simple description
 * @example
 * mkTree({
 *     someSuite: ['Test1', 'Test2'],
 *     otherSuite: {
 *         nextSuite: ['Test3']
 *     },
 *     pendingSuite: ['Test4']
 * });
 *
 * {
 *     parent: null,
 *     title: '',
 *     suites: [
 *         {
 *             title: 'someSuite',
 *             tests: [
 *                 {title: 'Test1'},
 *                 {title: 'Test2'}
 *             ]
 *         },
 *         {
 *             title: 'otherSuite',
 *             suites: [
 *                 {
 *                     title: 'nextSuite',
 *                     tests: [
 *                         {title: 'Test3'}
 *                     ]
 *                 }
 *             ],
 *             tests: []
 *         },
 *         {
 *             title: 'pendingSuite',
 *             pending: true,
 *             suites: [{title: 'Test4'}]
 *         }
 *     ],
 *     tests: [],
 *     ...
 * }
 */
const mkTree = (sceleton, parent, title) => {
    const suite = mkSuiteStub({
        title: title || '',
        parent: parent || null,
        suites: [],
        tests: []
    });

    if (_.isArray(sceleton)) {
        return _.extend(suite, {
            tests: sceleton.map((title) => mkTestStub({title, parent: suite}))
        });
    }

    return _.extend(suite, {
        suites: _.map(sceleton, (value, title) => mkTree(value, suite, title))
    });
};

/*
 * Convert mocha tree to plain object
 * (reverse mkTree function)
 */
const treeToObj = (tree) => {
    if (!_.isEmpty(tree.tests)) {
        return {[tree.title]: _.map(tree.tests, 'title')};
    }

    const valuePieces = tree.suites.map(treeToObj);
    const value = _.merge.apply(null, valuePieces) || {};
    return tree.parent ? {[tree.title]: value} : value;
};

const flatten = (tree) => {
    const flatten_ = (suite, result) => {
        return result.concat(
            suite,
            _.flatten(suite.suites.map((s) => flatten_(s, result))),
            suite.tests
        );
    };

    return flatten_(tree, []);
};

exports.mkSuiteStub = mkSuiteStub;
exports.mkTestStub = mkTestStub;
exports.mkTree = mkTree;
exports.treeToObj = treeToObj;
exports.flatten = flatten;
