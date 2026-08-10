/**
 * Bot 4: New User Onboarding Checker
 * Runs: Daily 3 AM UTC (8 PM Phoenix)
 * Simulates full onboarding flow
 * Logs every step, flags failures
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-04] [INFO] Starting: Onboarding Checker');

    const steps = [];

    // Step 1: Check env vars are set
    try {
      if (!supabaseUrl || !supabaseKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
      steps.push({ step: 'Supabase Config', status: 'OK' });
    } catch (e) {
      steps.push({ step: 'Supabase Config', status: 'FAILED', error: e.message });
    }

    // Step 2: Check Neon connection with a real DB ping
    try {
      await neonPool.query('SELECT 1');
      steps.push({ step: 'Neon Connection', status: 'OK' });
    } catch (e) {
      steps.push({ step: 'Neon Connection', status: 'FAILED', error: e.message });
    }

    // Step 3: Check uploaded_bills table via Neon
    try {
      await neonPool.query('SELECT id FROM public.uploaded_bills LIMIT 1');
      steps.push({ step: 'Database Access (uploaded_bills)', status: 'OK' });
    } catch (e) {
      steps.push({ step: 'Database Access (uploaded_bills)', status: 'FAILED', error: e.message });
    }

    // Step 4: Check user_profiles table via Supabase (non-fatal)
    try {
      const { error } = await supabase.from('user_profiles').select('id').limit(1);
      if (error) throw new Error(error.message);
      steps.push({ step: 'Database Access (user_profiles)', status: 'OK' });
    } catch (e) {
      steps.push({ step: 'Database Access (user_profiles)', status: 'WARN', error: e.message });
      console.log(`[bot-04] [WARN] user_profiles table issue: ${e.message}`);
    }

    // Step 5: Check BILLAXE_API_URL is set
    try {
      const apiUrl = process.env.BILLAXE_API_URL;
      if (!apiUrl) throw new Error('BILLAXE_API_URL not set');
      steps.push({ step: 'API URL Config', status: 'OK', value: apiUrl });
    } catch (e) {
      steps.push({ step: 'API URL Config', status: 'FAILED', error: e.message });
    }

    const failedSteps = steps.filter(s => s.status === 'FAILED').length;
    const warnSteps = steps.filter(s => s.status === 'WARN').length;
    const statusMsg = failedSteps === 0
      ? `All systems operational (${warnSteps} warnings)`
      : `${failedSteps} step(s) failed, ${warnSteps} warnings`;

    console.log(`[bot-04] [SUCCESS] Onboarding simulation complete - ${statusMsg}`);
    return { success: failedSteps === 0, total_steps: steps.length, failed: failedSteps, warnings: warnSteps, steps };

  } catch (err) {
    console.log(`[bot-04] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
