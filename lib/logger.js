const _ = require('lodash');
const logLevels = require('./log-levels');

/**
 * Abstract class that accepts log entries and logs them ... somehow.
 *
 * @class Logger
 * @constructor
 * @param {String} minLogLevel - Minimum log level to actually log.  Eg, 'info', 'warn', etc.
 */
class Logger {

	constructor(config = {}) {
		this.subsystem = config.subsystem || 'general';
		this.minLogLevel = config.minLogLevel || 'silly';
		this.minLogLevelNumber = logLevels[config.minLogLevel];
		this.keepDays = config.keepDays;
	}

	/**
	 * Abstract function.  Logs an entry.  Should be overridden by subclasses.
	 *
	 * @method logEntry
	 * @param {Object} entry - Object containing data to log
	 *   @param {String} [entry.subsystem='General'] - A string representing the part of the app
	 *     generating the entry.
	 *   @param {String} [entry.level='info'] - The log level.  One of: 'silly', 'debug', 'verbose',
	 *     'info', 'warn', 'error' .
	 *   @param {String} [entry.message] - The log message.
	 *   @param {Mixed} [entry.data] - Additional machine-readable data about the log entry.
	 *   @param {Mixed} [entry.details] - Extra long details about the log entry that are stored
	 *     separately.  Examples include stack traces, request dumps, etc.
	 * @return {Promise} - Resolves when the entry is flushed.
	 */
	logEntry(entry) { /*eslint "no-unused-vars": 0*/
		return Promise.reject(new Error('Unimplemented'));
	}

	/**
	 * Given the variadic arguments to one of the logging functions, returns the log entry object
	 * suitable to be passed to `this.logEntry()`.  The `args` can be in multiple formats.  The idea
	 * is that virtually any data can be passed in here and we'll handle it intelligently.
	 *
	 * Among the supported formats should be:
	 * - this.log([{String}level], {Error}error, {Object}data)
	 * - this.log({Object}entry)
	 * - this.log({String}level, {Object}data, [{Object}details])
	 * - this.log([{String}level], {String}message, [{Object}data], [{Object}details])
	 *
	 * @method _makeLogEntry
	 * @private
	 * @param {Object} fields - Raw fields to copy over to the resulting log entry, overriding
	 *   any fields specified in args.  In some cases (such as in `fields` contains a `level`)
	 *   this may also alter how args is parsed (ie, it won't look for a log level argument).
	 * @param {Mixed[]} ...args - Arguments passed to one of the logger functions.
	 * @return {Object} - The entry object, as specified in `this.logEntry()`.
	 */
	_makeLogEntry(fields = {}, ...args) {
		// The general idea with this function should be to heuristically examine the args to determine
		// which args match up with which types.  The method for doing this is as follows:
		// 1. Iterate through args.  Group each arg according to its type.  The types are:
		//   - log level - A string which is also a valid log level.
		//   - error - An object which is an instance of Error or something inheriting from Error (like XError)
		//   - string - Any string not matching the log level
		//   - mixed - Anything not matching the above (usually object, can also be other primitives)
		// 2. If there is only a single argument given, and it looks like a log entry, treat it as
		//   an already formatted log entry.
		// 3. Copy over anything specified in 'fields' to the result object.
		// 4. Iterate through 'log level' types.  For each one, if the result object does not contain `level`,
		//   copy the value to `result.level`.  If it does contain a level already, prepend the string level
		//   to `result.message` .
		// 5. String types should be concatenated together, separated by ': ' .  These become the message.
		// 6. If any 'error' types were specified, copy all error member properties, except `stack`, to
		//   `result.data` .  If the error has a stack trace (they usually do), copy that into `result.details.stack` .
		//    If more than one `error` type was specified, ignore all but the first.
		// 7. Iterate through mixed types/objects.  The first one should be merged into `result.data` .  All further
		//    ones should be merged into `result.details`.  If one of these mixed types is a primitive instead of an
		//    object, assign it instead to `result.data.data` .
		// 8. Do anything else that you think might be helpful in parsing arbitrary user data.
		// 9. Tests, tests, and more tests!
		// Note that no input should actually be considered invalid as such.  Since this is the logger itself, we
		// don't really have a sane way to report invalid input.  All input should be handled, somehow, and in the
		// worst case silently ignored.
		let result = {
			subsystem: this.subsystem,
			keepDays: this.keepDays
		};
		if (args.length === 1 && _.isObject(args[0]) && args[0].level) {
			return _.isEmpty(fields) ? _.extend(result, args[0]) : _.extend(result, args[0], fields);
		}
		if (!_.isEmpty(fields)) _.extend(result, fields);
		let firstNonErrorObj = true;
		let firstError = true;
		for (let arg of args) {
			if (_.isString(arg)) {
				if (_.contains([ 'silly', 'debug', 'verbose', 'info', 'warn', 'error' ], arg)) {
					if (!result.level) {
						result.level = arg;
					} else {
						result.message = result.message ? `${arg}: ${result.message}` : `${arg}: `;
					}
				} else {
					result.message = result.message ? `${result.message}; ${arg}` : `${arg}`;
				}
			} else if (_.isObject(arg)) {
				if (arg instanceof Error) {
					if (firstError) {
						if (arg.stack) {
							if (!result.details) result.details = {};
							result.details.stack = arg.stack;
						}
						delete arg.stack;
						if (!result.data) result.data = {};
						_.extend(result.data, arg);
						firstError = false;
					}
				} else {
					if (firstNonErrorObj) {
						if (!result.data) result.data = {};
						_.merge(result.data, arg);
						firstNonErrorObj = false;
					} else {
						if (!result.details) result.details = {};
						_.merge(result.details, arg);
					}
				}
			} else {
				if (!result.data) result.data = {};
				if (!result.data.data) result.data.data = [ arg ];
				else result.data.data.push(arg);
			}
		}

		if (!result.level) result.level = 'info';
		return result;
	}

