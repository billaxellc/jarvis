const Logger = require('../logger');
const { query } = require('../db');
const axios = require('axios');
const config = require('../config');

const logger = new Logger('bot-2-call-quality-inspector');

async function run() {
  try {
    logger.info('Starting call quality inspection');

    // Get call logs from Bland.ai for last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query Bland.ai for recent calls
    const response = await axios.get('https://api.bland.ai/calls', {
      headers: {
        authorization: config.bland.apiKey,
      },
      params: {
        created_at_gt: twentyFourHoursAgo.toISOString(),
      },
    });

    const calls = response.data.calls || [];

    const issues = {
      dropped: [],
      failed: [],
      earlyHangup: [],
      total: calls.length,
    };

    for (const call of calls) {
      if (call.status === 'dropped') {
        issues.dropped.push(call.id);
      } else if (call.status === 'failed') {
        issues.failed.push(call.id);
      } else if (call.duration < 30) {
        // Early hangup if less than 30 seconds
        issues.earlyHangup.push(call.id);
      }
    }

    logger.info('Call quality inspection complete', issues);

    return {
      status: 'success',
      issues,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
