'use strict';

const _ = require('lodash');
const configParser = require('gemini-configparser');

const root = configParser.root;
const section = configParser.section;
const option = configParser.option;

const ENV_PREFIX = 'hermione_skip_runner_';
const CLI_PREFIX = '--skip-runner-';

const isBoolean = (option) => {
    return (v) => {
        if (!_.isBoolean(v)) {
            throw new Error(`"${option}" option must be boolean, but got ${typeof v}`);
        }
    };
};

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: true,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: isBoolean('enabled')
        }),
        ignoreTestFail: option({
            defaultValue: false,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: isBoolean('ignoreTestFail')
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const env = process.env;
    const argv = process.argv;

    return getParser()({options, env, argv});
};
