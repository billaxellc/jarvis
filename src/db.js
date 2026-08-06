const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let client;

function getClient() {
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceKey);
  }
  return client;
}

module.exports = { getClient };
