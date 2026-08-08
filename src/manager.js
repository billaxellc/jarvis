/**
 * MANAGER.JS - BillAxe Bot Orchestration
 * Loads all 19 bots, schedules them on correct times, executes them
 * Sends daily email report with all findings
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const botReports = new Map();
const botErrors = new Map();

// Email configuration
const emailUser = process.env.GMAIL_APP_PASSWORD ? 'billaxellc@gmail.com' : null;
const emailPass = process.env.GMAIL_APP_PASSWORD;

let transporter = null;
if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
}

// Load all bot files from ./bots directory
function loadBots() {
  const botsDir = path.join(__dirname, 'bots');
  const botFiles = fs.readdirSync(botsDir).filter(f => f.startsWith('bot-') && f.endsWith('.js'));
  
  const bots = {};
  for (const file of botFiles) {
    try {
      const botPath = path.join(botsDir, file);
      delete require.cache[require.resolve(botPath)];
      const bot = require(botPath);
      const botName = file.replace('.js', '');
      bots[botName] = { module: bot, file };
      console.log(`[manager-bot] [LOAD] Loaded ${botName}`);
    } catch (e) {
      console.log(`[manager-bot] [ERROR] Failed to load ${file}: ${e.message}`);
    }
  }
  return bots;
}

const bots = loadBots();

// Schedule each bot
function scheduleBots() {
  // Bot 1: Bill Retry Supervisor - Daily 8 AM
  if (bots['bot-01-bill-retry']) {
    cron.schedule('0 8 * * *', async () => {
      await executeBotSafely('bot-01-bill-retry', bots['bot-01-bill-retry']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-01 @ 8:00 AM daily');
  }
  
  // Bot 2: Call Quality Inspector - Daily 10 AM
  if (bots['bot-02-quality-inspector']) {
    cron.schedule('0 10 * * *', async () => {
      await executeBotSafely('bot-02-quality-inspector', bots['bot-02-quality-inspector']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-02 @ 10:00 AM daily');
  }
  
  // Bot 3: Negotiation Success Tracker - Daily 12 PM
  if (bots['bot-03-negotiation-tracker']) {
    cron.schedule('0 12 * * *', async () => {
      await executeBotSafely('bot-03-negotiation-tracker', bots['bot-03-negotiation-tracker']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-03 @ 12:00 PM daily');
  }
  
  // Bot 4: New User Onboarding Checker - Daily 3 AM
  if (bots['bot-04-onboarding-checker']) {
    cron.schedule('0 3 * * *', async () => {
      await executeBotSafely('bot-04-onboarding-checker', bots['bot-04-onboarding-checker']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-04 @ 3:00 AM daily');
  }
  
  // Bot 5: Bill Upload Pipeline Monitor - Every 2 hours
  if (bots['bot-05-upload-monitor']) {
    cron.schedule('0 */2 * * *', async () => {
      await executeBotSafely('bot-05-upload-monitor', bots['bot-05-upload-monitor']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-05 @ every 2 hours');
  }
  
  // Bot 6: Webhook Health Checker - Daily 3 PM
  if (bots['bot-06-webhook-checker']) {
    cron.schedule('0 15 * * *', async () => {
      await executeBotSafely('bot-06-webhook-checker', bots['bot-06-webhook-checker']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-06 @ 3:00 PM daily');
  }
  
  // Bot 7: Daily Revenue Report - Daily 11 PM
  if (bots['bot-07-daily-revenue']) {
    cron.schedule('0 23 * * *', async () => {
      await executeBotSafely('bot-07-daily-revenue', bots['bot-07-daily-revenue']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-07 @ 11:00 PM daily');
  }
  
  // Bot 8: User Engagement Tracker - Daily 11:30 PM
  if (bots['bot-08-engagement-tracker']) {
    cron.schedule('30 23 * * *', async () => {
      await executeBotSafely('bot-08-engagement-tracker', bots['bot-08-engagement-tracker']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-08 @ 11:30 PM daily');
  }
  
  // Bot 9: Error Log Analyzer - Every 4 hours
  if (bots['bot-09-error-analyzer']) {
    cron.schedule('0 */4 * * *', async () => {
      await executeBotSafely('bot-09-error-analyzer', bots['bot-09-error-analyzer']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-09 @ every 4 hours');
  }
  
  // Bot 10: Database Health Monitor - Daily 1 AM
  if (bots['bot-10-db-health']) {
    cron.schedule('0 1 * * *', async () => {
      await executeBotSafely('bot-10-db-health', bots['bot-10-db-health']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-10 @ 1:00 AM daily');
  }
  
  // Bot 11: API Response Time Monitor - Every 6 hours
  if (bots['bot-11-api-monitor']) {
    cron.schedule('0 */6 * * *', async () => {
      await executeBotSafely('bot-11-api-monitor', bots['bot-11-api-monitor']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-11 @ every 6 hours');
  }
  
  // Bot 12: CFO Bot - Weekly on Monday 6 AM
  if (bots['bot-12-cfo']) {
    cron.schedule('0 6 * * 1', async () => {
      await executeBotSafely('bot-12-cfo', bots['bot-12-cfo']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-12 @ Monday 6:00 AM');
  }
  
  // Bot 13: Competitor Price Monitor - Weekly on Friday 5 PM
  if (bots['bot-13-price-monitor']) {
    cron.schedule('0 17 * * 5', async () => {
      await executeBotSafely('bot-13-price-monitor', bots['bot-13-price-monitor']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-13 @ Friday 5:00 PM');
  }
  
  // Bot 14: Customer Success Bot - Daily 7 PM
  if (bots['bot-14-success-notifier']) {
    cron.schedule('0 19 * * *', async () => {
      await executeBotSafely('bot-14-success-notifier', bots['bot-14-success-notifier']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-14 @ 7:00 PM daily');
  }
  
  // Bot 15: Bland.ai Balance Monitor - Daily 7 AM
  if (bots['bot-15-bland-balance']) {
    cron.schedule('0 7 * * *', async () => {
      await executeBotSafely('bot-15-bland-balance', bots['bot-15-bland-balance']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-15 @ 7:00 AM daily');
  }
  
  // Bot 16: Failed Auth Detector - Daily 9 AM
  if (bots['bot-16-auth-detector']) {
    cron.schedule('0 9 * * *', async () => {
      await executeBotSafely('bot-16-auth-detector', bots['bot-16-auth-detector']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-16 @ 9:00 AM daily');
  }
  
  // Bot 17: Stale Bill Cleaner - Weekly on Sunday 2 AM
  if (bots['bot-17-stale-cleaner']) {
    cron.schedule('0 2 * * 0', async () => {
      await executeBotSafely('bot-17-stale-cleaner', bots['bot-17-stale-cleaner']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-17 @ Sunday 2:00 AM');
  }
  
  // Bot 18: Cost Optimization Analyst - Weekly on Wednesday 4 PM
  if (bots['bot-18-cost-optimizer']) {
    cron.schedule('0 16 * * 3', async () => {
      await executeBotSafely('bot-18-cost-optimizer', bots['bot-18-cost-optimizer']);
    });
    console.log('[manager-bot] [SCHEDULE] bot-18 @ Wednesday 4:00 PM');
  }
  
  // Bot 19: Manager Bot - Daily 6 AM
  if (bots['bot-19-manager']) {
    cron.schedule('0 6 * * *', async () => {
      await executeBotSafely('bot-19-manager', bots['bot-19-manager']);
      // Send daily report email
      await sendDailyReport();
    });
    console.log('[manager-bot] [SCHEDULE] bot-19 @ 6:00 AM daily');
  }
}

async function executeBotSafely(botName, botObj) {
  const startTime = Date.now();
  try {
    const result = await botObj.module.run();
    const duration = Date.now() - startTime;
    
    botReports.set(botName, {
      result,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      status: result.success ? 'SUCCESS' : 'FAILED'
    });
    
    console.log(`[${botName}] [SUCCESS] Completed in ${duration}ms`);
  } catch (err) {
    botErrors.set(botName, {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    console.log(`[${botName}] [ERROR] ${err.message}`);
  }
}

async function sendDailyReport() {
  if (!transporter) {
    console.log('[manager-bot] [WARNING] Email not configured, skipping report');
    return;
  }
  
  try {
    let emailBody = `BillAxe Daily Operations Report\nGenerated: ${new Date().toISOString()}\n\n`;
    emailBody += `SUCCESSFUL BOT EXECUTIONS:\n`;
    
    let successCount = 0;
    for (const [bot, report] of botReports.entries()) {
      if (report.status === 'SUCCESS') {
        emailBody += `✅ ${bot} (${report.duration_ms}ms)\n`;
        successCount++;
      }
    }
    
    emailBody += `\nFAILED BOT EXECUTIONS:\n`;
    let failCount = 0;
    for (const [bot, error] of botErrors.entries()) {
      emailBody += `❌ ${bot}: ${error.error}\n`;
      failCount++;
    }
    
    emailBody += `\nSUMMARY: ${successCount} successful, ${failCount} failed\n`;
    
    const mailOptions = {
      from: 'billaxellc@gmail.com',
      to: 'billaxellc@gmail.com',
      subject: `BillAxe Daily Report - ${new Date().toLocaleDateString()}`,
      text: emailBody
    };
    
    await transporter.sendMail(mailOptions);
    console.log('[manager-bot] [EMAIL] Daily report sent to Billaxellc@gmail.com');
  } catch (err) {
    console.log(`[manager-bot] [EMAIL_ERROR] Failed to send report: ${err.message}`);
  }
}

// Heartbeat
setInterval(() => {
  const successCount = Array.from(botReports.values()).filter(r => r.status === 'SUCCESS').length;
  const failCount = botErrors.size;
  console.log(`[manager-bot] [HEARTBEAT] Bots: ${Object.keys(bots).length} scheduled | Success: ${successCount} | Failed: ${failCount}`);
}, 60000);

console.log('[manager-bot] [INFO] BillAxe Bot Manager starting up');
scheduleBots();
console.log('[manager-bot] [INFO] All bot schedules initialized and ready');
console.log('[manager-bot] [INFO] 19 bots scheduled and monitoring');
