# ziplog

Distributed logging library that works with clusters. It also supports logging for sub systems.

## Install
```bash
$ npm install ziplog
```

## Usage
- On cluster master:

```javascript
const logger = require('ziplog');
logger.initServer();

// log of level info
logger.info('This is a message');

// log of level error
logger.error(new Error('A error'));
```

- On cluster slaves:

```javascript
const logger = require('ziplog');
logger.initClient();
logger.info('This is a message');

// Create an instance of client when you want to log with a specific subsystem
const client = new logger.LoggerClient({ subsystem: 'mainApp' });
client.info('This is a message');
```

## Logs
When you initialize a ziplog server it starts the server on port `31094` locally and creates a directory called `/combined` under path `./log`.  By default, all logs from all sub systems will be saved in this directory. It contains following log files:

### main.log
- Contains newline-separated timestamps, levels, and log messages from entries. This is in a human-readable non-json format. It contains all log levels above the minimum logged level.

```txt
timestamp: Mon, 21 Sep 2015 19:07:35 GMT
level: error
subsystem: general

timestamp: Mon, 21 Sep 2015 19:07:37 GMT
level: info
subsystem: general
message: This is a message
```

### error.log
- Contains newline-separated timestamps, levels, and log messages from entries. This is in the same format as main.log, but only contains errors.

```txt
timestamp: Mon, 21 Sep 2015 19:07:35 GMT
level: error
subsystem: general
message: This is a message
```

### error-details.log
- Contains all information from all log entries of 'error' level. This does not have to be one entry per line, it should be human readable. It's perfectly acceptable for stack traces to span multiple lines.

```json
{
	"level": "error"
	"timestamp": "Mon, 21 Sep 2015 19:07:35 GMT"
	"subsystem": "general"
	"data": {
	}
	"details": {
	"stack": "Error: An error
		at Context.<anonymous> (test/tests.js:68:11)
		at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)
		at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)
		at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)
		at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12
		at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)
		at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7
		at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)
		at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)
		at processImmediate [as _immediateCallback] (timers.js:345:15)"
	}
}

{
	"level": "error"
	"timestamp": "Mon, 21 Sep 2015 19:07:36 GMT"
	"subsystem": "test"
	"data": {
	}
	"details": {
	"stack": "Error: Another error
		at Context.<anonymous> (test/tests.js:91:11)
		at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)
		at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)
		at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)
		at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12
		at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)
		at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7
		at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)
		at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)
		at processImmediate [as _immediateCallback] (timers.js:345:15)"
	}
}
```

### main.json.log
- Contains all information on all log entries, except `details`, in a newline-separated-json format (where the format in the same format as a log entry, with the addition of a `timestamp` property).

```json
{"level":"error","timestamp":"Mon, 21 Sep 2015 19:07:35 GMT","subsystem":"general","data":{}}

{"level":"error","timestamp":"Mon, 21 Sep 2015 19:07:36 GMT","subsystem":"test","data":{}}

{"level":"info","message":"This is a message","timestamp":"Mon, 21 Sep 2015 19:07:37 GMT","subsystem":"general","data":{"ID":"some ID"}}
```

### error-details.json.log
- Same format as `main.json.log`, but only contains errors, and does include the `details`.

```json
{"level":"error","timestamp":"Mon, 21 Sep 2015 19:07:35 GMT","subsystem":"general","data":{},"details":{"stack":"Error: An error\n    at Context.<anonymous> (test/tests.js:68:11)\n    at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)\n    at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)\n    at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)\n    at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)\n    at processImmediate [as _immediateCallback] (timers.js:345:15)"}}

{"level":"error","timestamp":"Mon, 21 Sep 2015 19:07:36 GMT","subsystem":"test","data":{},"details":{"stack":"Error: Another error\n    at Context.<anonymous> (test/tests.js:91:11)\n    at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)\n    at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)\n    at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)\n    at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)\n    at processImmediate [as _immediateCallback] (timers.js:345:15)"}}
```

### details.json.log
-  Same format as error-details.json.log, but includes all log entries.

```json
{"level":"error","timestamp":"Mon, 21 Sep 2015 19:07:36 GMT","subsystem":"test","data":{},"details":{"stack":"Error: Another error\n    at Context.<anonymous> (test/tests.js:91:11)\n    at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)\n    at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)\n    at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)\n    at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)\n    at processImmediate [as _immediateCallback] (timers.js:345:15)"}}

{"level":"info","message":"This is a message","timestamp":"Mon, 21 Sep 2015 19:07:37 GMT","subsystem":"general","data":{"ID":"some ID"},"details":{"text":"some details"}}

```

Same applies to `logger.initClient()`

ziplog has following methods:
* `log()`
* `silly()`
* `debug()`
* `verbose()`
* `info()`
* `warn()`
* `error()`
