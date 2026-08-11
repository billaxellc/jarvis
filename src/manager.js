/**
 * MANAGER.JS - BillAxe Bot Orchestration
 * Loads all 19 bots, schedules them on correct times, executes them
 * Sends daily email report via Resend
 */
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Resend } = require('resend');

const botReports = new Map();
const botErrors = new Map();

const resend = new Resend(process.env.RESEND_API_KEY);

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

async function sendEmail(subject, text) {
  try {
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'billaxellc@gmail.com',
      subject,
      text
    });
    if (error) {
      console.log(`[manager-bot] [EMAIL_ERROR] ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`[manager-bot] [EMAIL_ERROR] ${err.message}`);
    return false;
  }
}

async function sendStartupTest() {
  const ok = await sendEmail(
    'BillAxe Bot Manager - STARTUP TEST',
    `Bot manager started successfully at ${new Date().toISOString()}\n\nEmail system is working via Resend.`
  );
  console.log(ok ? '[manager-bot] [EMAIL] Startup test sent' : '[manager-bot] [EMAIL_ERROR] Startup test failed');
}

async function sendDailyReport() {
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

  emailBody += `\n📸 Instagram Bot: ${instagramBotRunning ? '✅ Running' : '❌ Down'}\n`;
  
  emailBody += `\nSUMMARY: ${successCount} successful, ${failCount} failed\n`;
  
  const ok = await sendEmail(
    `BillAxe Daily Report - ${new Date().toLocaleDateString()}`,
    emailBody
  );
  console.log(ok ? '[manager-bot] [EMAIL] Daily report sent' : '[manager-bot] [EMAIL_ERROR] Daily report failed');
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

// ── Instagram Bot — continuous subprocess ─────────────────────────────────────

let instagramBotRunning = false;

function startInstagramBot() {
  const scriptPath = path.join(__dirname, '..', 'python-bots', 'instagram-bot.py');

  if (!fs.existsSync(scriptPath)) {
    console.log('[bot-20-instagram] [ERROR] Script not found:', scriptPath);
    return;
  }

  console.log('[bot-20-instagram] [START] Launching Instagram bot...');
  instagramBotRunning = true;

  const python = spawn('python3', [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  python.on('error', (err) => {
    console.log(`[bot-20-instagram] [ERROR] ${err.message}`);
    instagramBotRunning = false;
    // Retry after 5 minutes
    console.log('[bot-20-instagram] Retrying in 5 minutes...');
    setTimeout(startInstagramBot, 5 * 60 * 1000);
  });

  python.on('exit', (code) => {
    instagramBotRunning = false;
    console.log(`[bot-20-instagram] [EXIT] Code ${code} — restarting in 5 minutes...`);
    setTimeout(startInstagramBot, 5 * 60 * 1000);
  });
}

function scheduleBots() {
  if (bots['bot-01-bill-retry']) {
    cron.schedule('0 16 * * *', () => executeBotSafely('bot-01-bill-retry', bots['bot-01-bill-retry']));
    console.log('[manager-bot] [SCHEDULE] bot-01 @ 4:00 PM UTC (9 AM Phoenix)');
  }
  if (bots['bot-02-quality-inspector']) {
    cron.schedule('0 10 * * *', () => executeBotSafely('bot-02-quality-inspector', bots['bot-02-quality-inspector']));
    console.log('[manager-bot] [SCHEDULE] bot-02 @ 10:00 AM UTC (3 AM Phoenix)');
  }
  if (bots['bot-03-negotiation-tracker']) {
    cron.schedule('0 12 * * *', () => executeBotSafely('bot-03-negotiation-tracker', bots['bot-03-negotiation-tracker']));
    console.log('[manager-bot] [SCHEDULE] bot-03 @ 12:00 PM UTC (5 AM Phoenix)');
  }
  if (bots['bot-04-onboarding-checker']) {
    cron.schedule('0 3 * * *', () => executeBotSafely('bot-04-onboarding-checker', bots['bot-04-onboarding-checker']));
    console.log('[manager-bot] [SCHEDULE] bot-04 @ 3:00 AM UTC (8 PM Phoenix)');
  }
  if (bots['bot-05-upload-monitor']) {
    cron.schedule('0 */2 * * *', () => executeBotSafely('bot-05-upload-monitor', bots['bot-05-upload-monitor']));
    console.log('[manager-bot] [SCHEDULE] bot-05 @ every 2 hours');
  }
  if (bots['bot-06-webhook-checker']) {
    cron.schedule('0 15 * * *', () => executeBotSafely('bot-06-webhook-checker', bots['bot-06-webhook-checker']));
    console.log('[manager-bot] [SCHEDULE] bot-06 @ 3:00 PM UTC (8 AM Phoenix)');
  }
  if (bots['bot-07-daily-revenue']) {
    cron.schedule('0 23 * * *', () => executeBotSafely('bot-07-daily-revenue', bots['bot-07-daily-revenue']));
    console.log('[manager-bot] [SCHEDULE] bot-07 @ 11:00 PM UTC (4 PM Phoenix)');
  }
  if (bots['bot-08-engagement-tracker']) {
    cron.schedule('30 23 * * *', () => executeBotSafely('bot-08-engagement-tracker', bots['bot-08-engagement-tracker']));
    console.log('[manager-bot] [SCHEDULE] bot-08 @ 11:30 PM UTC (4:30 PM Phoenix)');
  }
  if (bots['bot-09-error-analyzer']) {
    cron.schedule('0 */4 * * *', () => executeBotSafely('bot-09-error-analyzer', bots['bot-09-error-analyzer']));
    console.log('[manager-bot] [SCHEDULE] bot-09 @ every 4 hours');
  }
  if (bots['bot-10-db-health']) {
    cron.schedule('0 1 * * *', () => executeBotSafely('bot-10-db-health', bots['bot-10-db-health']));
    console.log('[manager-bot] [SCHEDULE] bot-10 @ 1:00 AM UTC (6 PM Phoenix)');
  }
  if (bots['bot-11-api-monitor']) {
    cron.schedule('0 */6 * * *', () => executeBotSafely('bot-11-api-monitor', bots['bot-11-api-monitor']));
    console.log('[manager-bot] [SCHEDULE] bot-11 @ every 6 hours');
  }
  if (bots['bot-12-cfo']) {
    cron.schedule('0 6 * * 1', () => executeBotSafely('bot-12-cfo', bots['bot-12-cfo']));
    console.log('[manager-bot] [SCHEDULE] bot-12 @ Monday 6:00 AM UTC (11 PM Phoenix)');
  }
  if (bots['bot-13-price-monitor']) {
    cron.schedule('0 17 * * 5', () => executeBotSafely('bot-13-price-monitor', bots['bot-13-price-monitor']));
    console.log('[manager-bot] [SCHEDULE] bot-13 @ Friday 5:00 PM UTC (10 AM Phoenix)');
  }
  if (bots['bot-14-success-notifier']) {
    cron.schedule('0 19 * * *', () => executeBotSafely('bot-14-success-notifier', bots['bot-14-success-notifier']));
    console.log('[manager-bot] [SCHEDULE] bot-14 @ 7:00 PM UTC (12 PM Phoenix)');
  }
  if (bots['bot-15-bland-balance']) {
    cron.schedule('0 7 * * *', () => executeBotSafely('bot-15-bland-balance', bots['bot-15-bland-balance']));
    console.log('[manager-bot] [SCHEDULE] bot-15 @ 7:00 AM UTC (12 AM Phoenix)');
  }
  if (bots['bot-16-auth-detector']) {
    cron.schedule('0 9 * * *', () => executeBotSafely('bot-16-auth-detector', bots['bot-16-auth-detector']));
    console.log('[manager-bot] [SCHEDULE] bot-16 @ 9:00 AM UTC (2 AM Phoenix)');
  }
  if (bots['bot-17-stale-cleaner']) {
    cron.schedule('0 2 * * 0', () => executeBotSafely('bot-17-stale-cleaner', bots['bot-17-stale-cleaner']));
    console.log('[manager-bot] [SCHEDULE] bot-17 @ Sunday 2:00 AM UTC (7 PM Saturday Phoenix)');
  }
  if (bots['bot-18-cost-optimizer']) {
    cron.schedule('0 16 * * 3', () => executeBotSafely('bot-18-cost-optimizer', bots['bot-18-cost-optimizer']));
    console.log('[manager-bot] [SCHEDULE] bot-18 @ Wednesday 4:00 PM UTC (9 AM Phoenix)');
  }
  if (bots['bot-19-manager']) {
    cron.schedule('0 13 * * *', () => executeBotSafely('bot-19-manager', bots['bot-19-manager']));
    console.log('[manager-bot] [SCHEDULE] bot-19 @ 1:00 PM UTC (6 AM Phoenix)');
  }

  // Daily report - 1 PM UTC = 6 AM Phoenix
  cron.schedule('0 13 * * *', () => sendDailyReport());
  console.log('[manager-bot] [SCHEDULE] DAILY EMAIL @ 1:00 PM UTC (6 AM Phoenix)');
}

// Heartbeat
setInterval(() => {
  const successCount = Array.from(botReports.values()).filter(r => r.status === 'SUCCESS').length;
  const failCount = botErrors.size;
  console.log(`[manager-bot] [HEARTBEAT] Bots: ${Object.keys(bots).length} scheduled | Success: ${successCount} | Failed: ${failCount} | Instagram: ${instagramBotRunning ? '🟢' : '🔴'}`);
}, 60000);

console.log('[manager-bot] [INFO] BillAxe Bot Manager starting up');
sendStartupTest();
scheduleBots();
startInstagramBot();
console.log('[manager-bot] [INFO] All bots scheduled and monitoring');
