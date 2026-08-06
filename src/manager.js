const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

// Load all bots
const botsDir = path.join(__dirname, 'bots');

// Bot schedule definitions
const botSchedules = [
  { id: 1, name: 'Bill Retry Supervisor', file: 'bot-01-bill-retry.js', schedule: '0 8 * * *' },
  { id: 2, name: 'Call Quality Inspector', file: 'bot-02-call-quality.js', schedule: '0 10 * * *' },
  { id: 3, name: 'Negotiation Success Tracker', file: 'bot-03-success-tracker.js', schedule: '0 12 * * *' },
  { id: 4, name: 'Onboarding Checker', file: 'bot-04-onboarding-checker.js', schedule: '0 6 * * *' },
  { id: 5, name: 'Bill Upload Monitor', file: 'bot-05-upload-monitor.js', schedule: '0 */2 * * *' },
  { id: 6, name: 'Webhook Health Checker', file: 'bot-06-webhook-checker.js', schedule: '0 15 * * *' },
  { id: 7, name: 'Daily Revenue Report', file: 'bot-07-daily-revenue.js', schedule: '0 23 * * *' },
  { id: 8, name: 'User Engagement Tracker', file: 'bot-08-engagement-tracker.js', schedule: '30 23 * * *' },
  { id: 9, name: 'Error Log Analyzer', file: 'bot-09-error-analyzer.js', schedule: '0 */4 * * *' },
  { id: 10, name: 'Database Health Monitor', file: 'bot-10-db-health.js', schedule: '0 1 * * *' },
  { id: 11, name: 'API Response Time Monitor', file: 'bot-11-api-monitor.js', schedule: '0 */6 * * *' },
  { id: 12, name: 'Competitor Monitor', file: 'bot-12-competitor.js', schedule: '0 9 * * 1' },
  { id: 13, name: 'Customer Success Bot', file: 'bot-13-cust-success.js', schedule: '0 19 * * *' },
  { id: 14, name: 'Bland Balance Monitor', file: 'bot-14-bland-balance.js', schedule: '0 7 * * *' },
  { id: 15, name: 'Failed Auth Detector', file: 'bot-15-failed-auth.js', schedule: '0 9 * * *' },
  { id: 16, name: 'Stale Bill Cleaner', file: 'bot-16-stale-cleaner.js', schedule: '0 2 * * 0' },
  { id: 17, name: 'CFO Bot', file: 'bot-17-cfo.js', schedule: '0 9 * * 1' },
  { id: 18, name: 'Cost Optimization Analyst', file: 'bot-18-cost-optimizer.js', schedule: '0 10 * * 1' },
  { id: 19, name: 'Stale Finder', file: 'bot-19-stale-finder.js', schedule: '0 3 * * 0' }
];

let botResults = {};
let botsScheduled = 0;
let lastRuns = 0;

async function logBotRun(botName, result) {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      bot: botName,
      status: result.status,
      data: result
    };

    const logFile = path.join(logDir, `bot-runs-${new Date().toISOString().split('T')[0]}.json`);
    let logs = [];
    try {
      const existing = await fs.readFile(logFile, 'utf-8');
      logs = JSON.parse(existing);
    } catch {}
    
    logs.push(logEntry);
    await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error(`Failed to log bot ${botName}:`, error.message);
  }
}

async function runBot(botConfig) {
  try {
    const botPath = path.join(botsDir, botConfig.file);
    const botModule = require(botPath);
    const result = await botModule();
    
    botResults[botConfig.name] = result;
    lastRuns++;
    
    console.log(`[${botConfig.name}] ${result.status}: ${result.message || JSON.stringify(result)}`);
    await logBotRun(botConfig.name, result);
  } catch (error) {
    const errorResult = { status: 'error', message: error.message };
    botResults[botConfig.name] = errorResult;
    console.error(`[${botConfig.name}] ERROR:`, error.message);
    await logBotRun(botConfig.name, errorResult);
  }
}

async function sendDailyReport() {
  try {
    if (!process.env.MANAGER_EMAIL || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[manager-bot] [WARN] Email not configured, skipping report');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const reportHTML = `
      <h1>BillAxe Bot Infrastructure Report</h1>
      <p>Generated: ${new Date().toISOString()}</p>
      
      <h2>Summary</h2>
      <ul>
        <li><strong>Bots Scheduled:</strong> ${botsScheduled}</li>
        <li><strong>Bots Executed:</strong> ${lastRuns}</li>
        <li><strong>Health:</strong> ${lastRuns >= botsScheduled * 0.8 ? '✅ Good' : '⚠️ Degraded'}</li>
      </ul>

      <h2>Bot Results</h2>
      <ul>
        ${Object.entries(botResults).map(([name, result]) => `
          <li>
            <strong>${name}:</strong> ${result.status}
            ${result.message ? ` - ${result.message}` : ''}
          </li>
        `).join('')}
      </ul>

      <hr>
      <p>Next report: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}</p>
    `;

    await transporter.sendMail({
      to: process.env.MANAGER_EMAIL,
      subject: `[BillAxe] Daily Bot Report - ${new Date().toISOString().split('T')[0]}`,
      html: reportHTML
    });

    console.log('[manager-bot] [INFO] Daily report sent to', process.env.MANAGER_EMAIL);
  } catch (error) {
    console.error('[manager-bot] [ERROR] Failed to send report:', error.message);
  }
}

async function initializeManager() {
  console.log('[manager-bot] [INFO] BillAxe Bot Manager starting up');
  console.log('[manager-bot] [INFO] Initializing bot schedules');

  for (const botConfig of botSchedules) {
    try {
      cron.schedule(botConfig.schedule, () => runBot(botConfig));
      botsScheduled++;
      console.log(`[manager-bot] [INFO] Scheduled ${botConfig.name} - ${botConfig.schedule}`);
    } catch (error) {
      console.error(`[manager-bot] [ERROR] Failed to schedule ${botConfig.name}:`, error.message);
    }
  }

  // Daily report at 6 AM
  cron.schedule('0 6 * * *', sendDailyReport);

  console.log(`[manager-bot] [INFO] All schedules initialized (${botsScheduled} bots)`);
  console.log(`[manager-bot] [INFO] All bots scheduled and ready`);

  // Heartbeat every minute
  setInterval(() => {
    console.log(`[manager-bot] [0] botsScheduled: ${botsScheduled}, lastRuns: ${lastRuns}`);
  }, 60000);
}

// Start
initializeManager().catch(error => {
  console.error('[manager-bot] [FATAL]', error);
  process.exit(1);
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('[manager-bot] [INFO] Graceful shutdown');
  process.exit(0);
});
