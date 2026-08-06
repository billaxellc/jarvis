const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let supabaseClient = null;

function initializeDB() {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url, config.supabase.key);
  }
  return supabaseClient;
}

async function query(table, filters = {}) {
  const db = initializeDB();
  let query = db.from(table).select('*');

  Object.keys(filters).forEach((key) => {
    query = query.eq(key, filters[key]);
  });

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function update(table, id, data) {
  const db = initializeDB();
  const { data: result, error } = await db
    .from(table)
    .update(data)
    .eq('id', id)
    .select();

  if (error) throw error;
  return result;
}

async function insert(table, data) {
  const db = initializeDB();
  const { data: result, error } = await db
    .from(table)
    .insert([data])
    .select();

  if (error) throw error;
  return result;
}

module.exports = {
  initializeDB,
  query,
  update,
  insert,
};
