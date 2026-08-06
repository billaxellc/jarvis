require('dotenv').config();

module.exports = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY, // Use service key for privileged operations
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  bland: {
    apiKey: process.env.BLAND_API_KEY,
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    reportEmail: process.env.REPORT_EMAIL,
  },
  env: process.env.NODE_ENV || 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
};
