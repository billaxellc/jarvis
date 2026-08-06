const Logger = require('../logger');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');

const logger = new Logger('bot-12-manager-bot');

async function sendReport(report) {
  try {
    // Create transporter for email
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    const emailContent = `
    <h2>BillAxe Daily Bot Report</h2>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    
    <h3>What Worked</h3>
    ${report.successes.map(s => `<li>${s}</li>`).join('')}
    
    <h3>Issues Detected</h3>
    ${report.issues.length > 0 ? report.issues.map(i => `<li>${i}</li>`).join('') : '<p>None</p>'}
    
    <h3>Actions Needed</h3>
    ${report.actionItems.length > 0 ? report.actionItems.map(a => `<li>${a}</li>`).join('') : '<p>None</p>'}
    `;

    await transporter.sendMail({
      from: config.email.user,
      to: config.email.reportEmail,
      subject: 'BillAxe Daily Bot Report',
      html: emailContent,
    });

    logger.info('Report email sent successfully');
  } catch (err) {
    logger.error('Failed to send report email', { error: err.message });
  }
}

async function run() {
  try {
    logger.info('Starting manager bot orchestration');

    // Read all bot log files
    const logsDir = path.join(__dirname, '../logs');
    const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));

    const report = {
      timestamp: new Date().toISOString(),
      successes: [],
      issues: [],
      actionItems: [],
    };

    // Parse logs from all bots
    for (const logFile of logFiles) {
      const content = fs.readFileSync(path.join(logsDir, logFile), 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.level === 'error') {
            report.issues.push(`${entry.bot}: ${entry.message}`);
          } else if (entry.level === 'warn') {
            report.actionItems.push(`${entry.bot}: ${entry.message}`);
          }
        } catch (e) {
          // Skip parse errors
        }
      }
    }

    report.successes.push(`${logFiles.length} bots executed successfully`);

    logger.info('Manager bot synthesis complete', {
      issues: report.issues.length,
      actions: report.actionItems.length,
    });

    // Send report email
    await sendReport(report);

    return {
      status: 'success',
      report,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
