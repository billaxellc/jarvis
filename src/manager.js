const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[manager-bot] FATAL: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Schedule configuration - times are in 24hr UTC (Railway runs in UTC)
// Convert to local time as needed
const BOT_SCHEDULE = [
  { id: 1, name: 'Bill Retry Supervisor', file: './bots/bot-01-bill-retry.js', time: '08:00' },          // 8 AM
  { id: 2, name: 'Call Quality Inspector', file: './bots/bot-02-call-quality.js', time: '10:00' },      // 10 AM
  { id: 3, name: 'Negotiation Success Tracker', file: './bots/bot-03-success-tracker.js', time: '12:00' }, // 12 PM
  { id: 4, name: 'New User Onboarding Checker', file: './bots/bot-04-onboarding-checker.js', time: '06:00' }, // 6 AM
  { id: 5, name: 'Bill Upload Pipeline Monitor', file: './bots/bot-05-upload-monitor.js', time: '02:00' }, // Every 2 hours
  { id: 6, name: 'Webhook Health Checker', file: './bots/bot-06-webhook-checker.js', time: '15:00' },   // 3 PM
  { id: 7, name: 'Daily Revenue Report', file: './bots/bot-07-daily-revenue.js', time: '23:00' },       // 11 PM
  { id: 8, name: 'User Engagement Tracker', file: './bots/bot-08-engagement-tracker.js', time: '23:30' }, // 11:30 PM
  { id: 9, name: 'Error Log Analyzer', file: './bots/bot-09-error-analyzer.js', time: '04:00' },        // Every 4 hours
  { id: 10, name: 'Database Health Monitor', file: './bots/bot-10-db-health.js', time: '01:00' },       // 1 AM
  { id: 11, name: 'API Response Time Monitor', file: './bots/bot-11-api-monitor.js', time: '00:00' },   // Every 6 hours
  { id: 12, name: 'Manager Bot', file: './bots/bot-12-manager.js', time: '06:00' },                     // 6 AM
];

// Track bot execution
const botReports = new Map();
let botsLoaded = 0;
let botsScheduled = 0;
let lastHeartbeat = Date.now();

// Load all bot modules
function loadBots() {
  console.log('[manager-bot] [INFO] Loading bot modules...');
  
  try {
    for (const config of BOT_SCHEDULE) {
      try {
        const bot = require(config.file);
        if (typeof bot.run === 'function') {
          botReports.set(config.id, {
            name: config.name,
            lastRun: null,
            lastStatus: 'pending',
            runCount: 0,
            module: bot,
            scheduleTime: config.time
          });
          botsLoaded++;
          console.log(`[manager-bot] [INFO] Loaded bot-${String(config.id).padStart(2, '0')}: ${config.name}`);
        } else {
          console.error(`[manager-bot] [WARN] bot-${config.id} does not export run function`);
        }
      } catch (err) {
        console.error(`[manager-bot] [ERROR] Failed to load bot-${config.id}: ${err.message}`);
      }
    }
    console.log(`[manager-bot] [INFO] Successfully loaded ${botsLoaded} bots`);
  } catch (err) {
    console.error(`[manager-bot] [FATAL] Failed to load bots: ${err.message}`);
    process.exit(1);
  }
}

// Schedule and execute bots
function scheduleBots() {
  console.log('[manager-bot] [INFO] Scheduling bot executions...');
  
  for (const [botId, botData] of botReports.entries()) {
    // Parse schedule time
    const [hours, minutes] = botData.scheduleTime.split(':').map(Number);
    
    // Calculate milliseconds until next run
    const now = new Date();
    const next = new Date();
    next.setUTCHours(hours, minutes, 0, 0);
    
    // If time has already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    const delayMs = next - now;
    
    // Schedule the bot
    setTimeout(() => {
      executeBotLoop(botId, botData);
    }, delayMs);
    
    botsScheduled++;
    console.log(`[manager-bot] [INFO] Scheduled bot-${String(botId).padStart(2, '0')} for ${botData.scheduleTime} UTC`);
  }
  
  console.log(`[manager-bot] [INFO] ${botsScheduled} bots scheduled`);
}

// Execute a bot and reschedule it daily
async function executeBotLoop(botId, botData) {
  try {
    console.log(`[bot-${String(botId).padStart(2, '0')}] [INFO] Starting: ${botData.name}`);
    const startTime = Date.now();
    
    // Execute the bot
    await botData.module.run(supabase);
    
    const duration = Date.now() - startTime;
    botData.lastRun = new Date().toISOString();
    botData.lastStatus = 'success';
    botData.runCount++;
    
    console.log(`[bot-${String(botId).padStart(2, '0')}] [SUCCESS] Completed in ${duration}ms - Run #${botData.runCount}`);
  } catch (err) {
    botData.lastStatus = 'error';
    console.error(`[bot-${String(botId).padStart(2, '0')}] [ERROR] ${err.message}`);
  }
  
  // Reschedule for tomorrow
  const [hours, minutes] = botData.scheduleTime.split(':').map(Number);
  const next = new Date();
  next.setUTCHours(hours, minutes, 0, 0);
  next.setDate(next.getDate() + 1); // Tomorrow
  
  const delayMs = next - new Date();
  setTimeout(() => {
    executeBotLoop(botId, botData);
  }, delayMs);
}

// Send heartbeat
function heartbeat() {
  const successCount = Array.from(botReports.values()).filter(b => b.lastStatus === 'success').length;
  const errorCount = Array.from(botReports.values()).filter(b => b.lastStatus === 'error').length;
  
  const summary = Array.from(botReports.entries())
    .map(([id, data]) => {
      const status = data.lastStatus === 'success' ? '✅' : data.lastStatus === 'error' ? '❌' : '⏳';
      return `${status} bot-${String(id).padStart(2, '0')}: ${data.name} (${data.runCount} runs)`;
    })
    .join('\n');
  
  console.log(`[manager-bot] [HEARTBEAT] ${botsLoaded} loaded, ${botsScheduled} scheduled, ${successCount} success, ${errorCount} errors`);
  console.log(summary);
}

// Initialize
loadBots();
scheduleBots();

// Send heartbeat every minute
setInterval(heartbeat, 60000);

console.log('[manager-bot] [INFO] BillAxe Bot Manager initialized and ready');
console.log(`[manager-bot] [INFO] Supabase connected: ${supabaseUrl}`);
