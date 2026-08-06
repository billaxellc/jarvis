const axios = require('axios');

module.exports = async function run() {
  try {
    // Call Bland.ai API to get account balance
    const response = await axios.get('https://api.bland.ai/v1/account', {
      headers: {
        'Authorization': `Bearer ${process.env.BLAND_API_KEY}`
      }
    });

    const balance = response.data?.balance || 0;
    const isLow = balance < 100; // Alert if less than $100 in credits

    return {
      status: 'success',
      balance: balance,
      currency: 'credits',
      is_low: isLow,
      alert: isLow ? 'CRITICAL: Balance is low, recharge soon!' : 'Balance healthy',
      message: `Current Bland.ai balance: ${balance} credits`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message || 'Could not fetch Bland.ai balance'
    };
  }
};
