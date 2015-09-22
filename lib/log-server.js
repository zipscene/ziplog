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
 *     @param {Number} [config.keepDays.error] - Number of days to keep `error.log` files
 *     @param {Number} [config.keepDays.errorDetails] - Number of days to keep `error-details.log` files
 *     @param {Number} [config.keepDays.mainJson] - Number of days to keep `main.json.log` files
 *     @param {Number} [config.keepDays.errorDetailsJson] - Number of days to keep `error-details.json.log` files
 *     @param {Number} [config.keepDays.detailsJson] - Number of days to keep `details.json.log` files
 */
class LogServer extends winstond.nssocket.Server {

	constructor(config = {}) {
		let logDir = config.logDirectory || './log/';
		let combinedDir = `${logDir}combined/`;
		let transports = _genAllTransports(combinedDir, config.keepDays);

		super({
			services: [ 'collect' ],
			host: config.host || '127.0.0.1',
			port: config.port || 31094,
			transports,
			exitOnError: false
		});
		this.config = config;
		this.logDir = logDir;
		// loggers for all subSystems
		this.loggers = {};
		mkdirp(path.resolve(combinedDir), (err) => {
			if (err) throw error;
			this.listen();
		});
	}

	// Overrides _connectionListener() of winstond.Server.
	// Create a new logger for a new sub system type and save it to this.loggers
	_connectionListener(socket) {
		socket.data([ 'log' ], (log) => {
			if (_.isString(log.meta)) {
				try {
					log.meta = JSON.parse(log.meta);
				} catch (ex) {
					return this.log(log.level, log.message, log.meta);
				}
			}
			let subsystem = log.meta.subsystem;
			if (!subsystem) return this.log(log.level, log.message, log.meta);
			if (!this.loggers[subsystem]) {
				this.loggers[subsystem] = new (winston.Logger)({
					transports: _genAllTransports(`${this.logDir}${subsystem}`, log.meta.keepDays)
				});
			}
			mkdirp(path.resolve(`${this.logDir}${subsystem}`), err => {
				if (err) throw err;
				this.loggers[subsystem].log(log.level, log.message, log.meta);
				this.log(log.level, log.message, log.meta);
			});
		});
	}

	/**
	 * write log in new-line-seperated format
	 * @method newLineFormatter
	 * @param {Object} options
	 *    @param {String} options.message - log message
	 *    @param {Object} options.meta - meta data
	 * @return {String} - returns formatted string
	 */
	newLineFormatter(options) {
		let ret = `timestamp: ${(new Date()).toUTCString()}${os.EOL}level: ${options.level}${os.EOL}`;
		ret += `subsystem: ${options.meta.subsystem}${os.EOL}`;
		if (!_.isString(options.message)) options.message = String(options.message);
		options.message = options.message.replace(/\n|\r|\r\n/g, ' ');
		ret += `message: ${options.message}${os.EOL}`;
		return ret;
	}

	/**
	 * write log in human readable format, which is like json but soam multiple lines
	 * @message humanReadableFormatter
	 * @param {Object} options
	 *    @param {String} options.message - log message
	 *    @param {Object} options.meta - meta data
	 * @return {String} - returns formatted string
	 */
	humanReadableFormatter(options) {
		let logObj = _.pick(options, [ 'level', 'message', 'meta' ]);
		_.extend(logObj, { timestamp: (new Date()).toUTCString() });
		logObj.subsystem = logObj.meta.subsystem;
		logObj.data = logObj.meta.data;
		logObj.details = logObj.meta.details;
		delete logObj.meta;
		let ret = `{${os.EOL}`;

		ret = _iterateObject(logObj, 0, ret);
		ret += `}${os.EOL}`;
		return ret;
	}

	/**
	 * write log in new-line-seperated json format with no details
	 * @message humanReadableFormatter
	 * @param {Object} options
	 *    @param {String} options.message - log message
	 *    @param {Object} options.meta - meta data
	 * @return {String} - returns formatted string
	 */
	jsonFormatter(options) {
		let ret = _.pick(options, [ 'level', 'message', 'meta' ]);
		_.extend(ret, { timestamp: (new Date()).toUTCString() });
		ret.subsystem = ret.meta.subsystem;
		ret.data = ret.meta.data;
		delete ret.meta;
		return `${JSON.stringify(ret)}${os.EOL}`;
	}

