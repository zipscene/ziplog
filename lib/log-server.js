const os = require('os');
const winstond = require('winstond');
const winston = require('winston');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');

// Defau;lt daya to keep log files
const KEEP_DAYS = 7;
/**
 * This class is a wrapper for a winstond server that receives log entries over the local
 * network and logs them out to files.  The files that are logged to are as follows:
 *
 * - '{LOGDIR}/{SUBSYSTEM}/main.log' - Contains newline-separated timestamps, levels, and log messages
 *   from entries.  This is in a human-readable non-json format.  It contains all log levels above the
 *   minimum logged level.
 * - '{LOGDIR}/{SUBSYSTEM}/error.log' - Contains newline-separated timestamps, levels, and log messages
 *   from entries.  This is in the same format as main.log, but only contains errors.
 * - '{LOGDIR}/{SUBSYSTEM}/error-details.log' - Contains all information from all log entries of 'error'
 *   level.  This does not have to be one entry per line, it should be human readable.  It's perfectly
 *   acceptable for stack traces to span multiple lines.
 * - '{LOGDIR}/{SUBSYSTEM}/main.json.log' - Contains all information on all log entries, except `details`,
 *   in a newline-separated-json format (where the format in the same format as a log entry, with the
 *   addition of a `timestamp` property).
 * - '{LOGDIR}/{SUBSYSTEM}/error-details.json.log' - Same format as `main.json.log`, but only contains
 *   errors, and does include the `details`.
 * - '{LOGDIR}/{SUBSYSTEM}/details.json.log' - Same format as error-details.json.log, but includes all
 *   log entries.
 *
 * Additionally, the special subsystem 'combined' directory will contain all subsystem log entries.
 *
 * Log files are rotated once per day.  The format for old, rotated-out files is (for example):
 * `main.log-20150518`
 *
 * Very old log files should be automatically removed.  The frequency of removal is configurable
 * and can be specific to the file type.
 *
 * @class LogServer
 * @constructor
 * @param {Object} config
 *   @param {String} [config.host='127.0.0.1'] - Bind address for the server.  Defaults to only
 *     listening locally.
 *   @param {Number} [config.port=31094] - Port to listen on.
 *   @param {String} [config.logDirectory='./logs/'] - Base directory for logs.
 *   @param {Object} [config.keepDays] - Number of days to keep each type of log file.  A value of '0'
 *     means not to create the file at all.  A value of '1' means to delete each rotated file immediately.
 *     @param {Number} [config.keepDays.main] - Number of days to keep `main.log` files
 *     @param {Number} [config.keepDays.error]
 *     @param {Number} [config.keepDays.errorDetails]
 *     @param {Number} [config.keepDays.mainJson]
 *     @param {Number} [config.keepDays.errorDetailsJson]
 *     @param {Number} [config.keepDays.detailsJson]
 */
class LogServer extends winstond.nssocket.Server {

	constructor(config = {}) {
		let logDir = config.logDirectory || './log/';
		let combinedDir = `${logDir}combined/`;
		let transports = _genAllTransports(combinedDir, config);

		super({
			services: [ 'collect' ],
			host: config.host || '127.0.0.1',
			port: config.port || 31094,
			transports,
			exitOnError: false
		});
		this.config = config;
		this.logDir = logDir;
		this.loggers = {};
		mkdirp(path.resolve(combinedDir), (err) => {
			if (err) throw error;
			this.listen();
		});
	}

	_connectionListener(socket) {
		socket.data([ 'log' ], (log) => {
			if (_.isString(log.mata)) {
				try {
					log.mata = JSON.parse(log.mata);
				} catch (ex) {
					return this.log(log.level, log.message, log.meta);
				}
			}
			let subSystem = log.meta.subSystem;
			if (!subSystem) return this.log(log.level, log.message, log.meta);
			if (!this.loggers[subSystem]) {
				this.loggers[subSystem] = new (winston.Logger)({
					transports: _genAllTransports(`${this.logDir}${subSystem}`, this.config)
				});
			}
			mkdirp(path.resolve(`${this.logDir}${subSystem}`), err => {
				if (err) throw err;
				this.loggers[subSystem].log(log.level, log.message, log.meta);
				this.log(log.level, log.message, log.meta);
			});
		});
	}

