'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'hermione_skip_runner_';

const validateBoolean = (val) => {
    if (!_.isBoolean(val)) {
        throw new Error('Option value must be boolean');
    }
};

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            validate: validateBoolean
        }),
        ignoreTestFail: option({
            defaultValue: false,
            parseEnv: JSON.parse,
            validate: validateBoolean
        })
    }), {envPrefix: ENV_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
