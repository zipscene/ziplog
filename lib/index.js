const _ = require('lodash');
const ConsoleLogger = require('./console-logger');
const LoggerClient = require('./logger-client');
const LogServer = require('./log-server');

/*
Usage of this file is to call one of initServer(), initClient(), or initStandalone().
Then just require this file wherever it's needed and call .log(), .info(), .error(), etc.

Ie, on the cluster master:

const logger = require('zs-logger');
logger.initServer();
logger.error('A bad error occurred!', myError);

On the cluster slaves:

const logger = require('zs-logger');
logger.initClient();
logger.error('A bad error occurred!', myError);

*/

let logger;

// Sets the currently active process logger
function setLogger(newLogger) {
	logger = newLogger;
	_.forEach(Object.getOwnPropertyNames(Object.getPrototypeOf(logger.__proto__)), (key) => { /*eslint "no-proto": 0*/
		if (_.isFunction(logger[key])
			&& _.contains([ 'log', 'silly', 'debug', 'verbose', 'info', 'warn', 'error' ], key)
		) {
			module.exports[key] = function(...args) {
				return logger[key](...args);
			};
		}
	});
}

// Initialize this process as a logger server and client.
function initServer(config={}) {
	new LogServer(config); /*eslint "no-new": 0*/
	initClient(config);
}

// Initialize this process as just a logger client connecting to another log server.
function initClient(config={}) {
	setLogger(new LoggerClient(config));
}

// Calls initServer with the default config of listening on localhost
// Basically an alias of initServer
function initStandalone() {
	initServer({});
	setLogger(new ConsoleLogger({}));
}

module.exports = { initServer, initClient, initStandalone, LoggerClient, ConsoleLogger };