
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
class LogServer {

	constructor(config) {
		// Launch the winstond immediately.
	}

	// Helpful links for implementing this class:
	// - http://blog.tompawlak.org/rotate-winston-logs-based-on-time
	// - https://github.com/flatiron/winstond
	// - https://github.com/winstonjs/winston
}

module.exports = LogServer;
