# zs-logger

Distributed logging library that works with clusters. It also supports logging for sub systems.

## Install
```bash
$ npm install zs-logger
```
## Usage
On cluster master: 
```javascript
const logger = require('zs-logger');
logger.initServer();
```
When you initialize a zs-logger server. It will start the server on port `31094` locally and creates a directory called `/combined` under path `./log/. By default, all logs from all sub systems will be saved in this directory. It contains following log files:
* main.log - Contains newline-separated timestamps, levels, and log messages from entries. This is in a human-readable non-json format. It contains all log levels above the minimum logged level.
* error.log - Contains newline-separated timestamps, levels, and log messages from entries. This is in the same format as main.log, but only contains errors.
* error-details.log - Contains all information from all log entries of 'error' level. This does not have to be one entry per line, it should be human readable. It's perfectly acceptable for stack traces to span multiple lines.
* main.json.log - Contains all information on all log entries, except `details`, in a newline-separated-json format (where the format in the same format as a log entry, with the addition of a `timestamp` property).
* error-details.json.log - Same format as `main.json.log`, but only contains errors, and does include the `details`.
* details.json.log -  Same format as error-details.json.log, but includes all log entries.

Then, you could create a LoggerClient instance on either cluster master or workers like this:
```javascript
const client = new logger.LoggerClient();

// logs an error
client.error('A bad error occurred!', myError);

// logs a regular info
client.info('queue initialized');
```

`LoggerClient` has following methods:
* log
* silly
* debug
* verbose
* info
* warn
* error
