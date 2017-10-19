# hermione-skip-runner [![Build Status](https://travis-ci.org/gemini-testing/hermione-skip-runner.svg?branch=master)](https://travis-ci.org/gemini-testing/hermione-skip-runner)

Plugin for [hermione](https://github.com/gemini-testing/hermione) which is intended to run skipped tests in order to obtain some data available only in runtime.

You can read more about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install hermione-skip-runner --save-dev
```

## Usage

### Configuration

* **enabled** (optional) `Boolean` – enable/disable the plugin; by default plugin is enabled
* **ignoreTestFail** (optional) `Boolean` - do not actually fail test on fail (except browser start fail), so you can enable retries; `false` by default

### Usage

Add plugin to your `hermione` config file:

```js
module.exports = {
    // ...

    plugins: {
        'skip-runner': {
          enabled: false, // in most cases you pobably want skipped tests to be actually skipped,
          ignoreTestFail: true
        }
    },

    // ...
};
```

```bash
hermione_skip_runner_enabled=true ./node_modules/.bin/hermione
./node_modules/.bin/hermione --skip-runner-enabled true
```