	newLineFormatter(options) {
		let ret = `timestamp: ${(new Date()).toUTCString()}${os.EOL}level: ${options.level}${os.EOL}`;
		ret += `subSystem: ${this.meta.subSystem}${os.EOL}`;
		if (!_.isString(options.message)) options.message = String(options.message);
		options.message = options.message.replace(/\n|\r|\r\n/g, ' ');
		ret += `message: ${options.message}${os.EOL}`;
		return ret;
	}

	humanReadableFormatter(options) {
		let logObj = _.pick(options, [ 'level', 'message', 'meta' ]);
		_.extend(logObj, { timestamp: (new Date()).toUTCString() });
		logObj.subSystem = logObj.meta.subSystem;
		logObj.data = logObj.meta.data;
		logObj.details = logObj.meta.details;
		delete logObj.meta;
		let ret = `{${os.EOL}`;

		function iterateObject(obj, level) {
			let indent = '\t';
			while (level-- > 0) {
				indent += '\t';
			}
			for (let key in obj) {
				if (!_.isObject(obj[key])) {
					if (_.isString(obj[key])) obj[key] = obj[key].replace(/\n|\r|\r\n/g, `${os.EOL}${indent}`);
					ret += _.isString(obj[key])
						? `${indent}"${key}": "${obj[key]}"${os.EOL}`
						: `${indent}"${key}": ${obj[key]}${os.EOL}`;
				} else {
					ret += `${indent}"${key}": {${os.EOL}`;
					iterateObject(obj[key], level + 1);
					ret += `${indent}}${os.EOL}`;
				}
			}
		}

		iterateObject(logObj, 0);
		ret += `}${os.EOL}`;
		return ret;
	}

	jsonFormatter(options) {
		let ret = _.pick(options, [ 'level', 'message', 'meta' ]);
		_.extend(ret, { timestamp: (new Date()).toUTCString() });
		ret.subSystem = ret.meta.subSystem;
		ret.data = ret.meta.data;
		delete ret.meta;
		return `${JSON.stringify(ret)}${os.EOL}`;
	}

	detailsJsonFormatter(options) {
		let ret = _.pick(options, [ 'level', 'message', 'meta' ]);
		_.extend(ret, { timestamp: (new Date()).toUTCString() });
		ret.subSystem = ret.meta.subSystem;
		ret.data = ret.meta.data;
		ret.details = ret.meta.details;
		delete ret.meta;
		return `${JSON.stringify(ret)}${os.EOL}`;
	}
}

function _genDailyRotateTransport(file, logDir, level, maxFiles, formatter) {
	return new (winston.transports.DailyRotateFile)({
		name: file,
		level,
		datePattern: '.yyyy-MM-dd',
		filename: file,
		dirname: path.resolve(logDir),
		maxFiles,
		formatter,
		handleExceptions: true,
		humanReadableUnhandledException: true,
		json: false
	});
}

function _genAllTransports(dir, config) {
	let transports = [  ];

	/*eslint-disable max-len */
	transports.push(_genDailyRotateTransport('main.log', dir, 'debug', _.get(config, 'keepDays.main') || KEEP_DAYS, LogServer.prototype.newLineFormatter));
	transports.push(_genDailyRotateTransport('error.log', dir, 'error', _.get(config, 'keepDays.error') || KEEP_DAYS, LogServer.prototype.newLineFormatter));
	transports.push(_genDailyRotateTransport('error-details.log', dir, 'error', _.get(config, 'keepDays.errorDetails') || KEEP_DAYS, LogServer.prototype.humanReadableFormatter));
	transports.push(_genDailyRotateTransport('main.json.log', dir, 'silly', _.get(config, 'keepDays.mainJson') || KEEP_DAYS, LogServer.prototype.jsonFormatter));
	transports.push(_genDailyRotateTransport('error-details.json.log', dir, 'error', _.get(config, 'keepDays.errorDetailsJson') || KEEP_DAYS, LogServer.prototype.detailsJsonFormatter));
	transports.push(_genDailyRotateTransport('details.json.log', dir, 'silly', _.get(config, 'keepDays.detailsJson') || KEEP_DAYS, LogServer.prototype.detailsJsonFormatter));
	/*eslint-enable*/
	return transports;
}

module.exports = LogServer;
