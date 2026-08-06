const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const nodemailer = require('nodemailer');

const logger = new Logger('manager-bot');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Import all bots
const bots = {
  'bot-1': { name: 'Bill Retry Supervisor', module: require('./bots/bot-1-bill-retry-supervisor'), schedule: '0 15 * * *' }, // 8 AM MST = 15 UTC
  'bot-2': { name: 'Call Quality Inspector', module: require('./bots/bot-2-call-quality-inspector'), schedule: '0 17 * * *' }, // 10 AM MST = 17 UTC
  'bot-3': { name: 'Negotiation Success Tracker', module: require('./bots/bot-3-negotiation-success-tracker'), schedule: '0 19 * * *' }, // 12 PM MST = 19 UTC
  'bot-4': { name: 'Onboarding Checker', module: require('./bots/bot-4-onboarding-checker'), schedule: '0 13 * * *' }, // 6 AM MST = 13 UTC
  'bot-5': { name: 'Bill Upload Monitor', module: require('./bots/bot-5-bill-upload-monitor'), schedule: '0 */2 * * *' }, // Every 2 hours (UTC)
  'bot-6': { name: 'Webhook Health Checker', module: require('./bots/bot-6-webhook-health-checker'), schedule: '0 22 * * *' }, // 3 PM MST = 22 UTC
  'bot-7': { name: 'Daily Revenue Report', module: require('./bots/bot-7-daily-revenue-report'), schedule: '0 6 * * *' }, // 11 PM MST = 6 AM UTC (next day)
  'bot-8': { name: 'User Engagement Tracker', module: require('./bots/bot-8-user-engagement-tracker'), schedule: '30 6 * * *' }, // 11:30 PM MST = 6:30 AM UTC (next day)
  'bot-9': { name: 'Error Log Analyzer', module: require('./bots/bot-9-error-log-analyzer'), schedule: '0 */4 * * *' }, // Every 4 hours (UTC)
  'bot-10': { name: 'Database Health Monitor', module: require('./bots/bot-10-database-health-monitor'), schedule: '0 8 * * *' }, // 1 AM MST = 8 UTC
  'bot-11': { name: 'API Response Time Monitor', module: require('./bots/bot-11-api-response-time-monitor'), schedule: '0 */6 * * *' }, // Every 6 hours (UTC)
  'bot-13': { name: 'Competitor Monitor', module: require('./bots/bot-13-competitor-monitor'), schedule: '0 7 * * 1' }, // Monday 12 AM MST = 7 UTC
  'bot-14': { name: 'Customer Success Bot', module: require('./bots/bot-14-customer-success-bot'), schedule: '0 2 * * *' }, // 7 PM MST = 2 AM UTC (next day)
  'bot-15': { name: 'Bland Balance Monitor', module: require('./bots/bot-15-bland-balance-monitor'), schedule: '0 14 * * *' }, // 7 AM MST = 14 UTC
  'bot-16': { name: 'Failed Auth Detector', module: require('./bots/bot-16-failed-auth-detector'), schedule: '0 16 * * *' }, // 9 AM MST = 16 UTC
  'bot-17': { name: 'Stale Bill Cleaner', module: require('./bots/bot-17-stale-bill-cleaner'), schedule: '0 7 * * 0' }, // Sunday 12 AM MST = 7 UTC
  'bot-18': { name: 'CFO Bot', module: require('./bots/bot-18-cfo-bot'), schedule: '0 7 * * 1' }, // Monday 12 AM MST = 7 UTC
  'bot-19': { name: 'Cost Optimization Analyst', module: require('./bots/bot-19-cost-optimization-analyst'), schedule: '0 7 * * 1' }, // Monday 12 AM MST = 7 UTC
};

const botManager = {
  lastRuns: {},
  failureLog: [],
  reports: {},

  async executeBotWithErrorRecovery(botKey) {
    try {
      const bot = bots[botKey];
      const startTime = Date.now();

      logger.info(`Starting execution of ${bot.name}`);

      const result = await bot.module.run();

      const duration = Date.now() - startTime;
      this.lastRuns[botKey] = {
        status: 'success',
        duration,
        timestamp: new Date().toISOString(),
        result,
      };

      this.reports[botKey] = {
        name: bot.name,
        status: 'success',
        result,
        timestamp: new Date().toISOString(),
      };

      logger.info(`${bot.name} completed successfully`, { duration, result });
    } catch (error) {
      logger.error(`${bots[botKey].name} failed`, { error: error.message, stack: error.stack });

      this.failureLog.push({
        bot: botKey,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      this.lastRuns[botKey] = {
        status: 'failure',
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.reports[botKey] = {
        name: bots[botKey].name,
        status: 'failure',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  initializeSchedules() {
    logger.info('Initializing bot schedules');

    Object.keys(bots).forEach((botKey) => {
      const bot = bots[botKey];
      cron.schedule(bot.schedule, () => {
        this.executeBotWithErrorRecovery(botKey);
      });
    });

    // Manager bot that synthesizes everything daily at 1 AM MST (8 AM UTC)
    cron.schedule('0 8 * * *', async () => {
      await this.runManagerSynthesis();
    });

    logger.info('All schedules initialized');
  },

  async runManagerSynthesis() {
    try {
      logger.info('Running manager synthesis');

      const successCount = Object.values(this.lastRuns).filter(r => r.status === 'success').length;
      const failureCount = this.failureLog.length;

      const report = {
        timestamp: new Date().toISOString(),
        botsExecuted: Object.keys(this.lastRuns).length,
        successful: successCount,
        failed: failureCount,
        recentFailures: this.failureLog.slice(-5),
        allReports: this.reports,
      };

      logger.info('Manager synthesis complete', report);

      // Send email report
      if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MANAGER_EMAIL) {
        try {
          const emailContent = `
BillAxe Bot Infrastructure Daily Report
=====================================

Timestamp: ${report.timestamp}
Bots Executed: ${report.botsExecuted}
Successful: ${report.successful}
Failed: ${report.failed}

=== All Bot Reports ===
${Object.entries(report.allReports)
  .map(([key, data]) => {
    return `
${data.name} (${key})
Status: ${data.status}
${data.status === 'success' ? `Result: ${JSON.stringify(data.result, null, 2)}` : `Error: ${data.error}`}
Timestamp: ${data.timestamp}
`;
  })
  .join('\n')}

${report.recentFailures.length > 0 ? `\n=== Recent Failures ===\n${report.recentFailures.map(f => `${f.bot}: ${f.error}`).join('\n')}` : ''}
`;

          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.MANAGER_EMAIL,
            subject: `BillAxe Bot Report - ${new Date().toLocaleDateString()}`,
            text: emailContent,
          });

          logger.info('Manager report email sent successfully');
        } catch (emailError) {
          logger.error('Failed to send manager report email', { error: emailError.message });
        }
      }

      // Clear daily reports for next day
      this.failureLog = [];
      this.reports = {};
    } catch (error) {
      logger.error('Manager synthesis failed', { error: error.message, stack: error.stack });
    }
  },
};

// Start the manager
async function start() {
  logger.info('🤖 BillAxe Bot Manager starting up');
  
  try {
    botManager.initializeSchedules();
    logger.info('✅ All bots scheduled and ready');
    
    // Keep process alive
    setInterval(() => {
      logger.debug('Manager heartbeat', {
        botsScheduled: Object.keys(bots).length,
        lastRuns: Object.keys(botManager.lastRuns).length,
      });
    }, 60000);
  } catch (error) {
    logger.error('Failed to start manager', { error: error.message });
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
