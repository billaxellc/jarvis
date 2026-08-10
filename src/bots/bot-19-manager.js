/**
 * Bot 19: Manager Bot (Daily Report)
 * Runs: Daily 6 AM UTC (11 PM Phoenix)
 * Pulls live data from Neon
 * Sends real summary email to Ty
 */

const { Resend } = require('resend');
const { Pool } = require('pg');

const resend = new Resend(process.env.RESEND_API_KEY);

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-19] [INFO] Starting: Manager Bot (Daily Report)');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Bills uploaded today
    const { rows: bills } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills WHERE created_at >= $1`,
      [todayStr]
    );

    const successful = bills.filter(b => b.status === 'negotiation_complete');
    const failed     = bills.filter(b => b.status === 'call_failed');
    const pending    = bills.filter(b => b.status === 'pending_negotiation');
    const inProgress = bills.filter(b => b.status === 'call_in_progress');

    // Stale bills
    const { rows: staleBills } = await neonPool.query(
      `SELECT id, provider_name, status FROM public.uploaded_bills
       WHERE status IN ('pending', 'pending_negotiation', 'call_in_progress')
       AND created_at < $1`,
      [sevenDaysAgo]
    );

    // High retry bills
    const { rows: highRetryBills } = await neonPool.query(
      `SELECT id, provider_name, attempt_count FROM public.uploaded_bills
       WHERE attempt_count >= 4`
    );

    // All-time stats
    const { rows: allBills } = await neonPool.query(
      `SELECT status, amount FROM public.uploaded_bills`
    );

    const totalAllTime = allBills.length;
    const totalSuccessAllTime = allBills.filter(b => b.status === 'negotiation_complete').length;
    const totalAmount = allBills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    const estimatedSavings = totalAmount * 0.10;

    const uniqueUsers = new Set(bills.map(b => b.user_id));
    const mrrEstimate = (uniqueUsers.size * 9.99).toFixed(2);

    const actionItems = [];
    if (staleBills.length > 0)     actionItems.push(`⚠️ ${staleBills.length} stale bills (7+ days, no progress) need review`);
    if (highRetryBills.length > 0) actionItems.push(`⚠️ ${highRetryBills.length} bills with 4+ retry attempts — check provider numbers`);
    if (failed.length > 0)         actionItems.push(`❌ ${failed.length} calls failed today`);
    if (actionItems.length === 0)  actionItems.push('✅ No action items — all systems clean');

    const emailBody = `
BillAxe Daily Operations Report
${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 TODAY'S ACTIVITY
• Bills uploaded today: ${bills.length}
• Successful negotiations: ${successful.length}
• Failed calls: ${failed.length}
• Pending retry: ${pending.length}
• In progress: ${inProgress.length}
• Active users today: ${uniqueUsers.size}

📈 ALL-TIME STATS
• Total bills processed: ${totalAllTime}
• Total successful: ${totalSuccessAllTime}
• Estimated total savings generated: $${estimatedSavings.toFixed(2)}
• Est. MRR from today's users: $${mrrEstimate}

🔧 ACTION ITEMS
${actionItems.map(i => `• ${i}`).join('\n')}

🤖 BOT SYSTEM
• 19 bots running on Railway
• Next report: tomorrow 6 AM UTC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BillAxe Bot System — ${new Date().toISOString()}
    `.trim();

    const { error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'billaxellc@gmail.com',
      subject: `📊 BillAxe Daily Report — ${bills.length} bills, ${successful.length} wins`,
      text: emailBody
    });

    if (emailError) {
      console.log(`[bot-19] [ERROR] Email failed: ${emailError.message}`);
      return { success: false, error: emailError.message };
    }

    console.log('[bot-19] [SUCCESS] Daily report sent to billaxellc@gmail.com');
    return {
      success: true,
      bills_today: bills.length,
      successful_today: successful.length,
      failed_today: failed.length,
      pending_today: pending.length,
      active_users: uniqueUsers.size,
      stale_bills: staleBills.length,
      high_retry_bills: highRetryBills.length
    };

  } catch (err) {
    console.log(`[bot-19] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
