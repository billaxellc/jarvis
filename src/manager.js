const fs = require('fs');
const path = require('path');

console.log('[manager-bot] Starting BillAxe Bot Manager');

const botsDir = path.join(__dirname, 'bots');
const bots = {};
const botSchedules = {};
const botResults = {};

// Load all bot files
const botFiles = fs.readdirSync(botsDir).filter(f => f.startsWith('bot-') && f.endsWith('.js'));

botFiles.forEach(file => {
  try {
    const bot = require(path.join(botsDir, file));
    const botName = file.replace('.js', '');
    bots[botName] = bot;
    botResults[botName] = { lastRun: null, status: 'pending' };
    console.log(`[manager-bot] Loaded: ${botName}`);
  } catch (err) {
    console.error(`[manager-bot] Failed to load ${file}: ${err.message}`);
  }
});

// Define schedules (times in 24-hour format, UTC)
const schedules = {
  'bot-01-bill-retry': '08:00', // 8 AM
  'bot-02-call-quality': '10:00', // 10 AM
  'bot-03-negotiation-tracker': '12:00', // 12 PM
  'bot-04-onboarding-checker': '06:00', // 6 AM
  'bot-05-upload-monitor': 'every-2h', // Every 2 hours
  'bot-06-webhook-checker': '15:00', // 3 PM
  'bot-07-daily-revenue': '23:00', // 11 PM
  'bot-08-engagement-tracker': '23:30', // 11:30 PM
  'bot-09-error-analyzer': 'every-4h', // Every 4 hours
  'bot-10-db-health': '01:00', // 1 AM
  'bot-11-api-monitor': 'every-6h', // Every 6 hours
  'bot-12-cfo': 'weekly', // Weekly
  'bot-13-price-monitor': 'weekly', // Weekly
  'bot-14-success-notifier': '19:00', // 7 PM
  'bot-15-bland-balance': '07:00', // 7 AM
  'bot-16-auth-detector': '09:00', // 9 AM
  'bot-17-stale-cleaner': 'weekly', // Weekly
  'bot-18-cost-optimizer': 'weekly', // Weekly
  'bot-19-manager': '06:00' // 6 AM (runs after other bots)
};

// Helper to check if a bot should run now
function shouldRun(botName, schedule) {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const currentTime = hours + ':' + minutes;
  
  if (schedule === 'every-2h') {
    return now.getUTCHours() % 2 === 0 && now.getUTCMinutes() < 1;
  }
  if (schedule === 'every-4h') {
    return now.getUTCHours() % 4 === 0 && now.getUTCMinutes() < 1;
  }
  if (schedule === 'every-6h') {
    return now.getUTCHours() % 6 === 0 && now.getUTCMinutes() < 1;
  }
  if (schedule === 'weekly') {
    return now.getUTCDay() === 1 && hours === '00' && now.getUTCMinutes() < 1; // Monday midnight
  }
  
  // Exact time match
  return currentTime === schedule;
}

// Run a bot
async function runBot(botName) {
  if (!bots[botName]) {
    console.error(`[manager-bot] Bot not found: ${botName}`);
    return;
  }
  
  try {
    console.log(`[${botName}] [START] Executing...`);
    const result = await bots[botName].run();
    botResults[botName] = {
      lastRun: new Date().toISOString(),
      status: result.status || 'unknown',
      result: result
    };
    console.log(`[${botName}] [${result.status.toUpperCase()}] ${JSON.stringify(result).substring(0, 100)}`);
  } catch (err) {
    console.error(`[${botName}] [ERROR] ${err.message}`);
    botResults[botName] = {
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: err.message
    };
  }
}

// Main loop - check every minute if any bot should run
setInterval(() => {
  Object.entries(schedules).forEach(([botName, schedule]) => {
    if (shouldRun(botName, schedule)) {
      runBot(botName);
    }
  });
  
  // Heartbeat every minute
  const totalLoaded = Object.keys(bots).length;
  const totalRun = Object.values(botResults).filter(r => r.lastRun).length;
  console.log(`[manager-bot] [HEARTBEAT] Loaded: ${totalLoaded}, Executed: ${totalRun}`);
}, 60000);

// Also run a quick sync on startup (bots that should've run but missed)
setTimeout(() => {
  console.log('[manager-bot] Checking for missed bot executions...');
  Object.entries(schedules).forEach(([botName, schedule]) => {
    if (shouldRun(botName, schedule)) {
      runBot(botName);
    }
  });
}, 5000);

console.log(`[manager-bot] Bot Manager initialized with ${Object.keys(bots).length} bots`);
console.log('[manager-bot] Main loop running - checking every minute for scheduled bots');
