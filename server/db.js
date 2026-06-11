const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS schedules (
      user_id INTEGER PRIMARY KEY,
      schedule_data TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      invite_code TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER,
      user_id INTEGER,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      user_id INTEGER,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS group_schedules (
      group_id INTEGER,
      user_id INTEGER,
      schedule_data TEXT,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Alter groups table (safe to fail if already exists)
    db.run(`ALTER TABLE groups ADD COLUMN is_specific_dates INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE groups ADD COLUMN start_date TEXT`, () => {});
    db.run(`ALTER TABLE groups ADD COLUMN end_date TEXT`, () => {});
  }
});

module.exports = db;
