const logger = require('../lib');
const XError = require('xerror');

logger.initClient()
	.then(() => {
		logger.info('WHAT A JOKE!');
		logger.error(new XError(XError.INVALID_ARGUMENT, 'U MESSED UP KID', { bad: 'thing' }), { logType: 'main' });
	})
	.catch((err) => {
		console.log('FUUUUUUUUUUUUCK');
		console.log(err);
	});