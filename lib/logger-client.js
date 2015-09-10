const winston = require('winston');
const Nssocket = require('winston-nssocket').Nssocket;

/**
 * Class encapsulating a client to a winstond server along with wrapper logger methods
 * that take multiple datatypes.
 *
 * @class LoggerClient
 * @constructor
 * @param {Object} serverConfig - Config for connecting to the winstond server
 *   @param {String} [serverConfig.host='localhost']
 *   @param {Number} [serverConfig.port=31094]
 */
class LoggerClient {

	constructor(serverConfig = {}) {
		if (!serverConfig.host) { serverConfig.host = 'localhost'; }
		if (!serverConfig.port) { serverConfig.port = 31094; }
		this.logger = new (winston.Logger)({
			transports: [
				new Nssocket(serverConfig)
			]
		});
	}

	/**
	 * Sends 1 log entry to the server.  The log entry is an object in a specific format.
	 *
	 * ```js
	 *
	 * ```
	 */
	log(entry) {

	}

}

module.exports = LoggerClient;
