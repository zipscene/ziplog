const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require('moment');
const _ = require('lodash');
const promisify = require('es6-promisify');
const expect = require('chai').expect;
const ZSLogger = require('../lib/index');
const Logger = require('../lib/logger');

const now = moment();
const dateStr = now.format('YYYY-MM-DD');
const stat = promisify(fs, stat);
const readdir = promisify(fs.readdir);
const rimraf = promisify(require('rimraf'));
const exec = require('child_process').exec;

describe('zs-logger', () => {

	before(function() {
		this.timeout(5000);

		return rimraf(path.resolve('./log/'))
			.then(ZSLogger.initServer)
			.then(() => {
				return new Promise((resolve) => {
					setTimeout(resolve, 4000);
				});
			});
	});

	it(`shouldn't create main log for keepDays,main = 0`, () => {
		let client = new ZSLogger.LoggerClient({
			subsystem: 'temp',
			keepDays: {
				main: 0
			}
		});
		client.info(`This shouldn't be logged.`);
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				readdir(path.resolve('./log/temp'))
					.then(files => {
						expect(files).to.not.include(`main.log.${dateStr}`);
						resolve();
					})
					.catch(reject);
			}, 1000);
		});
	});

	it('should log info to main.log, main.json.log, details.json.log and in expected format', function() {
		ZSLogger.info('This is a message', { key: 'some data' });

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				readdir(path.resolve(`./log/combined/`))
					.then(files => {
						expect(files).to.include(`main.log.${dateStr}`);
						expect(files).to.include(`main.json.log.${dateStr}`);
						expect(files).to.include(`details.json.log.${dateStr}`);
						resolve();
					})
					.catch(reject);
			}, 1000);
		})
		.then(() => { return readdir(path.resolve(`./log/general/`)); })
		.then(files => {
			expect(files).to.include(`main.log.${dateStr}`);
			expect(files).to.include(`main.json.log.${dateStr}`);
			expect(files).to.include(`details.json.log.${dateStr}`);
		})
		.then(() => {
			return new Promise((resolve, reject) => {
				exec(`tail -n2 ./log/general/main.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					expect(stdout).to.include(`message: This is a message${os.EOL}`);
					return resolve();
				});
			});
		});

	});

	it('should log an entry of level error', function() {
		this.timeout(2000);
		ZSLogger.log('error', new Error('A test error'));

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n5 ./log/general/main.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					expect(stdout).to.contain('level: error');
					expect(stdout).to.contain('subsystem', 'general');
					expect(stdout).to.contain('timestamp');
					expect(stdout).to.not.contain('message');
					return resolve();
				});
			}, 1000);
		});
	});

	it('should log an entry of level silly', function() {
		this.timeout(3000);
		ZSLogger.silly('A silly message', { key: 'silly data' });

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n3 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					let lines = stdout.split(`${os.EOL}`);
					let line = _.find(lines, line => !_.isEmpty(line));
					try {
						line = JSON.parse(line);
					} catch (ex) { return reject(ex); }
					expect(line).to.have.property('level', 'silly');
					expect(line).to.have.property('message', 'A silly message');
					expect(line.data.key).to.equal('silly data');
					return resolve();
				});
			}, 2000);
		});
	});

	it('should log an entry of level debug', () => {
		ZSLogger.debug('A debug message', { key: 'debug data' });

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n3 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					let lines = stdout.split(`${os.EOL}`);
					let line = _.find(lines, line => !_.isEmpty(line));
					try {
						line = JSON.parse(line);
					} catch (ex) { return reject(ex); }
					expect(line).to.have.property('level', 'debug');
					expect(line).to.have.property('message', 'A debug message');
					expect(line.data.key).to.equal('debug data');
					return resolve();
				});
			}, 1000);
		});
	});

	it('should log an entry of level warn', () => {
		ZSLogger.warn('A warn message', { key: 'warn data' });

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n3 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					let lines = stdout.split(`${os.EOL}`);
					let line = _.find(lines, line => !_.isEmpty(line));
					try {
						line = JSON.parse(line);
					} catch (ex) { return reject(ex); }
					expect(line).to.have.property('level', 'warn');
					expect(line).to.have.property('message', 'A warn message');
					expect(line.data.key).to.equal('warn data');
					return resolve();
				});
			}, 1000);
		});
	});

	it('should log an entry of level verbose', () => {
		ZSLogger.verbose('A verbose message', { key: 'verbose data' });

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n3 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					let lines = stdout.split(`${os.EOL}`);
					let line = _.find(lines, line => !_.isEmpty(line));
					try {
						line = JSON.parse(line);
					} catch (ex) { return reject(ex); }
					expect(line).to.have.property('level', 'verbose');
					expect(line).to.have.property('message', 'A verbose message');
					expect(line.data.key).to.equal('verbose data');
					return resolve();
				});
			}, 1000);
		});
	});


	it('should log error to all log files', function() {
		this.timeout(3000);
		return ZSLogger
			.error(new Error('An error'))
			.then(() => {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						readdir(path.resolve(`./log/combined/`))
							.then(files => {
								expect(files).to.include(`main.log.${dateStr}`);
								expect(files).to.include(`main.json.log.${dateStr}`);
								expect(files).to.include(`details.json.log.${dateStr}`);
								expect(files).to.include(`error.log.${dateStr}`);
								expect(files).to.include(`error-details.log.${dateStr}`);
								expect(files).to.include(`error-details.json.log.${dateStr}`);
								resolve();
							})
							.catch(reject);
					}, 1000);
				});
			});
	});

	it('should ignore errors other than first when logging multiple', () => {
		return ZSLogger
			.error(new Error('first error'), new Error('second error'), new Error('third error'))
			.then(() => {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						exec(`tail -n2 ./log/general/error-details.json.log.${dateStr}`, (err, stdout) => {
							if (err) return reject(err);
							expect(stdout).to.contain('first error');
							expect(stdout).to.not.contain('second error');
							expect(stdout).to.not.contain('third error');
							expect(stdout).to.not.contain('message');
							return resolve();
						});
					}, 1000);
				});
			});
	});

	it('should log error in sub folder /test for sub system `test`', () => {
		let client = new ZSLogger.LoggerClient({ subsystem: 'test' });
		return client
			.error(new Error('Another error'))
			.then(() => {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						readdir(path.resolve('./log/test'))
							.then(files => {
								expect(files).to.include(`main.log.${dateStr}`);
								expect(files).to.include(`main.json.log.${dateStr}`);
								expect(files).to.include(`details.json.log.${dateStr}`);
								expect(files).to.include(`error.log.${dateStr}`);
								expect(files).to.include(`error-details.log.${dateStr}`);
								expect(files).to.include(`error-details.json.log.${dateStr}`);
								resolve();
							})
							.catch(reject);
					}, 1000);
				});
			});
	});

	it('should merge multiple objects into details field', () => {
		ZSLogger
			.debug({
				name: 'foo',
				ID: 'test ID'
			}, {
				text: 'super long text',
				text3: 'some other text'
			}, {
				text: 'not long text',
				text2: 'some more text'
			});
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n2 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					try {
						stdout = JSON.parse(stdout);
					} catch (ex) { return reject(ex); }
					expect(stdout).to.have.property('level', 'debug');
					expect(stdout.data).to.eql({
						name: 'foo',
						ID: 'test ID'
					});
					expect(stdout.details).to.eql({
						text: 'not long text',
						text2: 'some more text',
						text3: 'some other text'
					});
					return resolve();
				});
			}, 1000);
		});
	});

	it('should log with input of message, data, details', function() {
		this.timeout(3000);
		let client =  new ZSLogger.LoggerClient();
		return client
			.info('This is a message', 'warn', { ID: 'some ID' }, { text: 'some details' })
			.then(() => {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						exec(`tail -n2 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
							if (err) return reject(err);
							try {
								stdout = JSON.parse(stdout);
							} catch (ex) { return reject(ex); }
							expect(stdout).to.have.property('level', 'info');
							expect(stdout).to.have.property('message', 'warn: This is a message');
							expect(stdout).to.have.property('subsystem', 'general');
							expect(stdout.data.ID).to.equal('some ID');
							expect(stdout.details.text).to.equal('some details');
							return resolve();
						});
					}, 1000);
				});
			});
	});

	it('should use log level info when logging without level', function() {
		this.timeout(3000);
		let client =  new ZSLogger.LoggerClient();
		return client
			.log({
				ID: 'some ID'
			})
			.then(() => {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						exec(`tail -n2 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
							if (err) return reject(err);
							try {
								stdout = JSON.parse(stdout);
							} catch (ex) { return reject(ex); }
							expect(stdout).to.have.property('level', 'info');
							expect(stdout).to.have.property('subsystem', 'general');
							expect(stdout.data.ID).to.equal('some ID');
							return resolve();
						});
					}, 1000);
				});
			});
	});

	it('should log multiple', function() {
		this.timeout(3000);
		let client = new ZSLogger.LoggerClient();
		client.info('first message');
		client.info('second message');
		client.error(new Error('Test error'));
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n6 ./log/general/details.json.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);
					let entries = _(stdout.split(`${os.EOL}`))
						.chain()
						.filter(entry => { return entry.length; })
						.map(JSON.parse)
						.value();
					expect(entries[0]).to.have.property('level', 'info');
					expect(entries[0]).to.have.property('message', 'first message');
					expect(entries[1]).to.have.property('level', 'info');
					expect(entries[1]).to.have.property('message', 'second message');
					expect(entries[2]).to.have.property('level', 'error');

					return resolve();
				});
			}, 1000);
		});
	});

	it('should log timestamp, level and subsystem with no logging arguments', () => {
		ZSLogger.info();

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n6 ./log/general/main.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);

					expect(stdout).to.contain(`timestamp: `);
					expect(stdout).to.contain('subsystem: general');
					expect(stdout).to.contain('level: info');
					expect(stdout).to.not.contain('message: ');
					return resolve();
				});
			}, 1000);
		});
	});

	it('should log to error-details.log in right format', () => {
		ZSLogger.error(new Error('A test error'));

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				exec(`tail -n22 ./log/general/error-details.log.${dateStr}`, (err, stdout) => {
					if (err) return reject(err);

					expect(stdout).to.contain(`{${os.EOL}\t"level": "error"`);
					expect(stdout).to.contain(`\t"subsystem": "general"${os.EOL}\t"data": {
\t}${os.EOL}\t"details": {${os.EOL}\t"stack": "Error: A test error${os.EOL}\t    `);
					return resolve();
				});
			}, 1000);
		});
	});

});

