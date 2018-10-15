// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const LoggerStandalone = require('./logger-standalone');
const XError = require('xerror');
const fs = require('fs');
const mkdirp = require('mkdirp');
const net = require('net');
const path = require('path');
const process = require('process');
const zstreams = require('zstreams');
const pasync = require('pasync');

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
		} catch (err) {
			throw new XError(XError.INTERNAL_ERROR, 'Could not create directory for logger sockets', err);
		}

		// Cleanup for socket directory; for each existing socket, determine whether the respective process has closed,
		// and delete the socket if it has.
		let socketFiles = fs.readdirSync(this.socketDir);
		for (let socketFile of socketFiles) {
			let regexMatch = /^logger\-([0-9]+)$/.exec(socketFile);
			if (regexMatch && regexMatch[1]) {
				let socketPid = parseInt(regexMatch[1], 10);

				let shouldDelete = false;
				if (socketPid === process.pid) {
					shouldDelete = true;
				} else {
					try {
						process.kill(socketPid, 0);
					} catch (err) {
						if (err.code === 'ESRCH') {
							shouldDelete = true;
						} else {
							throw err;
						}
					}
				}
				if (shouldDelete) {
					fs.unlinkSync(path.resolve(this.socketDir, socketFile));
				}
			}
		}

		// Create logger socket
		this.ipcServer = net.createServer();
		this.ipcServer.on('error', (err) => {
			// Rethrow any error from the unix socket
			console.log('Fatal error from Ziplog IPC socket: ' + err.message);
			throw err;
		});
		this.ipcServer.on('connection', (socket) => {
			// Continuously read error objects from the socket until it closes
			zstreams(socket)
				.pipe(new zstreams.SplitStream('\n'))
				.through((line) => {
					// Write client log object to console
					let logObject = JSON.parse(line);
					this._sendLogEntry(logObject);
				})
				.intoPromise()
				.catch((err) => {
					console.log('Fatal error from Ziplog IPC socket: ' + err.message);
					throw err;
				})
				.catch(pasync.abort);
			/*socket.on('data', (data) => {
				console.log('GOT ' + data.toString());
			});*/
		});
		return new Promise((resolve, reject) => {
			this.ipcServer.listen(path.join(this.socketDir, `logger-${process.pid}`), (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
	}

	close() {
		if (this._closed) return;
		this._closed = true;
		if (this.ipcServer) this.ipcServer.close();
	}

}

module.exports = LoggerServer;