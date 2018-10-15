// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');
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
class LoggerClient extends Logger {

	constructor(config = {}) {
		super(config);
		this.socketDir = config.socketDir;
	}

	async init() {
		if (!this.socketDir) this.socketDir = this._findSocketDir();
		this.ipcClient = new net.Socket();
		this.ipcClient.on('error', (err) => {
			// Rethrow any error from the unix socket
			console.log('Fatal error from Ziplog IPC socket: ' + err.message);
			throw err;
		});
		return new Promise((resolve, reject) => {
			this.ipcClient.connect(
				{ path: path.join(this.socketDir, `logger-${process.ppid}`) },
				() => {
					resolve();
				}
			);
		});
	}

	_sendLogEntry(logEntry) {
		if (!this.ipcClient) {
			throw new XError(XError.INTERNAL_ERROR, 'Could not send log message from ziplog client; socket not found');
		}
		this.ipcClient.write(JSON.stringify(logEntry) + '\n');
	}

}

module.exports = LoggerClient;