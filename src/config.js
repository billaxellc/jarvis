require('dotenv').config();

const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY
  },
  bland: {
    apiKey: process.env.BLAND_API_KEY
  },
  email: {
    user: process.env.SMTP_USER || 'billaxellc@gmail.com',
    pass: process.env.SMTP_PASS,
    to: process.env.MANAGER_EMAIL || 'billaxellc@gmail.com'
  }
};

// Validate required vars
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('[config] MISSING ENV VARS:', missing.join(', '));
  process.exit(1);
}

module.exports = config;
