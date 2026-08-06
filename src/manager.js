const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

const logger = new Logger('manager-bot');

// Import all bots
const bots = {
  'bot-1': { name: 'Bill Retry Supervisor', module: require('./bots/bot-1-bill-retry-supervisor'), schedule: '0 8 * * *' },
  'bot-2': { name: 'Call Quality Inspector', module: require('./bots/bot-2-call-quality-inspector'), schedule: '0 10 * * *' },
  'bot-3': { name: 'Negotiation Success Tracker', module: require('./bots/bot-3-negotiation-success-tracker'), schedule: '0 12 * * *' },
  'bot-4': { name: 'Onboarding Checker', module: require('./bots/bot-4-onboarding-checker'), schedule: '0 6 * * *' },
  'bot-5': { name: 'Bill Upload Monitor', module: require('./bots/bot-5-bill-upload-monitor'), schedule: '0 */2 * * *' },
  'bot-6': { name: 'Webhook Health Checker', module: require('./bots/bot-6-webhook-health-checker'), schedule: '0 15 * * *' },
  'bot-7': { name: 'Daily Revenue Report', module: require('./bots/bot-7-daily-revenue-report'), schedule: '0 23 * * *' },
  'bot-8': { name: 'User Engagement Tracker', module: require('./bots/bot-8-user-engagement-tracker'), schedule: '30 23 * * *' },
  'bot-9': { name: 'Error Log Analyzer', module: require('./bots/bot-9-error-log-analyzer'), schedule: '0 */4 * * *' },
  'bot-10': { name: 'Database Health Monitor', module: require('./bots/bot-10-database-health-monitor'), schedule: '0 1 * * *' },
  'bot-11': { name: 'API Response Time Monitor', module: require('./bots/bot-11-api-response-time-monitor'), schedule: '0 */6 * * *' },
  'bot-13': { name: 'Competitor Monitor', module: require('./bots/bot-13-competitor-monitor'), schedule: '0 0 * * 1' },
  'bot-14': { name: 'Customer Success Bot', module: require('./bots/bot-14-customer-success-bot'), schedule: '0 19 * * *' },
  'bot-15': { name: 'Bland Balance Monitor', module: require('./bots/bot-15-bland-balance-monitor'), schedule: '0 7 * * *' },
  'bot-16': { name: 'Failed Auth Detector', module: require('./bots/bot-16-failed-auth-detector'), schedule: '0 9 * * *' },
  'bot-17': { name: 'Stale Bill Cleaner', module: require('./bots/bot-17-stale-bill-cleaner'), schedule: '0 0 * * 0' },
  'bot-18': { name: 'CFO Bot', module: require('./bots/bot-18-cfo-bot'), schedule: '0 0 * * 1' },
  'bot-19': { name: 'Cost Optimization Analyst', module: require('./bots/bot-19-cost-optimization-analyst'), schedule: '0 0 * * 1' },
};

const botManager = {
  lastRuns: {},
  failureLog: [],

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

      logger.info(`${bot.name} completed successfully`, { duration });
    } catch (error) {
      logger.error(`${bots[botKey].name} failed`, { error: error.message });

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

    // Manager bot that synthesizes everything daily at 6 AM
    cron.schedule('0 6 * * *', async () => {
      await this.runManagerSynthesis();
    });

    logger.info('All schedules initialized');
  },

  async runManagerSynthesis() {
    try {
      logger.info('Running manager synthesis');

      // Read logs and compile report
      const logsDir = path.join(__dirname, 'logs');
      const report = {
        timestamp: new Date().toISOString(),
        botsExecuted: Object.keys(this.lastRuns).length,
        successful: Object.values(this.lastRuns).filter(r => r.status === 'success').length,
        failed: this.failureLog.length,
        recentFailures: this.failureLog.slice(-5),
      };

      logger.info('Manager synthesis complete', report);
      // Email report would be sent here
    } catch (error) {
      logger.error('Manager synthesis failed', { error: error.message });
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
