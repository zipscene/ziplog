const winston = require('winston');
const pasync = require('pasync');
const Nssocket = require('winston-nssocket').Nssocket;
const Logger = require('./logger');

/**
 * Class encapsulating a client to a winstond server along with wrapper logger methods
 * that take multiple datatypes.
 *
 * @class LoggerClient
 * @constructor
 * @param {Object} serverConfig - Config for connecting to the winstond server
 *   @param {String} [serverConfig.subsystem] - name of the sub system reporting. defaults to 'general'
 *   @param {String} [serverConfig.host='localhost']
 *   @param {Number} [serverConfig.port=31094]
 */
class LoggerClient extends Logger {

	constructor(serverConfig = {}) {
		super(serverConfig);
		if (!serverConfig.host) { serverConfig.host = 'localhost'; }
		if (!serverConfig.port) { serverConfig.port = 31094; }
		if (!serverConfig.socket) {
			serverConfig.socket = {
				reconnect: false
			};
		}
		this.logQueue = pasync.queue(entry => {
			return this.sendEntryToServer(entry);
		}, 2);
		this.logQueue.pause();
		this.connected = false;
		let nssocket = new Nssocket(serverConfig);

		nssocket.socket.on('start', () => this.onConnect());
		nssocket.socket.on('error', () => {
			this.connected = false;
			this.logQueue.pause();
			nssocket.socket.reconnect();
		});

		this.logger = new (winston.Logger)({
			level: 'silly',
			transports: [ nssocket ]
		});
	}

	/**
	 * Retries 4 times to send 1 log entry to the server. The log entry is an object in the
	 * format specified in logger.js.
	 * @method log
	 * @param {Object} entry - Entry to log
	 * @return {Promise} - returns a promise that resolves when the entry is logged
	 */
	logEntry(entry) {
		// converts entry to an object whose `meta` field contains entry.subsystem,
		// entry.data and entry.details, `level`and `message` field has same value as entry.
		// level and entry.message
		entry.meta = {
			data: entry.data,
			details: entry.details,
			subsystem: entry.subsystem,
			keepDays: entry.keepDays
		};
		if (this.connected) {
			return this.sendEntryToServer(entry);
		} else {
			this.logQueue.push(entry);
			return Promise.resolve();
		}
	}

	onConnect() {
		this.connected = true;
		this.logQueue.resume();
	}

	sendEntryToServer(entry) {
		return new Promise((resolve, reject) => {
			this.logger.log(entry.level, entry.message, entry.meta, (err) => {
				if (err) { return reject(err); }
				return resolve();
			});
		});
	}

}

module.exports = LoggerClient;
