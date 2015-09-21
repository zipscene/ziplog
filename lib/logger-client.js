const winston = require('winston');
const pasync = require('pasync');
const _ = require('lodash');
const Nssocket = require('winston-nssocket').Nssocket;
const Logger = require('./logger');

/**
 * Class encapsulating a client to a winstond server along with wrapper logger methods
 * that take multiple datatypes.
 *
 * @class LoggerClient
 * @constructor
 * @param {Object} serverConfig - Config for connecting to the winstond server
 *   @param {String} [serverConfigc.subSystem] - name of the sub system reporting. defaults to 'general'
 *   @param {String} [serverConfig.host='localhost']
 *   @param {Number} [serverConfig.port=31094]
 */
class LoggerClient extends Logger {

	constructor(serverConfig = {}) {
		super(serverConfig);
		if (!serverConfig.host) { serverConfig.host = 'localhost'; }
		if (!serverConfig.port) { serverConfig.port = 31094; }
		serverConfig.handleExceptions = true;
		this.logger = new (winston.Logger)({
			transports: [
				new Nssocket(serverConfig)
			]
		});
	}

	/**
	 * Retries 4 times to send 1 log entry to the server. The log entry is an object in the format specified in logger.js.
	 * @method log
	 * @param {Object} entry - Entry to log
	 * @return {Promise} - returns a resolved promise
	 */
	logEntry(entry) {
		// converts entry to an object whose `meta` field contains entry.subSystem ,entry.data and entry.details, `level`
		// and `message` field has same value as entry.level and entry.message
		return pasync.retry(4, () => {
			return new Promise((resolve) => {
				this.logger.log(entry.level, entry.message, _.extend({ data: entry.data }, { details: entry.details }, { subSystem: entry.subSystem }), (err) => { /*eslint "max-len": 0*/
					if (err) {
						console.log(err);
					}
					return resolve();
				});
			});
		});
	}

}

module.exports = LoggerClient;
