const XError = require('xerror');
const objtools = require('objtools');
const { expect } = require('chai');
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const pasync = require('pasync');
const ziplog = require('../lib');
const zstreams = require('zstreams');
const childprocess = require('child_process');

const SOCKET_DIR = path.resolve(__dirname, 'ziplog-socket-test');

// Stub a custom write stream into a Ziplog to simplify getting log output.
function ziplogTestStreamWrap(logger) {
	if (logger._wrapped) return logger;
	logger._wrapped = true;
	logger.logOutput = [];
	logger.logBuf = '';
	logger.writeStream = new zstreams.PassThrough();
	logger.writeStreamTail = logger.writeStream
		.pipe(new zstreams.SplitStream('\n'))
		.through((line) => {
			logger.logBuf += line;
			if (line === '}') {
				let logObj = JSON.parse(logger.logBuf);
				logger.logOutput.push(logObj);
				logger.logBuf = '';
			}
		})
		.pipe(new zstreams.BlackholeStream());
	logger.getOutput = function() {
		logger.writeStream.end();
		return this.writeStreamTail.intoPromise()
			.then(() => {
				return this.logOutput;
			});
	};
	return logger;
}

describe('Ziplog', function() {

	after(function() {
		rimraf.sync(SOCKET_DIR);
	});

	it('should provide basic functionality just by requiring the module', async function() {
		expect(ziplog.logger).to.exist;
		expect(typeof ziplog.error).to.equal('function');
		expect(typeof ziplog.warn).to.equal('function');
		expect(typeof ziplog.info).to.equal('function');
		expect(typeof ziplog.debug).to.equal('function');
		expect(typeof ziplog.trace).to.equal('function');
		ziplogTestStreamWrap(ziplog.logger);
		ziplog.info('logtest', { logType: 'test', val: 'a' });
		ziplog.error(new XError(XError.INTERNAL_ERROR, 'errortest', { val: 'b' }));
		let logOutput = await ziplog.logger.getOutput();

		expect(logOutput.length).to.equal(2);
		expect(logOutput[0].app).to.exist;
		expect(logOutput[0].log).to.equal('test');
		expect(logOutput[0]['@timestamp']).to.exist;
		expect(logOutput[0].lvl).to.equal('INFO');
		expect(logOutput[0].message).to.equal('logtest');
		expect(logOutput[0].data).to.deep.equal({ val: 'a' });

		expect(logOutput[1].app).to.exist;
		expect(logOutput[1].log).to.equal('general');
		expect(logOutput[1]['@timestamp']).to.exist;
		expect(logOutput[1].lvl).to.equal('ERROR');
		expect(logOutput[1].message).to.equal('errortest');
		expect(logOutput[1].data).to.deep.equal({ val: 'b' });
		expect(logOutput[1].error).to.exist;
		expect(logOutput[1].error.stack).to.exist;
	});

	it('should allow a new logger to be initialized, with the module object updated accordingly', function() {
		ziplog.initStandalone({ logLevels: [ 'customlevel' ] });
		expect(ziplog.info).to.not.exist;
		expect(typeof ziplog.customlevel).to.equal('function');
		ziplog.initStandalone();
	});

	it('should allow loggers to be directly instaniated', function() {
		let logger = new ziplog.LoggerStandalone();
		expect(typeof logger.log).to.equal('function');
	});

	it('should allow logging to custom levels', async function() {
		let logger = ziplogTestStreamWrap(
			new ziplog.LoggerStandalone({ logLevels: [ 'customlevel' ] })
		);
		logger.customlevel('customlog');
		let logOutput = await logger.getOutput();
		expect(logOutput[0].message).to.equal('customlog');
	});

	it('should suppress log entries based on minLogLevel', async function() {
		let logger = ziplogTestStreamWrap(
			new ziplog.LoggerStandalone({ minLogLevel: 'warn' })
		);
		logger.error('error!');
		logger.warn('warn!');
		logger.info('info!');
		let logOutput = await logger.getOutput();
		expect(logOutput.length).to.equal(2);
		expect(logOutput[0].message).to.equal('error!');
		expect(logOutput[1].message).to.equal('warn!');
	});

	it('should suppress stack traces if configured', async function() {
		let logger = ziplogTestStreamWrap(
			new ziplog.LoggerStandalone({ suppressErrorStack: true })
		);
		logger.error(new XError(XError.INTERNAL_ERROR, 'BAD'));
		let logOutput = await logger.getOutput();
		expect(logOutput.length).to.equal(1);
		expect(logOutput[0].error).to.exist;
		expect(logOutput[0].error.stack).to.not.exist;
	});

	it('should allow for manual appName override', async function() {
		let logger = ziplogTestStreamWrap(
			new ziplog.LoggerStandalone({ appName: 'ziplog-test' })
		);
		logger.debug('debug');
		let logOutput = await logger.getOutput();
		expect(logOutput.length).to.equal(1);
		expect(logOutput[0].app).to.equal('ziplog-test');
	});

	it('should provide the server-client classes needed for multithreaded logging', async function() {
		let logger = ziplogTestStreamWrap(
			new ziplog.LoggerServer({ socketDir: SOCKET_DIR })
		);
		await logger.init();
		logger.info('server1');
		return new Promise((resolve, reject) => {
			let clientProcess = childprocess.fork(
				path.resolve(__dirname, 'util/test-client.js'),
				{ env: { SOCKET_DIR: SOCKET_DIR } }
			);
			clientProcess.on('error', (err) => {
				reject(err);
			});
			clientProcess.on('close', (code) => {
				if (code === 0) return resolve();
				reject(new Error('Child process exited with code ' + code));
			});
		})
			.then(async() => {
				logger.info('server2');
				let logOutput = await logger.getOutput();
				expect(logOutput.length).to.equal(3);
				expect(logOutput[0].message).to.equal('server1');
				expect(logOutput[1].message).to.equal('client1');
				expect(logOutput[2].message).to.equal('server2');
				logger.close();
			});
	});

});
