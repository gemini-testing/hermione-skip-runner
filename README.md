# hermione-skip-runner

Plugin for [hermione](https://github.com/gemini-testing/hermione) which is intended to run skipped tests in order to obtain some data available only in runtime.

You can read more about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install hermione-skip-runner --save-dev
```

## Usage

### Configuration

* **enabled** (optional) `Boolean` – enable/disable the plugin; by default plugin is enabled

### Usage

Add plugin to your `hermione` config file:

```js
module.exports = {
    // ...

    plugins: {
        'skip-runner': {
          enabled: false # in most cases you pobably whant skipped tests to be actually skipped
        }
    },

    // ...
};
```

```bash
hermione_skip_runner_enabled=true ./node_modules/.bin/hermione test
```
