/**
 * Bot 11: API Response Time Monitor
 * Runs: Every 6 hours
 * Tests core endpoints: upload, retry, get-bills
 * Flags slow response times
 */

const axios = require('axios');

const BILLAXE_API = process.env.BILLAXE_API_URL || 'https://billaxe.app';
const BOT_SECRET = process.env.BILLAXE_BOT_SECRET;

async function pingEndpoint(method, path, body = null) {
  const start = Date.now();
  try {
    const config = {
      method,
      url: `${BILLAXE_API}${path}`,
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': BOT_SECRET || ''
      },
      timeout: 10000
    };
    if (body) config.data = body;
    const res = await axios(config);
    return { status: 'OK', response_time_ms: Date.now() - start, http_status: res.status };
  } catch (err) {
    return {
      status: err.response?.status === 401 ? 'OK' : 'ERROR',
      response_time_ms: Date.now() - start,
      http_status: err.response?.status || 0,
      error: err.message
    };
  }
}

async function run() {
  try {
    console.log('[bot-11] [INFO] Starting: API Response Time Monitor');

    const results = {};

    // GET /api/bills/uploaded — expects 401 without auth (that's fine, means API is up)
    results['GET /api/bills/uploaded'] = await pingEndpoint('GET', '/api/bills/uploaded');

    // POST /api/webhooks/bland — expects 400 with empty body (means endpoint is up)
    results['POST /api/webhooks/bland'] = await pingEndpoint('POST', '/api/webhooks/bland', {});

    // GET / — basic health check
    results['GET /'] = await pingEndpoint('GET', '/');

    const allHealthy = Object.values(results).every(r => r.status === 'OK' || r.http_status === 401 || r.http_status === 400);
    const slowEndpoints = Object.entries(results).filter(([, r]) => r.response_time_ms > 5000);

    const monitoring = {
      timestamp: new Date().toISOString(),
      endpoints_tested: Object.keys(results).length,
      all_healthy: allHealthy && slowEndpoints.length === 0,
      slow_endpoints: slowEndpoints.map(([name]) => name),
      endpoints: results
    };

    console.log(`[bot-11] [SUCCESS] ${monitoring.endpoints_tested} endpoints tested — ${monitoring.all_healthy ? 'all healthy' : 'issues detected'}`);
    return { success: true, ...monitoring };
  } catch (err) {
    console.log(`[bot-11] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
