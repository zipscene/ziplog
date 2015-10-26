let Logger = require('./logger');


// This class should be a very basic logger backend that just logs everything to the console.
// It's only used as an intermediate logger for before the actual winstond instance gets initialized.
class ConsoleLogger extends Logger {

	constructor(config = {}) {
		super(config);
	}

	/**
	 * Logs entry to console. The log entry is an object in the format specified in logger.js.
	 * @method logEntry
	 * @param {Object} entry - Entry to log.
	 * @return {Promise} - returns a resolved Promise.
	 */
	logEntry(entry) {
		console.log(JSON.stringify(entry, (key, value) => {
			if (typeof value === 'object' && value && value.stack) {
				value.trace = value.stack.split('\n');
				delete value.stack;
			}
			return value;
		}, 4));
		return Promise.resolve();
	}

}

module.exports = ConsoleLogger;