	/**
	 * Logs one entry to the logs at the specified log level.
	 *
	 * @method log
	 * @param {String} level - The log level
	 * @param {Mixed} ...args - See `_makeLogEntry()`
	 * @return {Promise} - Resolve when entry is flushed
	 */
	log(level, ...args) {
		if (!_.isString(level)) {
			args.push(level);
			return this.logEntry(this._makeLogEntry(null, ...args));
		}
		// We do this check here in addition to the check already performed by subclasses in
		// logEntry() because we can skip a lot of reasonably intensive argument parsing code
		// if we're not even going to log the entry.
		if (logLevels[level] < this.minLogLevelNumber) {
			return Promise.resolve();
		}
		return this.logEntry(this._makeLogEntry({ level }, ...args));
	}

	/**
	 * Logs one entry of level 'silly'
	 * @method silly
	 * @return {Promise} - Resolve when entry is flushed
	 */
	silly(...args) {
		return this.log('silly', ...args);
	}

	/**
	 * Logs one entry of level 'debug'
	 * @method debug
	 * @return {Promise} - Resolve when entry is flushed
	 */
	debug(...args) {
		return this.log('debug', ...args);
	}

	/**
	 * Logs one entry of level 'verbose'
	 * @method verbose
	 * @return {Promise} - Resolve when entry is flushed
	 */
	verbose(...args) {
		return this.log('verbose', ...args);
	}

	/**
	 * Logs one entry of level 'info'
	 * @method info
	 * @return {Promise} - Resolve when entry is flushed
	 */
	info(...args) {
		return this.log('info', ...args);
	}

	/**
	 * Logs one entry of level 'warn'
	 * @method warn
	 * @return {Promise} - Resolve when entry is flushed
	 */
	warn(...args) {
		return this.log('warn', ...args);
	}

	/**
	 * Logs one entry of level 'error'
	 * @method error
	 * @return {Promise} - Resolve when entry is flushed
	 */
	error(...args) {
		return this.log('error', ...args);
	}

}

module.exports = Logger;
