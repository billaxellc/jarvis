const axios = require('axios');
const config = require('../config');

async function run() {
  console.log('[bot_bland_monitor] Starting...');
  
  if (!config.bland.apiKey) {
    return { success: false, error: 'No BLAND_API_KEY set' };
  }
  
  try {
    const response = await axios.get('https://api.bland.ai/v1/calls', {
      headers: { authorization: config.bland.apiKey },
      params: { limit: 10 }
    });
    
    const calls = response.data?.calls || response.data || [];
    const callCount = Array.isArray(calls) ? calls.length : 0;
    
    console.log(`[bot_bland_monitor] Recent calls: ${callCount}`);
    return { success: true, recentCalls: callCount };
  } catch (err) {
    console.error('[bot_bland_monitor] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
