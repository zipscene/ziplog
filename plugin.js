/**
 * This is the main entry point for the zs-api plugin zs-logger:
 * lgr
 */

var util = require('util');
var ZSPlugin = require('zsapi-plugin-base');
var LoggerTransports = require('./logger-transports');
//var ZSError = require('zs-error');
var $ = require('zs-jq-stub');
var logLevels = LoggerTransports.logLevels;

/*
ZS-API uses an internal logging mechanism by which objects are sent around, and
finally logged by Winston.  These objects are used internally to allow for more
complex routing.  Winston only supports a message and secondary metadata.  A
typical object used will contain:
- subsystem - The string subsystem that generated the log entry
- level - The log level
- message - A string describing the log message
- data - Data object for the log
- details - Extra details that are logged separately
All of these are optional.
*/

function ZSLogger(zs) {
	var self = this;

	// Call the ZSPlugin superconstructor
	ZSPlugin.call(this, zs, 'zs-logger', __dirname);

	// Load clustercomm
	this.clustercomm = zs.plugins.get('cluster-comm');

	// Load transports
	this.transports = new LoggerTransports(zs.rootDir, this.config);

	// Register the message handler, if this is the master
	if(zs.isClusterMaster()) {
		this.clustercomm.registerRequestHandler('log', function(data, cb) {
			self.transports.logEntry(data.entry, cb);
		});
	}

	// Create a default logger
	this.logger = this.makeLogger({});

	// Alias the logger on ZS
	zs.logger = this.logger;
}
util.inherits(ZSLogger, ZSPlugin);

// Transform a variable set of arguments into a log entry and a callback
ZSLogger.prototype.makeEntryFromArguments = function(args, opts) {
	var entry = {}, cb = function() {};
	var key;

	// Assign defaults from options
	if(opts) {
		for(key in opts) {
			entry[key] = opts[key];
		}
	}

	// Support the following sets of arguments:
	// log([level], error, [data], [cb])
	// log(entry, [cb])
	// log(level, data, [details], [cb])
	// log([level], message, [data], [details])
	var strArgs = [], objArgs = [], errArgs = [], funcArgs = [];
	// divide arguments into strings, errors, objects, and functions
	args.forEach(function(arg) {
		if(typeof arg == 'string') strArgs.push(arg);
		else if(arg instanceof Error || arg.name == 'ZSError') errArgs.push(arg);
		else if(typeof arg == 'function') funcArgs.push(arg);
		else objArgs.push(arg);
	});
	// Check for callback
	if(funcArgs.length) cb = funcArgs[0];
	// Parse the arguments into a log entry
	if(errArgs.length) {
		// Case where there is 1 error in the arguments, with an optional 1 level and an optional 1 data
		var error = errArgs[0];
		if(error.message) entry.message = error.message;
		entry.data = {};
		if(error.code) entry.data.code = error.code;
		function makeErrorDetails(err) {
			var key;
			var details = {};
			for(key in err) {
				if(key != 'cause' && key != 'stack') {
					details[key] = err[key];
				}
			}
			if(err.stack) details.stack = err.stack;
			if(err.cause) details.cause = makeErrorDetails(err.cause);
			return details;
		}
		entry.details = {};
		$.extend(entry.details, makeErrorDetails(error));
		if(strArgs.length == 1) {
			if(opts.level) {
				entry.message = strArgs[0];
			} else {
				entry.level = strArgs[0];
			}
		} else if(strArgs.length > 1) {
			entry.level = strArgs[0];
			entry.message = strArgs[1];
		}
		if(objArgs.length) {
			for(key in objArgs[0]) {
				entry.data[key] = objArgs[0][key];
			}
		}
	} else if(objArgs.length == 1 && !strArgs.length && !errArgs.length) {
		// Case where the full log entry is provided
		for(key in objArgs[0]) {
			entry[key] = objArgs[0][key];
		}
	} else if(strArgs.length == 1 && typeof args[0] == 'string' && objArgs.length) {
		// Case where we have a level, a data, and optional details
		entry.level = strArgs[0];
		entry.data = objArgs[0];
		if(entry.data.toString) entry.message = entry.data.toString();
		if(objArgs[1]) entry.details = objArgs[1];
	} else if(strArgs.length == 1 && !objArgs.length) {
		// Case where we only have a message
		entry.message = strArgs[0];
	} else if(strArgs.length > 1) {
		// Case where we have a level, a message, an optional data, and an optional details
		entry.level = strArgs[0];
		entry.message = strArgs[1];
		if(objArgs.length) entry.data = objArgs[0];
		if(objArgs[1]) entry.details = objArgs[1];
	}

	// Assign defaults
	if(!entry.level) entry.level = 'info';
	if(!entry.message) entry.message = 'Generic Error';
	if(!entry.subsystem) entry.subsystem = 'general';
	if(!entry.details) entry.details = { stack: new Error().stack };

	return {
		entry: entry,
		cb: cb
	};
};

ZSLogger.prototype.logToMaster = function(entry, cb) {
	// Send to the cluster master
	this.clustercomm.masterRequest('log', {entry: entry}, function(error) {
		if(error) console.log('Error sending cluster log message: ', error);
		if(cb) cb(error);
	});
};

ZSLogger.prototype.log = function(entry, cb) {
	if(!cb) cb = function() {};
	// Fill in defaults for the log entry
	if(!entry.subsystem) entry.subsystem = 'general';
	if(!entry.message) {
		if(entry.data && entry.data.toString) entry.message = entry.data.toString();
		else entry.message = 'Generic Error';
	}

	if(this.zs.isClusterMaster()) {
		// Log it out to winston
		this.transports.logEntry(entry, cb);
	} else {
		// Send it to the master
		this.logToMaster(entry, cb);
	}
};

ZSLogger.prototype.makeLogger = function(opts, filter) {
	var self = this;

	function logThroughFilter(entry, cb) {
		if(filter) {
			filter(entry, function(error, fentry) {
				self.log(fentry || entry, cb);
			});
		} else {
			self.log(entry, cb);
		}
	}

	var logger = function() {
		var x = self.makeEntryFromArguments(Array.prototype.slice.call(arguments, 0), opts);
		logThroughFilter(x.entry, x.cb);
	};
	logger.log = logger;
	Object.keys(logLevels).forEach(function(level) {
		var newOpts = {};
		for(var key in opts) {
			newOpts[key] = opts[key];
		}
		logger[level] = function() {
			newOpts.level = level;
			var x = self.makeEntryFromArguments(Array.prototype.slice.call(arguments, 0), newOpts);
			logThroughFilter(x.entry, x.cb);
		};
	});
	logger.logEntry = function(entry, cb) {
		for(var key in opts) {
			if(!entry[key]) entry[key] = opts[key];
		}
		logThroughFilter(entry, cb);
	};
	logger.subsystem = function(subsystem) {
		return self.subsystem(subsystem);
	};
	return logger;
};

ZSLogger.prototype.subsystem = function(subsystem) {
	return this.makeLogger({ subsystem: subsystem });
};

module.exports = ZSLogger;
module.exports.pluginName = 'zs-logger';

module.exports.depends = [ 'cluster-comm' ];
module.exports.pluginAliases = [ 'logger' ];
module.exports.loadOnClusterMaster = true;
