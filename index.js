const poolMonitor = require('./controllers/poolMonitor');
const logService = require('./services/logService');

poolMonitor.start();

process.on('uncaughtException', (err) => {
  logService.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logService.error(`Unhandled Rejection at: ${promise} - reason: ${reason}`);
  process.exit(1);
});
