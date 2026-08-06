const cron = require('node-cron');
const { sendEmail } = require('./mailer');

// Import all bots
const botBillRetry = require('./bots/bot_bill_retry');
const botNegotiationTracker = require('./bots/bot_negotiation_tracker');
const botDailyRevenue = require('./bots/bot_daily_revenue');
const botDbHealth = require('./bots/bot_db_health');
const botStaleBills = require('./bots/bot_stale_bills');
const botUserMetrics = require('./bots/bot_user_metrics');
const botBlandMonitor = require('./bots/bot_bland_monitor');

// Report storage
const reports = {};
let botRuns = 0;

async function runBot(name, botModule) {
  try {
    console.log(`[manager] Running ${name}...`);
    const result = await botModule.run();
    reports[name] = { ...result, timestamp: new Date().toISOString() };
    botRuns++;
    console.log(`[manager] ${name} complete:`, JSON.stringify(result));
  } catch (err) {
    console.error(`[manager] ${name} crashed:`, err.message);
    reports[name] = { success: false, error: err.message, timestamp: new Date().toISOString() };
  }
}

async function sendDailyReport() {
  const lines = ['BillAxe Daily Bot Report', '========================', ''];
  
  for (const [name, result] of Object.entries(reports)) {
    lines.push(`[${name}]`);
    lines.push(result.success ? '  Status: OK' : '  Status: FAILED');
    if (result.error) lines.push(`  Error: ${result.error}`);
    Object.entries(result).forEach(([k, v]) => {
      if (!['success', 'error', 'timestamp'].includes(k)) {
        lines.push(`  ${k}: ${v}`);
      }
    });
    lines.push('');
  }
  
  lines.push(`Total bot runs today: ${botRuns}`);
  lines.push(`Report generated: ${new Date().toISOString()}`);
  
  await sendEmail('BillAxe Daily Report - ' + new Date().toDateString(), lines.join('\n'));
}

console.log('[manager] BillAxe Bot Manager starting up...');
console.log('[manager] Initializing bot schedules...');

// Run DB health every 5 minutes
cron.schedule('*/5 * * * *', () => runBot('db_health', botDbHealth));

// Run bill retry every hour
cron.schedule('0 * * * *', () => runBot('bill_retry', botBillRetry));

// Run negotiation tracker every 30 minutes
cron.schedule('*/30 * * * *', () => runBot('negotiation_tracker', botNegotiationTracker));

// Run daily revenue every 6 hours
cron.schedule('0 */6 * * *', () => runBot('daily_revenue', botDailyRevenue));

// Run stale bills check every 12 hours
cron.schedule('0 */12 * * *', () => runBot('stale_bills', botStaleBills));

// Run user metrics every 6 hours
cron.schedule('0 */6 * * *', () => runBot('user_metrics', botUserMetrics));

// Run bland monitor every 30 minutes
cron.schedule('*/30 * * * *', () => runBot('bland_monitor', botBlandMonitor));

// Send daily email report at 6 AM
cron.schedule('0 6 * * *', sendDailyReport);

// Heartbeat every minute
cron.schedule('* * * * *', () => {
  console.log(`[manager] Heartbeat — ${new Date().toISOString()} — botRuns: ${botRuns}`);
});

console.log('[manager] All schedules initialized');
console.log('[manager] All bots scheduled and ready');

// Run key bots immediately on startup
setTimeout(async () => {
  console.log('[manager] Running startup checks...');
  await runBot('db_health', botDbHealth);
  await runBot('negotiation_tracker', botNegotiationTracker);
  await runBot('bland_monitor', botBlandMonitor);
  console.log('[manager] Startup checks complete');
}, 5000);
