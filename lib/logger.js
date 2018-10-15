// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const _ = require('lodash');
const XError = require('xerror');
const path = require('path');
const fs = require('fs');


const defaultLogLevels = [ 'error', 'warn', 'info', 'debug', 'trace' ];

/**
 * Base class that provides the main logging API to users. This class is extended by the server/client
 * classes to provide the actual logging functionality (either sending it to the server or writing it to stdout)
 *
 * @class Logger
 * @constructor
 * @param {Object} config
 *   @param {Array[String]} [config.logLevels] - Override for the log levels to use for this logger. Each
 *     log level name will become a named method on this instance that creates a log entry to that log level.
 *   @param {String} [config.minLogLevel] - If provided, any log with a higher index than the provided value
 *     will be ignored.
 *   @param {String} [config.appName] - The name of the application using this login. If not provided, ziplog
 *     will attempt to pull it from package.json.
 *   @param {Boolean} {config.suppressErrorStack} - If set, error stack traces will not be included in logs.
 */
class Logger {

	constructor(config = {}) {
		if (config.logLevels) {
			this.logLevels = config.logLevels;
		} else {
			this.logLevels = defaultLogLevels;
		}
		this.minLogLevel = config.minLogLevel;
		this.logLevelMap = {};
		for (let i = 0; i < this.logLevels.length; i++) {
			this.logLevelMap[this.logLevels[i]] = i;
		}

		// Determine the appName for this logger
		if (config.appName) {
			this.appName = config.appName;
		} else {
			this.appName = this._getPjsonName();
			if (!this.appName) this.appName = 'app';
		}

		// Create a function on this instance for each log level
		this._logFuncs = [ 'log' ];
		for (let logLevel of this.logLevels) {
			let funcName = logLevel.toLowerCase();
			this[funcName] = function(...args) {
				return this.log(logLevel, ...args);
			};
			this._logFuncs.push(funcName);
		}

		this.includeErrorStack = !config.suppressErrorStack;
	}

	log(logLevel, ...args) {
		if (typeof this.logLevelMap[logLevel] !== 'number') {
			throw new XError(XError.INVALID_ARGUMENT, `Invalid log level: ${logLevel}`);
		}
		if (this.minLogLevel && (this.logLevelMap[logLevel] > this.logLevelMap[this.minLogLevel])) {
			// Log entry is above the minimum log threshold, so ignore it
			return;
		}
		this._sendLogEntry(this._makeLogEntry(logLevel, ...args));
	}

	/**
	 * Given the variadic arguments to one of the logging functions, returns the log entry object
	 * suitable to be passed to `this.logEntry()`.  The `args` can be in multiple formats.  The idea
	 * is that virtually any data can be passed in here and we'll handle it intelligently.
	 *
	 * Among the supported formats should be:
	 * - this.log([{String}level], {Error}error, {Object}data)
	 * - this.log({String}level, {Object}data, [{Object}details])
	 * - this.log([{String}level], {String}message, [{Object}data], [{Object}details])
	 *
	 * @method _makeLogEntry
	 * @private
	 * @param {String} logLevel - The importance level of this log entry.
	 * @param {Mixed[]} ...args - Arguments passed to one of the logger functions.
	 * @return {Object} - The entry object, as specified in `this.logEntry()`.
	 */
	_makeLogEntry(logLevel, ...args) {
		let logEntry = {
			app: this.appName,
			log: 'general',
			lvl: logLevel.toUpperCase(),
			'@timestamp': (new Date()).toISOString()
		};
		let firstNonErrorObj = true;
		let hasError;
		for (let arg of args) {
			if (_.isString(arg)) {
				// Log message; set to log entry or append it to existing message
				logEntry.message = logEntry.message ? `${logEntry.message}; ${arg}` : `${arg}`;
			} else if (_.isObject(arg)) {
				if (arg instanceof Error) {
					if (hasError) {
						throw new XError(XError.INVALID_ARGUMENT, 'Multiple error arguments to ziplog.log');
					}
					hasError = true;

					if (XError.isXError(arg)) {
						logEntry.error = arg.toObject({ includeStack: this.includeErrorStack });
					} else {
						let errorObj = {};
						for (let prop in arg) {
							errorObj[prop] = arg[prop];
						}
						// Set non-enumerable properties
						if (arg.message) errorObj.message = arg.message;
						if (arg.stack && this.includeErrorStack) errorObj.stack = arg.stack;
						logEntry.error = errorObj;
					}
					if (logEntry.error.message && !logEntry.message) logEntry.message = logEntry.error.message;
					if (logEntry.error.data) {
						if (!logEntry.data) logEntry.data = {};
						_.merge(logEntry.data, logEntry.error.data);
					}

				} else {
					// Plain object; set to log data object and pull out special fields
					if (!logEntry.data) logEntry.data = {};
					_.merge(logEntry.data, arg);
					if (logEntry.data.logType) {
						logEntry.log = logEntry.data.logType;
						delete logEntry.data.logType;
					}
				}
			} else {
				// Unparseable argument
				throw new XError(XError.INVALID_ARGUMENT, 'Unparseable argument to ziplog.log');
			}
		}
		return logEntry;
	}

	/**
	 * Get the path to the directory containing the main module requiring Ziplog.
	 */
	_findProjectRootDir() {
		let dir = path.resolve(path.dirname(require.main.filename));
		let mainModuleDir;
		for (;;) {
			if (fs.existsSync(path.join(dir, 'package.json'))) {
				mainModuleDir = dir;
				break;
			}
			let lastDir = dir;
			dir = path.resolve(dir, '..');
			if (dir === lastDir) break;
		}
		return mainModuleDir;
	}

	/**
	 * Find the name of the project from package.json, if possible.
	 */
	_getPjsonName() {
		let mainModuleDir = this._findProjectRootDir();
		if (!mainModuleDir) return;
		let pjson = require(path.resolve(mainModuleDir, 'package.json'));
		if (pjson.name) return pjson.name;
	}

	/**
	 * Find the path to the UNIX socket this logger should communicate on. Used by both the server and client.
	 */
	_findSocketDir() {
		let mainModuleDir = this._findProjectRootDir();
		if (!mainModuleDir) {
			throw new XError(XError.INTERNAL_ERROR, 'Could not find directory for logger sockets');
		}
		return path.join(mainModuleDir, 'ziplog-socket');
	}

	/**
	 * This function accepts a formatted log entry and routes it to its destination (either the console
	 * directly, or to the server via UNIX socket). It is an abstract function that is implemented by each
	 * logger class.
	 *
	 * @method _sendLogEntry
	 */
	_sendLogEntry(logEntry) {
		throw new XError(XError.INTERNAL_ERROR, 'Unimplemented');
	}

	/**
	 * Perform any cleanup needed when this logger is no longer needed. This does nothing in the base class.
	 *
	 * @method close
	 */
	close() {
		// No action by default
	}
}


module.exports = Logger;
