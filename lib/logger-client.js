const winston = require('winston');
const Nssocket = require('winston-nssocket').Nssocket;
const Logger = require('./logger');

/**
 * Class encapsulating a client to a winstond server along with wrapper logger methods
 * that take multiple datatypes.
 *
 * @class LoggerClient
 * @constructor
 * @param {Object} serverConfig - Config for connecting to the winstond server
 *   @param {String} [serverConfigc.subsystem] - name of the sub system reporting. defaults to 'general'
 *   @param {String} [serverConfig.host='localhost']
 *   @param {Number} [serverConfig.port=31094]
 */
class LoggerClient extends Logger {

	constructor(serverConfig = {}) {
		super(serverConfig);
		if (!serverConfig.host) { serverConfig.host = 'localhost'; }
		if (!serverConfig.port) { serverConfig.port = 31094; }
		this.logger = new (winston.Logger)({
			level: 'silly',
			transports: [
				new Nssocket(serverConfig)
			]
		});
	}

	/**
	 * Retries 4 times to send 1 log entry to the server. The log entry is an object in the
	 * format specified in logger.js.
	 * @method log
	 * @param {Object} entry - Entry to log
	 * @return {Promise} - returns a promise that resolves when the entry is logged
	 */
	logEntry(entry) {
		// converts entry to an object whose `meta` field contains entry.subsystem,
		// entry.data and entry.details, `level`and `message` field has same value as entry.
		// level and entry.message
		let meta = {
			data: entry.data,
			details: entry.details,
			subsystem: entry.subsystem,
			keepDays: entry.keepDays
		};
		return new Promise((resolve) => {
			this.logger.log(entry.level, entry.message, meta, (err) => {
				if (err) {
					return reject(err);
				}
				return resolve();
			});
		});
	}

}

module.exports = LoggerClient;
