const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let dbDir = __dirname;
// Detect Azure App Service environment
if (process.env.HOME && process.env.WEBSITE_SITE_NAME) {
  dbDir = path.join(process.env.HOME, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}
const dbPath = path.resolve(dbDir, 'database.sqlite');
let dbInstance = null;

async function setupDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Connected to the SQLite database.');

  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS schedules (
    user_id INTEGER PRIMARY KEY,
    schedule_data TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    invite_code TEXT UNIQUE
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    user_id INTEGER,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS group_schedules (
    group_id INTEGER,
    user_id INTEGER,
    schedule_data TEXT,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Performance Optimization: Add Indices for frequent lookups
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`);

  // Alter groups table (safe to fail if already exists)
  try { await db.exec(`ALTER TABLE groups ADD COLUMN is_specific_dates INTEGER DEFAULT 0`); } catch (e) {}
  try { await db.exec(`ALTER TABLE groups ADD COLUMN start_date TEXT`); } catch (e) {}
  try { await db.exec(`ALTER TABLE groups ADD COLUMN end_date TEXT`); } catch (e) {}
  try { await db.exec(`ALTER TABLE groups ADD COLUMN creator_id INTEGER`); } catch (e) {}

  // Alter group_members table
  try { await db.exec(`ALTER TABLE group_members ADD COLUMN weight INTEGER DEFAULT 1`); } catch (e) {}
  try { await db.exec(`ALTER TABLE group_members ADD COLUMN role TEXT DEFAULT 'member'`); } catch (e) {}

  // Alter messages table
  try { await db.exec(`ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'`); } catch (e) {}
  try { await db.exec(`ALTER TABLE messages ADD COLUMN payload TEXT`); } catch (e) {}

  dbInstance = db;
  return db;
}

function getDB() {
  if (!dbInstance) throw new Error('Database not initialized');
  return dbInstance;
}

module.exports = { setupDB, getDB };
