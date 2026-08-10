/**
 * Bot 14: Customer Success Bot
 * Runs: Daily 7 PM UTC (12 PM Phoenix)
 * Emails users whose bills were successfully negotiated
 * Includes savings amount and call summary
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { Resend } = require('resend');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(process.env.RESEND_API_KEY);

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-14] [INFO] Starting: Customer Success Bot');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's completed negotiations from Neon
    const { rows: completed } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills
       WHERE status = 'negotiation_complete'
       AND created_at >= $1`,
      [today.toISOString()]
    );

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const bill of completed) {
      const estimatedSavings = (parseFloat(bill.amount) || 0) * 0.10;

      // Get user email from Supabase auth
      let userEmail = null;
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(bill.user_id);
        if (userError) throw new Error(userError.message);
        userEmail = userData?.user?.email;
      } catch (e) {
        console.log(`[bot-14] [WARN] Could not get email for user ${bill.user_id}: ${e.message}`);
      }

      if (!userEmail) {
        emailsFailed++;
        continue;
      }

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: userEmail,
          subject: `✅ Great news! Your ${bill.provider_name} bill was negotiated`,
          text: [
            `Hi ${bill.account_holder_name || 'there'},`,
            ``,
            `Maya successfully negotiated your ${bill.provider_name} bill!`,
            ``,
            `Original amount: $${(parseFloat(bill.amount) || 0).toFixed(2)}`,
            `Estimated savings: ~$${estimatedSavings.toFixed(2)}`,
            ``,
            `Log in to BillAxe to see the full call summary.`,
            ``,
            `— The BillAxe Team`
          ].join('\n')
        });

        if (emailError) throw new Error(emailError.message);
        console.log(`[bot-14] [EMAIL] Sent to ${userEmail} — ${bill.provider_name} ~$${estimatedSavings.toFixed(2)} saved`);
        emailsSent++;
      } catch (e) {
        console.log(`[bot-14] [ERROR] Email failed for ${userEmail}: ${e.message}`);
        emailsFailed++;
      }
    }

    console.log(`[bot-14] [SUCCESS] ${emailsSent} success notifications sent, ${emailsFailed} failed`);
    return { success: true, emails_sent: emailsSent, emails_failed: emailsFailed };

  } catch (err) {
    console.log(`[bot-14] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
