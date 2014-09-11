/**
 * This file contains configuration for the zsapi log transports.
 */

var winston = require('winston');
var fs = require('fs');

// Supported log levels
var logLevels = {
	silly: 0,
	debug: 1,
	verbose: 2,
	info: 3,
	warn: 4,
	error: 5
};

function LoggerTransports(rootDir, config) {
	var directory = config.directory || (rootDir + '/logs');
	var loggerName = config.loggerName;

	if(!fs.existsSync(directory)) {
		fs.mkdirSync(directory);
	}

	var requestLogger;
	var generalLogger;
	var detailsLogger;
	var errorLogger;

	// THIS IS THE ACTUAL LOGGER SETUP
	// MAKE CHANGES TO THE LOGGER CONFIG HERE

	if(loggerName == 'defaultLogger') {

		requestLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/access.log',
					json: false,
					level: 'info',
					handleExceptions: false
				})
			],
			levels: logLevels,
			exitOnError: false	// this is handled by main zsapi
		});

		generalLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/main.log',
					json: true,
					level: 'info',
					handleExceptions: false
				}),
				new (winston.transports.Console)({
					level: 'warn'
				})
			],
			levels: logLevels,
			exitOnError: false	// this is handled by main zsapi
		});

		detailsLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/details.log',
					json: true,
					level: 'error',
					handleExceptions: false
				})
			],
			levels: logLevels,
			exitOnError: false	// this is handled by main zsapi
		});

		errorLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/error.log',
					json: false,
					level: 'error',
					handleExceptions: true
				})
			],
			exitOnError: false	// this is handled by main zsapi
		});

	} else if(loggerName == 'devLogger') {

		requestLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/access.log',
					json: false,
					level: 'info',
					handleExceptions: false
				}),
				new (winston.transports.Console)({
					level: 'debug'
				})
			],
			levels: logLevels,
			exitOnError: false	// this is handled by main zsapi
		});

		generalLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/main.log',
					json: true,
					level: 'info',
					handleExceptions: false
				}),
				new (winston.transports.Console)({
					level: 'debug'
				})
			],
			levels: logLevels,
			exitOnError: false	// this is handled by main zsapi
		});

		detailsLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/details.log',
					json: true,
					level: 'warn',
					handleExceptions: false
				})
			],
			levels: logLevels,
			exitOnError: false	// this is handled by main zsapi
		});

		errorLogger = new (winston.Logger)({
			transports: [
				new (winston.transports.File)({
					timestamp: true,
					filename: directory + '/error.log',
					json: false,
					level: 'error',
					handleExceptions: true
				})
			],
			exitOnError: false	// this is handled by main zsapi
		});

	} else {
		throw new Error('Unknown logger name: ' + loggerName);
	}

	this.requestLogger = requestLogger;
	this.generalLogger = generalLogger;
	this.detailsLogger = detailsLogger;
	this.errorLogger = errorLogger;
}

LoggerTransports.prototype.logEntry = function(entry, cb) {
	if(entry.details) {
		this.detailsLogger.log(entry.level || 'info', entry.message || 'Detailed Log Entry', entry);
	}

	function logTo(logger, entry, cb) {
		if(entry.data) {
			logger.log(entry.level || 'info', entry.message, entry.data, function() {if(cb) cb();});
		} else {
			logger.log(entry.level || 'info', entry.message, function() {if(cb) cb();});
		}
	}

	if(entry.subsystem == 'requests') {
		logTo(this.requestLogger, entry, cb);
	} else {
		logTo(this.generalLogger, entry, cb);
	}

	logTo(this.errorLogger, entry);
};

module.exports = LoggerTransports;


module.exports.logLevels = logLevels;