describe('logger', () => {
	it('should return valid log entry for input of a single entry', () => {
		let logger = new Logger({});

		let entry = logger._makeLogEntry({
			level: 'info'
		}, {
			level: 'warn',
			message: 'This is a warning',
			subsystem: 'test',
			data: {
				field: 'some data'
			},
			details: {
				field: 'some details'
			}
		});

		expect(entry).to.have.property('level', 'info');
		expect(entry).to.have.property('message', 'This is a warning');
		expect(entry).to.have.property('subsystem', 'test');
		expect(entry.data.field).to.equal('some data');
		expect(entry.details.field).to.equal('some details');
	});

	it('should return valid log entry for error and data', () => {
		let logger = new Logger({ subsystem: 'test2' });

		let entry = logger._makeLogEntry({
			level: 'error'
		}, new Error('A test error'), { ID: 'some ID' });

		expect(entry).to.have.property('level', 'error');
		expect(entry).to.have.property('subsystem', 'test2');
		expect(entry).to.not.have.property('message');
		expect(entry.data.ID).to.equal('some ID');
	});

	it('should return valid log entry for level, data, details', () => {
		let logger = new Logger({ subsystem: 'test2' });

		let entry = logger._makeLogEntry({
			level: 'info'
		}, { ID: 'some ID' }, { text: 'some details' });

		expect(entry).to.have.property('level', 'info');
		expect(entry).to.not.have.property('message');
		expect(entry).to.have.property('subsystem', 'test2');
		expect(entry.data.ID).to.equal('some ID');
		expect(entry.details.text).to.equal('some details');
	});

	it('should return valid log entry for message, data, details', () => {
		let logger = new Logger({});

		let entry = logger._makeLogEntry({
			level: 'warn'
		}, 'This is a message', { ID: 'some ID' }, { text: 'some details' });

		expect(entry).to.have.property('level', 'warn');
		expect(entry).to.have.property('message', 'This is a message');
		expect(entry).to.have.property('subsystem', 'general');
		expect(entry.data.ID).to.equal('some ID');
		expect(entry.details.text).to.equal('some details');
	});
});