const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor(botName) {
    this.botName = botName;
    this.logFile = path.join(logsDir, `${botName}.log`);
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      bot: this.botName,
      level,
      message,
      ...data,
    };

    const logString = JSON.stringify(logEntry);
    console.log(`[${this.botName}] [${level.toUpperCase()}] ${message}`, data);

    // Write to file
    fs.appendFileSync(this.logFile, logString + '\n', { encoding: 'utf8' });
  }

  info(message, data) {
    this.log('info', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }
}

module.exports = Logger;
