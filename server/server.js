const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

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

// --- User API ---

// Login or register
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json({ user: row });
    } else {
      db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ user: { id: this.lastID, username } });
      });
    }
  });
});

// --- Schedule API ---

// Get schedule
app.get('/api/schedule/:userId', (req, res) => {
  const { userId } = req.params;
  db.get('SELECT schedule_data FROM schedules WHERE user_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json({ schedule: JSON.parse(row.schedule_data) });
    } else {
      // Default empty schedule
      res.json({ schedule: null });
    }
  });
});

// Update schedule
app.post('/api/schedule/:userId', (req, res) => {
  const { userId } = req.params;
  const { schedule } = req.body; // Expecting an object/array representing the 7x14 grid
  
  const scheduleData = JSON.stringify(schedule);
  
  db.run(`
    INSERT INTO schedules (user_id, schedule_data) 
    VALUES (?, ?) 
    ON CONFLICT(user_id) DO UPDATE SET schedule_data = excluded.schedule_data
  `, [userId, scheduleData], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Broadcast schedule update to all groups the user belongs to
    db.all('SELECT group_id FROM group_members WHERE user_id = ?', [userId], (err, rows) => {
      if (!err && rows) {
        rows.forEach(row => {
          io.to(`group-${row.group_id}`).emit('schedule-updated');
        });
      }
    });

    res.json({ success: true });
  });
});

// --- Group API ---

// Create group
app.post('/api/groups', (req, res) => {
  const { name, userId, is_specific_dates, start_date, end_date } = req.body;
  // Generate random 6-character alphanumeric invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  db.run('INSERT INTO groups (name, invite_code, is_specific_dates, start_date, end_date) VALUES (?, ?, ?, ?, ?)', 
    [name, inviteCode, is_specific_dates ? 1 : 0, start_date || null, end_date || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const groupId = this.lastID;
    
    // Auto join the creator
    db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ group: { id: groupId, name, invite_code: inviteCode, is_specific_dates, start_date, end_date } });
    });
  });
});

// Join group
app.post('/api/groups/join', (req, res) => {
  const { inviteCode, userId } = req.body;
  
  db.get('SELECT id, name FROM groups WHERE invite_code = ?', [inviteCode], (err, group) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!group) return res.status(404).json({ error: 'Group not found or invalid invite code' });
    
    db.run('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [group.id, userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ group });
    });
  });
});

// Get user's groups
app.get('/api/users/:userId/groups', (req, res) => {
    const { userId } = req.params;
    db.all(`
        SELECT g.id, g.name, g.invite_code 
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ groups: rows });
    });
});

// Delete group
app.delete('/api/groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  
  db.run('DELETE FROM messages WHERE group_id = ?', [groupId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM group_schedules WHERE group_id = ?', [groupId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM group_members WHERE group_id = ?', [groupId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run('DELETE FROM groups WHERE id = ?', [groupId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          io.to(`group-${groupId}`).emit('group-deleted');
          res.json({ success: true });
        });
      });
    });
  });
});

// Get group info and match data
app.get('/api/groups/:groupId/match', (req, res) => {
  const { groupId } = req.params;
  
  // Get group info
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    // Get all members and their schedules
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

    db.all(scheduleQuery, params, (err, members) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const membersData = members.map(m => ({
        id: m.id,
        username: m.username,
        schedule: m.schedule_data ? JSON.parse(m.schedule_data) : null
      }));
      
      res.json({ group, members: membersData });
    });
  });
});

// Update group specific schedule
app.post('/api/groups/:groupId/schedule', (req, res) => {
  const { groupId } = req.params;
  const { userId, schedule } = req.body;
  
  const scheduleData = JSON.stringify(schedule);
  
  db.run(`
    INSERT INTO group_schedules (group_id, user_id, schedule_data) 
    VALUES (?, ?, ?) 
    ON CONFLICT(group_id, user_id) DO UPDATE SET schedule_data = excluded.schedule_data
  `, [groupId, userId, scheduleData], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Broadcast schedule update to the group
    io.to(`group-${groupId}`).emit('schedule-updated');

    res.json({ success: true });
  });
});

// --- Messages API ---

app.get('/api/groups/:groupId/messages', (req, res) => {
  const { groupId } = req.params;
  db.all(`
    SELECT m.id, m.message, m.created_at, u.username
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.group_id = ?
    ORDER BY m.created_at ASC
  `, [groupId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ messages: rows });
  });
});

app.post('/api/groups/:groupId/messages', (req, res) => {
  const { groupId } = req.params;
  const { userId, message } = req.body;
  db.run('INSERT INTO messages (group_id, user_id, message) VALUES (?, ?, ?)', [groupId, userId, message], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const msgId = this.lastID;
    db.get(`
      SELECT m.id, m.message, m.created_at, u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [msgId], (err, row) => {
      if (!err && row) {
        io.to(`group-${groupId}`).emit('new-message', row);
        res.json({ message: row });
      } else {
        res.status(500).json({ error: 'Failed to fetch created message' });
      }
    });
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
