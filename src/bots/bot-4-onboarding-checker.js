const Logger = require('../logger');
const axios = require('axios');

const logger = new Logger('bot-4-onboarding-checker');

async function run() {
  try {
    logger.info('Starting onboarding flow simulation');

    const steps = [
      { name: 'landing_page', url: 'https://billaxe.app' },
      { name: 'signup_page', url: 'https://billaxe.app/auth/signup' },
      { name: 'dashboard', url: 'https://billaxe.app/dashboard' },
    ];

    const results = {};
    let failureCount = 0;

    for (const step of steps) {
      try {
        const response = await axios.get(step.url, { timeout: 5000 });
        results[step.name] = {
          status: response.status === 200 ? 'pass' : 'fail',
          statusCode: response.status,
        };
        if (response.status !== 200) failureCount++;
      } catch (err) {
        results[step.name] = {
          status: 'fail',
          error: err.message,
        };
        failureCount++;
      }
    }

    logger.info('Onboarding check complete', {
      stepsChecked: steps.length,
      failures: failureCount,
      results,
    });

    return {
      status: 'success',
      onboardingHealth: failureCount === 0 ? 'healthy' : 'degraded',
      details: results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
