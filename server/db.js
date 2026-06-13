require('dotenv').config();
const { Pool } = require('pg');

let pool = null;

async function setupDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env file");
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connected to the PostgreSQL database on Neon.');

  // Initialize tables
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(255)
  )`);
  
  // Upgrade script for existing users table
  const newColumns = [
    'display_name VARCHAR(255)',
    'avatar_style VARCHAR(50) DEFAULT \'notionists\'',
    'status_message VARCHAR(255)',
    'contact_line VARCHAR(100)',
    'contact_discord VARCHAR(100)',
    'contact_ig VARCHAR(100)',
    'theme_color VARCHAR(50) DEFAULT \'default\'',
    'quiet_hours_data TEXT',
    'avatar_url TEXT'
  ];

  for (const col of newColumns) {
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col}`);
    } catch (e) {
      // Column might already exist
    }
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    invite_code VARCHAR(50) UNIQUE,
    is_specific_dates INTEGER DEFAULT 0,
    start_date VARCHAR(255),
    end_date VARCHAR(255),
    creator_id INTEGER
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS schedules (
    user_id INTEGER PRIMARY KEY,
    schedule_data TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    weight INTEGER DEFAULT 1,
    role VARCHAR(50) DEFAULT 'member',
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER,
    user_id INTEGER,
    message TEXT,
    type VARCHAR(50) DEFAULT 'text',
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS group_schedules (
    group_id INTEGER,
    user_id INTEGER,
    schedule_data TEXT,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Performance Optimization: Add Indices for frequent lookups
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`);

  // Simple Wrapper to make it backwards compatible with sqlite db.run, db.get, db.all
  return getDB();
}

function getDB() {
  if (!pool) throw new Error('Database not initialized');
  
  // Convert '?' to '$1, $2...' on the fly
  function convertSql(sql) {
    let i = 1;
    return sql.replace(/\?/g, () => `$${i++}`);
  }

  return {
    run: async (sql, params = []) => {
      const pgSql = convertSql(sql);
      const res = await pool.query(pgSql, params);
      let lastID = 0;
      if (res.rows && res.rows.length > 0 && res.rows[0].id) {
        lastID = res.rows[0].id;
      }
      return { lastID, changes: res.rowCount };
    },
    get: async (sql, params = []) => {
      const pgSql = convertSql(sql);
      const res = await pool.query(pgSql, params);
      return res.rows[0] || null;
    },
    all: async (sql, params = []) => {
      const pgSql = convertSql(sql);
      const res = await pool.query(pgSql, params);
      return res.rows;
    }
  };
}

module.exports = { setupDB, getDB };
