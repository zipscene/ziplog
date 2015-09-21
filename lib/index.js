const LoggerClient = require('./logger-client');
const LogServer = require('./log-server');

/*
Usage of this file is to call one of initServer(), initClient(), or initStandalone().
Then just require this file wherever it's needed and call .log(), .info(), .error(), etc.

Ie, on the cluster master:

const logger = require('zs-logger');
logger.initServer();
logger.error('A bad error occurred!', myError);

*/

// Initialize this process as a logger server and client.
function initServer(config={}) {
	new LogServer(config); /*eslint "no-new": 0*/
}

module.exports = { initServer, LoggerClient };