	/**
	 * write log in new-line-seperated json format
	 * @message humanReadableFormatter
	 * @param {Object} options
	 *    @param {String} options.message - log message
	 *    @param {Object} options.meta - meta data
	 * @return {String} - returns formatted string
	 */
	detailsJsonFormatter(options) {
		let ret = _.pick(options, [ 'level', 'message', 'meta' ]);
		_.extend(ret, { timestamp: (new Date()).toUTCString() });
		ret.subsystem = ret.meta.subsystem;
		ret.data = ret.meta.data;
		ret.details = ret.meta.details;
		delete ret.meta;
		return `${JSON.stringify(ret)}${os.EOL}`;
	}
}

/**
 * generate daily rotate transport
 * @meta _genDailyRotateTransport
 * @private
 * @param {String} file - file name or path
 * @param {String} logDir - directory to save logs to for this transport
 * @param {String} level - log level for this transport
 * @param {Number} maxFiles - maximum number of files to keep before rotate
 * @param {Function} formatter - formatter function
 * @return {Object} - returns a new DailyRotateFile instance
 */
function _genDailyRotateTransport(file, logDir, level, maxFiles, formatter) {
	if (maxFiles === null || maxFiles === undefined) maxFiles = KEEP_DAYS;
	if (maxFiles === 0) return null;
	return new (winston.transports.DailyRotateFile)({
		name: file,
		level,
		datePattern: '.yyyy-MM-dd',
		filename: file,
		dirname: path.resolve(logDir),
		maxFiles,
		formatter,
		json: false
	});
}

/**
 * generate all transports for a sub system
 * @method _genAllTransports
 * @param {String} dir - directory to save logs to
 * @param {Object} config
 *   @param {Object} [config.keepDays] - Number of days to keep each type of log file.  A value of '0'
 *     means not to create the file at all.  A value of '1' means to delete each rotated file immediately.
 *     @param {Number} [config.keepDays.main] - Number of days to keep `main.log` files
 *     @param {Number} [config.keepDays.error] - Number of days to keep `error.log` files
 *     @param {Number} [config.keepDays.errorDetails] - Number of days to keep `error-details.log` files
 *     @param {Number} [config.keepDays.mainJson] - Number of days to keep `main.json.log` files
 *     @param {Number} [config.keepDays.errorDetailsJson] - Number of days to keep `error-details.json.log` files
 *     @param {Number} [config.keepDays.detailsJson] - Number of days to keep `details.json.log` files
 */
function _genAllTransports(dir, keepDays = {}) {
	let transports = [  ];

	/*eslint-disable max-len */
	transports.push(_genDailyRotateTransport('main.log', dir, 'debug', keepDays.main, LogServer.prototype.newLineFormatter));
	transports.push(_genDailyRotateTransport('error.log', dir, 'error', keepDays.error, LogServer.prototype.newLineFormatter));
	transports.push(_genDailyRotateTransport('error-details.log', dir, 'error', keepDays.errorDetails, LogServer.prototype.humanReadableFormatter));
	transports.push(_genDailyRotateTransport('main.json.log', dir, 'silly', keepDays.mainJson, LogServer.prototype.jsonFormatter));
	transports.push(_genDailyRotateTransport('error-details.json.log', dir, 'error', keepDays.errorDetailsJson, LogServer.prototype.detailsJsonFormatter));
	transports.push(_genDailyRotateTransport('details.json.log', dir, 'silly', keepDays.detailsJson, LogServer.prototype.detailsJsonFormatter));
	/*eslint-enable*/
	return _.filter(transports);
}

/**
 * Recursively iteratie
 */
function _iterateObject(obj, level, ret) {
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
			ret = _iterateObject(obj[key], level + 1, ret);
			ret += `${indent}}${os.EOL}`;
		}
	}
	return ret;
}

module.exports = LogServer;
