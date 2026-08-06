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
  let q = db.from(table).select('*');

  Object.keys(filters).forEach((key) => {
    q = q.eq(key, filters[key]);
  });

  const { data, error } = await q;
  if (error) throw new Error(`Supabase query error: ${error.message}`);
  return data || [];
}

async function update(table, id, data) {
  const db = initializeDB();
  const { data: result, error } = await db
    .from(table)
    .update(data)
    .eq('id', id)
    .select();

  if (error) throw new Error(`Supabase update error: ${error.message}`);
  return result;
}

async function insert(table, data) {
  const db = initializeDB();
  const { data: result, error } = await db
    .from(table)
    .insert([data])
    .select();

  if (error) throw new Error(`Supabase insert error: ${error.message}`);
  return result;
}

async function queryRaw(sql) {
  const db = initializeDB();
  const { data, error } = await db.rpc('execute_sql', { sql_query: sql });
  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  return data;
}

module.exports = {
  initializeDB,
  query,
  update,
  insert,
  queryRaw,
};
