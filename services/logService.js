const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json } = format;

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()  // Use JSON format
  ),
  transports: [
    new transports.Console()
  ]
});

module.exports = logger;
