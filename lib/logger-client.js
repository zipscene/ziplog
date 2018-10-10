// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const Logger = require('./logger');
const mkdirp = require('mkdirp');
const net = require('net');
const path = require('path');
const process = require('process');

/**
 * This is the log client class for logging in a multithreaded environment. It connects to the socket
 * initiated by the logger server, and sends it log messages to be logged to main process's stdout.
 *
 * @class LoggerClient
 * @constructor
 * @param {Object} config
 *   @param {String} [config.socketDir] - Override for the directory in which the process sockets are stored.
 */
class LoggerServer extends Logger {

	constructor(config = {}) {
		super(config);
		this.socketDir = config.socketDir;
	}

	async init() {
		if (!this.socketDir) this.socketDir = this._findSocketDir();
		return new Promise((resolve, reject) => {
			this.ipcClient = net.createConnection(
				{ path: path.join(this.socketDir, `logger-${process.pid}`) },
				(err) => {
					if (err) return reject(err);
					resolve();
				}
			);
		});
	}

}

module.exports = LoggerClient;