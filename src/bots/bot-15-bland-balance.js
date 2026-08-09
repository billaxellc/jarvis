/**
 * Bot 15: Bland.ai Balance Monitor
 * Runs: Daily 7 AM UTC (12 AM Phoenix)
 * Checks Bland.ai credit balance
 * Alerts via email if below threshold
 * CRITICAL — if credits run out all calls silently stop
 */

const axios = require('axios');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const BLAND_API_KEY = process.env.BLAND_API_KEY;
const ALERT_THRESHOLD = 50.00;

async function run() {
  try {
    console.log('[bot-15] [INFO] Starting: Bland.ai Balance Monitor');

    if (!BLAND_API_KEY) {
      console.log('[bot-15] [ERROR] BLAND_API_KEY not set');
      return { success: false, error: 'BLAND_API_KEY not set' };
    }

    // Hit Bland.ai API for account balance
    let currentBalance = null;
    try {
      const response = await axios.get('https://api.bland.ai/v1/me', {
        headers: { authorization: BLAND_API_KEY },
        timeout: 10000
      });
      currentBalance = response.data?.billing?.credits_remaining ?? response.data?.credits ?? null;
    } catch (e) {
      console.log(`[bot-15] [ERROR] Bland.ai API call failed: ${e.message}`);
      return { success: false, error: `Bland.ai API unreachable: ${e.message}` };
    }

    if (currentBalance === null) {
      console.log('[bot-15] [WARN] Could not parse balance from Bland.ai response');
      return { success: false, error: 'Balance not found in API response' };
    }

    const estimatedCallsRemaining = Math.floor(currentBalance / 0.50);
    const status = currentBalance < ALERT_THRESHOLD ? 'ALERT' : 'OK';
    let alertSent = false;

    if (status === 'ALERT') {
      console.log(`[bot-15] [ALERT] Bland.ai balance critically low: $${currentBalance.toFixed(2)}`);
      try {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'billaxellc@gmail.com',
          subject: '🚨 URGENT: Bland.ai Balance Low — Calls Will Stop',
          text: [
            `URGENT: Bland.ai credit balance is critically low.`,
            ``,
            `Current Balance: $${currentBalance.toFixed(2)}`,
            `Alert Threshold: $${ALERT_THRESHOLD.toFixed(2)}`,
            `Estimated Calls Remaining: ${estimatedCallsRemaining}`,
            ``,
            `Top up immediately at https://app.bland.ai to prevent Maya from going silent.`,
            ``,
            `— BillAxe Bot System`
          ].join('\n')
        });
        alertSent = true;
        console.log('[bot-15] [EMAIL] Low balance alert sent');
      } catch (e) {
        console.log(`[bot-15] [ERROR] Alert email failed: ${e.message}`);
      }
    } else {
      console.log(`[bot-15] [SUCCESS] Bland.ai balance healthy: $${currentBalance.toFixed(2)} (~${estimatedCallsRemaining} calls remaining)`);
    }

    return {
      success: true,
      current_balance: +currentBalance.toFixed(2),
      threshold_alert: ALERT_THRESHOLD,
      status,
      estimated_calls_remaining: estimatedCallsRemaining,
      alert_sent: alertSent,
      checked_at: new Date().toISOString()
    };
  } catch (err) {
    console.log(`[bot-15] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
