const axios = require('axios');

module.exports = async function run() {
  const endpoints = [
    { name: 'GET /api/bills/uploaded', url: 'https://billaxe.app/api/bills/uploaded' },
    { name: 'GET /api/user/profile', url: 'https://billaxe.app/api/user/profile' },
    { name: 'POST /api/bills/submit', url: 'https://billaxe.app/api/bills/submit' }
  ];

  const results = [];
  let healthy = 0;

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await axios.get(endpoint.url, {
        timeout: 5000,
        headers: { 'Authorization': `Bearer ${process.env.BILLAXE_API_KEY || ''}` }
      }).catch(() => ({ status: 500 }));
      const responseTime = Date.now() - startTime;

      const isHealthy = response.status >= 200 && response.status < 300;
      if (isHealthy) healthy++;

      results.push({
        endpoint: endpoint.name,
        status: response.status,
        response_time_ms: responseTime,
        healthy: isHealthy
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        status: 'timeout',
        response_time_ms: 5000,
        healthy: false
      });
    }
  }

  return {
    status: 'success',
    total_endpoints: endpoints.length,
    healthy_endpoints: healthy,
    health_rate: ((healthy / endpoints.length) * 100).toFixed(1) + '%',
    details: results
  };
};
