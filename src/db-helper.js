const { Pool } = require('pg');
const REPLIT_DB_URL = process.env.REPLIT_DB_URL;

if (!REPLIT_DB_URL) {
  throw new Error('FATAL: Missing REPLIT_DB_URL');
}

const pool = new Pool({ connectionString: REPLIT_DB_URL });

async function query(text, params = []) {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (err) {
    console.error(`[db] Query failed: ${err.message}`);
    throw err;
  }
}

module.exports = { query, pool };