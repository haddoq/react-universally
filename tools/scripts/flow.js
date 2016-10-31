const existsSync = require('fs').existsSync;
const resolvePath = require('path').resolve;
const appRootPath = require('app-root-path').toString();
const { exec, createNotification } = require('../utils');

const flowTypedDir = resolvePath(appRootPath, 'flow-typed');

if (!existsSync(flowTypedDir)) {
  createNotification({
    title: 'flow',
    level: 'warn',
    message: 'You haven\'t installed the flow-typed definitions. Please run the `npm run flow:defs` command if you would like to install them.',
  });
}

exec('flow');
