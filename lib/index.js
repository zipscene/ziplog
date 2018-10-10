// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

if (global.__ZS_LOGGER) {
	module.exports = global.__ZS_LOGGER;
} else {
	const _ = require('lodash');
	const LoggerServer = require('./logger-server');
	const LoggerStandalone = require('./logger-standalone');


	let logger;  // The singleton logger instance for this process

	// Sets the global process logger, and sets all of its public methods on the module object.
	function setLogger(newLogger) {
		if (logger) {
			logger.close();
			for (let funcName of logger._logFuncs) {
				delete module.exports[funcName];
			}
		}
		logger = newLogger;
		for (let funcName of logger._logFuncs) {
			module.exports[funcName] = function(...args) {
				return logger[funcName](...args);
			};
		}
	}

	const initServer = async function(config) {
		let server = new LoggerServer(config);
		await server.init();
		setLogger(server);
	}

	const initStandalone = function(config) {
		setLogger(new LoggerStandalone(config));
	}

	module.exports.LoggerServer = LoggerServer;
	module.exports.initServer = initServer;
	module.exports.LoggerStandalone = LoggerStandalone;
	module.exports.initStandalone = initStandalone;
	module.exports.init = initStandalone;

	initStandalone();

	global.__ZS_LOGGER = module.exports;
}
