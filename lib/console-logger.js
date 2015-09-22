let winston = require('winston');
let _ = require('lodash');
let XError = require('xerror');
let Logger = require('./logger');


// This class should be a very basic logger backend that just logs everything to the console.
// It's only used as an intermediate logger for before the actual winstond instance gets initialized.
class ConsoleLogger extends Logger {

	constructor(config = {}) {
		super(config);
		this.logger = new (winston.Logger)({
			transports: [ new (winston.transports.Console)() ]
		});
	}

	/**
	 * Logs entry to console. The log entry is an object in the format specified in logger.js.
	 * @method logEntry
	 * @param {Object} entry - Entry to log.
	 * @return {Promise} - returns a resolved Promise.
	 */
	logEntry(entry) {
		return new Promise((resolve, reject) => {
			this.logger.log(entry.level, entry.message, _.extend({ data: entry.data }, { details: entry.details }, { subsystem: entry.subsystem }), (err) => { /*eslint "max-len": 0*/
				if (err) return reject(XError.wrap(err));
				return resolve();
			});
		});
	}

}

module.exports = ConsoleLogger;
