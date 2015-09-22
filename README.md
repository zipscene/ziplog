# zs-logger

Distributed logging library that works with clusters. It also supports logging for sub systems.

## Install
```bash
$ npm install zs-logger
```
## Usage
On cluster master: 
```javascript
const logger = require('zs-logger');
logger.initServer();
```
When you initialize a zs-logger server. It will start the server on port `31094` locally and creates a directory called `/combined` under path `./log/. By default, all logs from all sub systems will be saved in this directory. It contains following log files:
* main.log - Contains newline-separated timestamps, levels, and log messages from entries. This is in a human-readable non-json format. It contains all log levels above the minimum logged level.
```txt
timestamp: Mon, 21 Sep 2015 19:07:35 GMT
level: error
subSystem: general
message: undefined

timestamp: Mon, 21 Sep 2015 19:07:37 GMT
level: info
subSystem: general
message: warn: This is a message

```
* error.log - Contains newline-separated timestamps, levels, and log messages from entries. This is in the same format as main.log, but only contains errors.
```txt
timestamp: Mon, 21 Sep 2015 19:07:35 GMT
level: error
subSystem: general
message: undefined

```
* error-details.log - Contains all information from all log entries of 'error' level. This does not have to be one entry per line, it should be human readable. It's perfectly acceptable for stack traces to span multiple lines.
```txt
{
	"level": "error"
	"message": "undefined"
	"timestamp": "Mon, 21 Sep 2015 19:07:35 GMT"
	"subSystem": "general"
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
	"message": "undefined"
	"timestamp": "Mon, 21 Sep 2015 19:07:36 GMT"
	"subSystem": "test"
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
* main.json.log - Contains all information on all log entries, except `details`, in a newline-separated-json format (where the format in the same format as a log entry, with the addition of a `timestamp` property).
```txt
{"level":"error","message":"undefined","timestamp":"Mon, 21 Sep 2015 19:07:35 GMT","subSystem":"general","data":{}}

{"level":"error","message":"undefined","timestamp":"Mon, 21 Sep 2015 19:07:36 GMT","subSystem":"test","data":{}}

{"level":"info","message":"warn: This is a message","timestamp":"Mon, 21 Sep 2015 19:07:37 GMT","subSystem":"general","data":{"ID":"some ID"}}

```
* error-details.json.log - Same format as `main.json.log`, but only contains errors, and does include the `details`.
```txt
{"level":"error","message":"undefined","timestamp":"Mon, 21 Sep 2015 19:07:35 GMT","subSystem":"general","data":{},"details":{"stack":"Error: An error\n    at Context.<anonymous> (test/tests.js:68:11)\n    at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)\n    at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)\n    at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)\n    at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)\n    at processImmediate [as _immediateCallback] (timers.js:345:15)"}}

{"level":"error","message":"undefined","timestamp":"Mon, 21 Sep 2015 19:07:36 GMT","subSystem":"test","data":{},"details":{"stack":"Error: Another error\n    at Context.<anonymous> (test/tests.js:91:11)\n    at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)\n    at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)\n    at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)\n    at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)\n    at processImmediate [as _immediateCallback] (timers.js:345:15)"}}

```
* details.json.log -  Same format as error-details.json.log, but includes all log entries.
```txt
{"level":"error","message":"undefined","timestamp":"Mon, 21 Sep 2015 19:07:36 GMT","subSystem":"test","data":{},"details":{"stack":"Error: Another error\n    at Context.<anonymous> (test/tests.js:91:11)\n    at callFn (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:251:21)\n    at Test.Runnable.run (/Users/yhan/npm/lib/node_modules/mocha/lib/runnable.js:244:7)\n    at Runner.runTest (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:374:10)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:452:12\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:299:14)\n    at /Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:309:7\n    at next (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:248:23)\n    at Object._onImmediate (/Users/yhan/npm/lib/node_modules/mocha/lib/runner.js:276:5)\n    at processImmediate [as _immediateCallback] (timers.js:345:15)"}}

{"level":"info","message":"warn: This is a message","timestamp":"Mon, 21 Sep 2015 19:07:37 GMT","subSystem":"general","data":{"ID":"some ID"},"details":{"text":"some details"}}

```

Then, you could create a LoggerClient instance on either cluster master or workers like this:
```javascript
const client = new logger.LoggerClient();

// logs an error
client.error('A bad error occurred!', myError);

// logs a regular info
client.info('queue initialized');
```

`LoggerClient` has following methods:
* log
* silly
* debug
* verbose
* info
* warn
* error
