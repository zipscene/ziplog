// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const LoggerStandalone = require('./logger-standalone');
const mkdirp = require('mkdirp');
const net = require('net');
const path = require('path');
const process = require('process');

/**
 * This is the log server class for logging in a multithreaded environment. It opens a UNIX system port,
 * listens for client log messages, and writes them to standard output. It also provides the same functionality
 * as the standalone logger.
 *
 * @class LoggerStandalone
 * @constructor
 * @param {Object} config
 *   @param {String} [config.socketDir] - Override for the directory in which the process sockets are stored.
 */
class LoggerServer extends LoggerStandalone {

	constructor(config = {}) {
		super(config);
		this.socketDir = config.socketDir;
	}

	async init() {
		if (!this.socketDir) this.socketDir = this._findSocketDir();
		try {
			mkdirp.sync(this.socketDir);
		} catch(err) {
			throw new XError(XError.INTERNAL_ERROR, 'Could not create directory for logger sockets', err);
		}

		// Create logger socket
		this.ipcServer = net.createServer();
		return new Promise((resolve, reject) => {
			this.ipcServer.listen(path.join(this.socketDir, `logger-${process.pid}`), (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
	}

}

module.exports = LoggerServer;