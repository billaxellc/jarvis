
const cron = require('node-cron');

// Test bot - fires every minute, no timezone tricks
cron.schedule('*/1 * * * *', () => {
  console.log(`[bot-test] [INFO] TEST BOT FIRED - timestamp: ${new Date().toISOString()}`);
});

console.log('[bot-test] [INFO] Test bot scheduled to fire every minute');
