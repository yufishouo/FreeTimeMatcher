const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { setupDB, getDB } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
  });
});
app.use(cors());
app.use(express.json());

// Helper to handle async routes
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// --- User API ---

app.post('/api/login', asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const db = getDB();
  const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (row) {
    res.json({ user: row });
  } else {
    const result = await db.run('INSERT INTO users (username) VALUES (?)', [username]);
    res.json({ user: { id: result.lastID, username } });
  }
}));

// --- Schedule API ---

app.get('/api/schedule/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const db = getDB();
  const row = await db.get('SELECT schedule_data FROM schedules WHERE user_id = ?', [userId]);
  if (row) {
    res.json({ schedule: JSON.parse(row.schedule_data) });
  } else {
    res.json({ schedule: null });
  }
}));

app.post('/api/schedule/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { schedule } = req.body;
  
  const scheduleData = JSON.stringify(schedule);
  const db = getDB();
  
  await db.run(`
    INSERT INTO schedules (user_id, schedule_data) 
    VALUES (?, ?) 
    ON CONFLICT(user_id) DO UPDATE SET schedule_data = excluded.schedule_data
  `, [userId, scheduleData]);
  
  const rows = await db.all('SELECT group_id FROM group_members WHERE user_id = ?', [userId]);
  rows.forEach(row => {
    io.to(`group-${row.group_id}`).emit('schedule-updated');
  });

  res.json({ success: true });
}));

// --- Group API ---

app.post('/api/groups', asyncHandler(async (req, res) => {
  const { name, userId, is_specific_dates, start_date, end_date } = req.body;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const db = getDB();
  
  const result = await db.run(
    'INSERT INTO groups (name, invite_code, is_specific_dates, start_date, end_date) VALUES (?, ?, ?, ?, ?)', 
    [name, inviteCode, is_specific_dates ? 1 : 0, start_date || null, end_date || null]
  );
  const groupId = result.lastID;
  
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, userId]);
  res.json({ group: { id: groupId, name, invite_code: inviteCode, is_specific_dates, start_date, end_date } });
}));

app.post('/api/groups/join', asyncHandler(async (req, res) => {
  const { inviteCode, userId } = req.body;
  const db = getDB();
  
  const group = await db.get('SELECT id, name FROM groups WHERE invite_code = ?', [inviteCode]);
  if (!group) return res.status(404).json({ error: 'Group not found or invalid invite code' });
  
  await db.run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [group.id, userId]);
  res.json({ group });
}));

app.get('/api/users/:userId/groups', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const db = getDB();
  const rows = await db.all(`
      SELECT g.id, g.name, g.invite_code 
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
  `, [userId]);
  res.json({ groups: rows });
}));

app.delete('/api/groups/:groupId', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const db = getDB();
  
  // Since we added ON DELETE CASCADE, we only need to delete the group!
  await db.run('DELETE FROM groups WHERE id = ?', [groupId]);
  io.to(`group-${groupId}`).emit('group-deleted');
  res.json({ success: true });
}));

app.get('/api/groups/:groupId/match', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const db = getDB();
  
  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  const scheduleQuery = group.is_specific_dates 
    ? `SELECT u.id, u.username, gs.schedule_data 
       FROM group_members gm 
       JOIN users u ON gm.user_id = u.id 
       LEFT JOIN group_schedules gs ON u.id = gs.user_id AND gs.group_id = ? 
       WHERE gm.group_id = ?`
    : `SELECT u.id, u.username, s.schedule_data 
       FROM group_members gm 
       JOIN users u ON gm.user_id = u.id 
       LEFT JOIN schedules s ON u.id = s.user_id 
       WHERE gm.group_id = ?`;

  const params = group.is_specific_dates ? [groupId, groupId] : [groupId];
  const members = await db.all(scheduleQuery, params);
  
  const membersData = members.map(m => ({
    id: m.id,
    username: m.username,
    schedule: m.schedule_data ? JSON.parse(m.schedule_data) : null
  }));
  
  res.json({ group, members: membersData });
}));

app.post('/api/groups/:groupId/schedule', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId, schedule } = req.body;
  const scheduleData = JSON.stringify(schedule);
  const db = getDB();
  
  await db.run(`
    INSERT INTO group_schedules (group_id, user_id, schedule_data) 
    VALUES (?, ?, ?) 
    ON CONFLICT(group_id, user_id) DO UPDATE SET schedule_data = excluded.schedule_data
  `, [groupId, userId, scheduleData]);
  
  io.to(`group-${groupId}`).emit('schedule-updated');
  res.json({ success: true });
}));

// --- Messages API ---

app.get('/api/groups/:groupId/messages', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const db = getDB();
  const rows = await db.all(`
    SELECT m.id, m.message, m.created_at, u.username
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.group_id = ?
    ORDER BY m.created_at ASC
  `, [groupId]);
  res.json({ messages: rows });
}));

app.post('/api/groups/:groupId/messages', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId, message } = req.body;
  const db = getDB();
  
  const result = await db.run('INSERT INTO messages (group_id, user_id, message) VALUES (?, ?, ?)', [groupId, userId, message]);
  const msgId = result.lastID;
  const row = await db.get(`
    SELECT m.id, m.message, m.created_at, u.username
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `, [msgId]);
  
  io.to(`group-${groupId}`).emit('new-message', row);
  res.json({ message: row });
}));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;

setupDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to setup DB:', err);
});
