const winston = require('winston');
const pasync = require('pasync');
const Nssocket = require('winston-nssocket').Nssocket;
const Logger = require('./logger');
const ConsoleLogger = require('./console-logger');

/**
 * Class encapsulating a client to a winstond server along with wrapper logger methods
 * that take multiple datatypes.
 *
 * @class LoggerClient
 * @constructor
 * @param {Object} options - Config for connecting to the winstond server
 *   @param {String} [options.subsystem] - name of the sub system reporting. defaults to 'general'
 *   @param {String} [options.host='localhost']
 *   @param {Number} [options.port=31094]
 */
class LoggerClient extends Logger {

	constructor(options = {}) {
		super(options);
		if (!options.host) { options.host = 'localhost'; }
		if (!options.port) { options.port = 31094; }
		if (!options.socket) {
			options.socket = {
				reconnect: false
			};
		}
		// Replcaite logs to console by default
		if (options.logToConsole !== false) this.logToConsole = true;
		else this.logToConsole = options.logToConsole;
		// A job queue to push log entries to server.
		this.logQueue = pasync.queue(entry => {
			return this.sendEntryToServer(entry);
		}, 2);
		// Paused the queue on start since connection to server is not established yet.
		this.logQueue.pause();
		// A flag indicating whether or not is connected to server.
		this.connected = false;
		// An Nssocket instance to be used as transport.
		let nssocket = new Nssocket(options);

		nssocket.socket.on('start', () => this.onConnect());
		nssocket.socket.on('error', () => {
			this.connected = false;
			this.logQueue.pause();
			nssocket.socket.reconnect();
		});

		// The logger that actually logs data
		this.logger = new (winston.Logger)({
			level: 'silly',
			transports: [ nssocket ]
		});

		this.consoleLogger = new ConsoleLogger(options);
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
		let promise;
		if (this.connected) {
			promise = this.sendEntryToServer(entry);
		} else {
			this.logQueue.push(entry);
			promise = Promise.resolve();
		}
		if (this.logToConsole) this.consoleLogger.logEntry(entry);
		return promise;
	}

	/**
	 * Resume job queue when connected to server.
	 * @method onConnect
	 */
	onConnect() {
		this.connected = true;
		this.logQueue.resume();
	}

	/**
	 * Sends log entry to server
	 * @method sendEntryToServer
	 * @param {Object} entry - log entry
	 * @return {Promise} - returns a promise resolves when log entry successfully sent to server
	 */
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
