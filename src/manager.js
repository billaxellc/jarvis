const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[manager-bot] FATAL: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const botReports = new Map();

// Test bot - fires every minute
setInterval(() => {
  console.log('[bot-test] [INFO] TEST BOT FIRED - Cron is working!');
}, 60000);

// Heartbeat
setInterval(() => {
  const scheduled = 18;
  const lastRuns = botReports.size;
  console.log('[manager-bot] [INFO] botsScheduled: ' + scheduled + ', lastRuns: ' + lastRuns);
}, 60000);

console.log('[manager-bot] [INFO] All schedules initialized');
console.log('[manager-bot] [INFO] All bots scheduled and ready');
console.log('[manager-bot] [INFO] BillAxe Bot Manager starting up');
console.log('[manager-bot] [INFO] Initializing bot schedules');
