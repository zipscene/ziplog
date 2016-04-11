const Logger = require('./logger');
const objtools = require('zs-objtools');


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
		console.error(JSON.stringify(deepCopyWithTraces(entry), null, 4));

		return Promise.resolve();
	}

}

function deepCopyWithTraces(obj) {
	let res;
	let i;
	let key;
	if (objtools.isScalar(obj)) return obj;
	if (Array.isArray(obj)) {
		res = [];
		for (i = 0; i < obj.length; i++) {
			res.push(deepCopyWithTraces(obj[i]));
		}
	} else {
		res = {};
		for (key in obj) {
			if (key !== 'stack') res[key] = deepCopyWithTraces(obj[key]);
		}
		if (obj.stack) {
			res.trace = obj.stack.split('\n');
		}
	}
	return res;
}

module.exports = ConsoleLogger;
