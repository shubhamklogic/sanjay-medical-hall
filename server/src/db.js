const { Pool } = require('pg');
require('dotenv').config();

// Extract clean connection string without extra query flags
const connectionString = (process.env.DATABASE_URL || '').split('&')[0];

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL Database successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};