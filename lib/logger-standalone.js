// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const Logger = require('./logger');

/**
 * This is the simplest logger class, and the one that will be instantiated by Ziplog.init().
 * It simply writes log entries to standard output (or the provided stream), with no handling
 * for child processes.
 *
 * @class LoggerStandalone
 * @constructor
 * @param {Object} config
 *   @param {WritableStream} config.writeStream - Data writeable stream to write log entries to.
 *     The logger will write to process.stdout by default.
 */
class LoggerStandalone extends Logger {

	constructor(config = {}) {
		super(config);
		this.writeStream = config.writeStream || process.stdout;
	}

	_sendLogEntry(logEntry) {
		let logStr = JSON.stringify(logEntry, null, 4);
		this.writeStream.write(logStr + '\n');
	}

}

module.exports = LoggerStandalone;