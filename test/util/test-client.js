const ziplog = require('../../lib');
const pasync = require('pasync');

async function run() {
	if (!process.env.SOCKET_DIR) throw new Error('No socket dir!');
	await ziplog.initClient({ socketDir: process.env.SOCKET_DIR });
	ziplog.info('client1');
	return pasync.setTimeout(100);
}

run()
	.then(() => {
		process.exit(0);
	})
	.catch(pasync.abort);
