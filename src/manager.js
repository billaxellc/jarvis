const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const managerEmail = process.env.MANAGER_EMAIL;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!supabaseUrl || !supabaseKey) {
  console.error('[manager-bot] [ERROR] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

const botReports = {};
console.log('[manager-bot] [INFO] BillAxe Bot Manager starting up');
console.log('[manager-bot] [INFO] Current time:', new Date().toISOString());
console.log('[manager-bot] [INFO] Initializing bot schedules with UTC timezone');

// TEST BOT: Runs every minute to test if cron is working
cron.schedule('* * * * *', async () => {
  try {
    console.log('[bot-test] [INFO] TEST BOT FIRED - Cron is working! Time:', new Date().toISOString());
    botReports['bot-test'] = { name: 'Test Bot', status: 'working', timestamp: new Date().toISOString() };
  } catch (err) {
    console.log('[bot-test] [ERROR]', err.message);
  }
}, { timezone: "UTC" });

// Bot 1: Bill Retry Supervisor - 9 AM UTC
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[bot-1] [INFO] Bill Retry Supervisor running');
    const { data: bills } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'pending_retry');
    botReports['bot-1'] = { name: 'Bill Retry Supervisor', status: 'success', count: bills?.length || 0 };
  } catch (err) {
    botReports['bot-1'] = { name: 'Bill Retry Supervisor', status: 'error', error: err.message };
    console.log('[bot-1] [ERROR]', err.message);
  }
}, { timezone: "UTC" });

// Bot 3: Negotiation Success Tracker - 10 AM UTC
cron.schedule('0 10 * * *', async () => {
  try {
    console.log('[bot-3] [INFO] Negotiation Success Tracker running');
    const { data: completed } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'completed');
    botReports['bot-3'] = { name: 'Negotiation Success Tracker', status: 'success', count: completed?.length || 0 };
  } catch (err) {
    botReports['bot-3'] = { name: 'Negotiation Success Tracker', status: 'error', error: err.message };
    console.log('[bot-3] [ERROR]', err.message);
  }
}, { timezone: "UTC" });

// Bot 5: Bill Upload Monitor - every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('[bot-5] [INFO] Bill Upload Monitor running');
    const { data: pending } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'pending');
    botReports['bot-5'] = { name: 'Bill Upload Monitor', status: 'success', pending: pending?.length || 0 };
  } catch (err) {
    botReports['bot-5'] = { name: 'Bill Upload Monitor', status: 'error', error: err.message };
    console.log('[bot-5] [ERROR]', err.message);
  }
}, { timezone: "UTC" });

// Bot 7: Daily Revenue - 6 AM UTC
cron.schedule('0 6 * * *', async () => {
  try {
    console.log('[bot-7] [INFO] Daily Revenue Report running');
    const { data: completed } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'completed');
    botReports['bot-7'] = { name: 'Daily Revenue Report', status: 'success', count: completed?.length || 0 };
  } catch (err) {
    botReports['bot-7'] = { name: 'Daily Revenue Report', status: 'error', error: err.message };
    console.log('[bot-7] [ERROR]', err.message);
  }
}, { timezone: "UTC" });

// Manager heartbeat
cron.schedule('* * * * *', () => {
  console.log('[manager-bot] [DEBUG] Manager heartbeat { botsScheduled: 18, lastRuns:', Object.keys(botReports).length, '}');
}, { timezone: "UTC" });

// Manager daily report - 6:30 AM UTC
cron.schedule('30 6 * * *', async () => {
  try {
    console.log('[manager-bot] [INFO] Sending daily report');
    const reportText = Object.entries(botReports)
      .map(([id, report]) => \`\${report.name}: \${report.status}\`)
      .join('\n');
    await transporter.sendMail({
      from: smtpUser,
      to: managerEmail,
      subject: \`BillAxe Daily Report - \${new Date().toLocaleDateString()}\`,
      text: reportText
    });
    console.log('[manager-bot] [INFO] Report sent');
  } catch (err) {
    console.log('[manager-bot] [ERROR]', err.message);
  }
}, { timezone: "UTC" });

console.log('[manager-bot] [INFO] All schedules initialized');
console.log('[manager-bot] [INFO] All bots scheduled and ready');

process.on('SIGTERM', () => {
  console.log('[manager-bot] [INFO] Shutting down gracefully');
  process.exit(0);
});
