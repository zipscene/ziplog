# Ziplog

Ziplog is a simple, flexible logger, built to handle console logging in a multithreaded environment.

## Simple usage

```javascript
const logger = require('ziplog');

logger.info('Test log message', { logType: 'module-1' }, { lineNum: 277 });

logger.error(new Error('Test error'));
```

The output of these log commands:

```
{
    "app": "ziplog",
    "log": "module-1",
    "lvl": "INFO",
    "@timestamp": "2018-10-11T15:07:42.076Z",
    "message": "Test log message",
    "data": {
        "lineNum": 277
    }
}
{
    "app": "ziplog",
    "log": "general",
    "lvl": "ERROR",
    "@timestamp": "2018-10-11T15:07:42.077Z",
    "error": {
        "message": "Test error"
    },
    "message": "Test error"
}
```

By default, the log levels in decreasing order of severity are [ 'error', 'warn', 'info', 'debug', 'trace' ].
Each of these levels becomes a function on the logger, accepting a variatic number of arguments that may
include a mix of log messages, errors, and arbitrary data objects. The `logType` parameter is a special data
object key that is assigned to the `log` key of the log output.

The logger can be intialized with custom configuration as follows:

```javascript
const logger = require('ziplog');

logger.initStandalone({
	// Override for the supported log levels, sorted by decreasing severity. Each of these becomes a named log function.
	logLevels: [ 'error', 'info', 'silly' ],
	// Any log message less severe than this level will be ignored.
	minLogLevel: [ 'info' ],
	// Suppress the stack trace from logged errors.
	suppressErrorStack: true,
	// Explicity set the 'app' field on log messages. This is pulled from package.json by default.
	appName: 'ziplog-test',
	// Data-writeable stream to write log entries to. Data is written to stdout by default.
	writeStream: process.stderr
});
```

## Multithreaded logging

When logging from multiple node threads simultaneously, the messages as written to standard output can become interwoven
and jumbled. Ziplog provides a log server and client system to ensure this doesn't happen. Under this architecture, the
singleton log server is solely responsible for logging to the console, and clients send their messages to it over
UNIX sockets. This setup is initialized as follows:

```javascript
// Main file
const logger = require('ziplog');
const child_process = require('child-process');

logger.initServer({ /* logger config */ })
	.then(() => {
		logger.info('Log from main');
		child_process.fork('subprocess.js');
	});
```

```javascript
// subprocess.js
const logger = require('ziplog');

logger.initClient({ /* logger config */ })
	.then(() => {
		logger.info('Log from sup process');
	});
```

The socket files for inter-thread communication are stored in a directory named `ziplog-socket` in the project root
directory. You should add this directory to .gitignore.
