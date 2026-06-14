const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { setupDB, getDB } = require('./db');
const path = require('path');

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

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Helper to handle async routes
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Rate limiter: 登入/註冊 每個 IP 每 15 分鐘最多 20 次
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '請求過於頻繁，請 15 分鐘後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter: 一般 API 每個 IP 每分鐘最多 120 次
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: '請求過於頻繁，請稍後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// --- User API ---

app.post('/api/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: '請輸入暱稱' });
  if (username.length > 20) return res.status(400).json({ error: '暱稱不能超過 20 個字' });
  if (!password || password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });

  const db = getDB();
  const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (existingUser) {
    return res.status(400).json({ error: '此暱稱已被註冊' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?) RETURNING id', [username, hashedPassword]);
  res.json({ user: { id: result.lastID, username, display_name: username, theme_color: 'default', avatar_style: 'notionists', avatar_url: '' } });
}));

app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '請輸入暱稱與密碼' });

  const db = getDB();
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return res.status(400).json({ error: '找不到此帳號' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ error: '密碼錯誤' });
  }

  res.json({ user: { id: user.id, username: user.username, display_name: user.display_name || user.username, theme_color: user.theme_color || 'default', avatar_style: user.avatar_style || 'notionists', avatar_url: user.avatar_url || '' } });
}));

// --- Profile API ---

app.put('/api/users/:userId/profile', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { 
    display_name, 
    avatar_style, 
    avatar_url,
    status_message, 
    contact_line, 
    contact_discord, 
    contact_ig, 
    theme_color, 
    quiet_hours_data 
  } = req.body;

  if (display_name && display_name.trim() === '') {
    return res.status(400).json({ error: '暱稱不能為空' });
  }
  if (display_name && display_name.length > 30) {
    return res.status(400).json({ error: '暱稱不能超過 30 個字' });
  }

  const db = getDB();
  
  // We'll update the user dynamically based on provided fields
  const updates = [];
  const params = [];
  
  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name.trim()); }
  if (avatar_style !== undefined) { updates.push('avatar_style = ?'); params.push(avatar_style); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }
  if (status_message !== undefined) { updates.push('status_message = ?'); params.push(status_message); }
  if (contact_line !== undefined) { updates.push('contact_line = ?'); params.push(contact_line); }
  if (contact_discord !== undefined) { updates.push('contact_discord = ?'); params.push(contact_discord); }
  if (contact_ig !== undefined) { updates.push('contact_ig = ?'); params.push(contact_ig); }
  if (theme_color !== undefined) { updates.push('theme_color = ?'); params.push(theme_color); }
  if (quiet_hours_data !== undefined) { updates.push('quiet_hours_data = ?'); params.push(JSON.stringify(quiet_hours_data)); }

  if (updates.length > 0) {
    params.push(userId);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  // Fetch updated user to return
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  delete user.password;
  res.json({ success: true, user });
}));
// --- Stats API ---

app.get('/api/users/:userId/stats', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const db = getDB();
  
  // 1. Group Count
  const groupCountRow = await db.get('SELECT COUNT(*) as count FROM group_members WHERE user_id = ?', [userId]);
  const groupCount = groupCountRow ? groupCountRow.count : 0;

  // 2. Total Free Hours (count of state 2 in schedule)
  const scheduleRow = await db.get('SELECT schedule_data FROM schedules WHERE user_id = ?', [userId]);
  let freeCount = 0;
  if (scheduleRow && scheduleRow.schedule_data) {
    try {
      const schedule = JSON.parse(scheduleRow.schedule_data);
      for (let day = 0; day < 7; day++) {
        for (let period = 0; period < 14; period++) {
          if (schedule[day] && schedule[day][period] === 2) {
            freeCount++;
          }
        }
      }
    } catch(e) {}
  }
  
  // 3. Most Free Day
  const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  let mostFreeDay = '無資料';
  if (scheduleRow && scheduleRow.schedule_data) {
    try {
      const schedule = JSON.parse(scheduleRow.schedule_data);
      let maxFree = -1;
      let maxDayIdx = -1;
      for (let day = 0; day < 7; day++) {
        let dayFree = 0;
        for (let period = 0; period < 14; period++) {
          if (schedule[day] && schedule[day][period] === 2) dayFree++;
        }
        if (dayFree > maxFree) {
          maxFree = dayFree;
          maxDayIdx = day;
        }
      }
      if (maxDayIdx !== -1 && maxFree > 0) {
        mostFreeDay = dayNames[maxDayIdx];
      }
    } catch(e) {}
  }

  const userRow = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  delete userRow.password;

  res.json({ stats: { groupCount, freeCount, mostFreeDay }, user: userRow });
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
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: '群組名稱不能為空' });
  }
  if (name.length > 30) {
    return res.status(400).json({ error: '群組名稱不能超過 30 個字' });
  }

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const db = getDB();
  
  const result = await db.run(
    'INSERT INTO groups (name, invite_code, is_specific_dates, start_date, end_date, creator_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id', 
    [name, inviteCode, is_specific_dates ? 1 : 0, start_date || null, end_date || null, userId]
  );
  const groupId = result.lastID;
  
  await db.run('INSERT INTO group_members (group_id, user_id, weight) VALUES (?, ?, 1)', [groupId, userId]);
  res.json({ group: { id: groupId, name, invite_code: inviteCode, is_specific_dates, start_date, end_date, creator_id: userId } });
}));

app.post('/api/groups/join', asyncHandler(async (req, res) => {
  const { inviteCode, userId } = req.body;
  const db = getDB();
  
  const group = await db.get('SELECT id, name FROM groups WHERE invite_code = ?', [inviteCode]);
  if (!group) return res.status(404).json({ error: '找不到該群組或邀請碼錯誤' });
  
  await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [group.id, userId]);
  res.json({ group });
}));

app.get('/api/users/:userId/groups', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const db = getDB();
  const rows = await db.all(`
      SELECT g.id, g.name, g.invite_code, g.is_specific_dates, g.start_date, g.end_date 
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
  `, [userId]);
  res.json({ groups: rows });
}));

// --- Announcement API ---

app.put('/api/groups/:groupId/announcement', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId, announcement } = req.body;
  const db = getDB();

  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return res.status(404).json({ error: '找不到群組' });

  // 只有管理員或副管理員可以編輯公告
  const isCreator = group.creator_id === parseInt(userId);
  const memberRow = await db.get('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  const isSubadmin = memberRow && memberRow.role === 'subadmin';

  if (!isCreator && !isSubadmin) {
    return res.status(403).json({ error: '權限不足：只有管理員或副管理員可以編輯公告' });
  }

  if (announcement && announcement.length > 200) {
    return res.status(400).json({ error: '公告不能超過 200 個字' });
  }

  await db.run('UPDATE groups SET announcement = ? WHERE id = ?', [announcement || null, groupId]);
  io.to(`group-${groupId}`).emit('announcement-updated', announcement || '');
  res.json({ success: true });
}));

app.delete('/api/groups/:groupId', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  const db = getDB();

  if (!userId) {
    return res.status(403).json({ error: '權限不足：缺少使用者資訊' });
  }

  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group || group.creator_id !== parseInt(userId)) {
    return res.status(403).json({ error: '權限不足：只有群組建立者可以解散群組' });
  }

  await db.run('DELETE FROM groups WHERE id = ?', [groupId]);
  io.to(`group-${groupId}`).emit('group-deleted');
  res.json({ success: true });
}));

app.delete('/api/groups/:groupId/members/:memberId', asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const { userId } = req.body; // admin's id
  const db = getDB();

  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  if (group.creator_id !== parseInt(userId) && parseInt(userId) !== parseInt(memberId)) {
    return res.status(403).json({ error: '權限不足：只有群組建立者可以踢出成員' });
  }

  await db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, memberId]);
  io.to(`group-${groupId}`).emit('member-kicked', memberId);
  res.json({ success: true });
}));

app.put('/api/groups/:groupId/members/:memberId/weight', asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const { userId, weight } = req.body; // admin's id
  const db = getDB();

  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const myRoleRow = await db.get('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  const isCreator = group.creator_id === parseInt(userId);
  const isSubadmin = myRoleRow && myRoleRow.role === 'subadmin';

  if (!isCreator && !isSubadmin) {
    return res.status(403).json({ error: '權限不足：只有群組建立者或副管理員可以更改成員權重' });
  }

  await db.run('UPDATE group_members SET weight = ? WHERE group_id = ? AND user_id = ?', [weight, groupId, memberId]);
  io.to(`group-${groupId}`).emit('weight-updated');
  res.json({ success: true });
}));

app.put('/api/groups/:groupId/members/:memberId/role', asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const { userId, role } = req.body; 
  const db = getDB();

  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group || group.creator_id !== parseInt(userId)) {
    return res.status(403).json({ error: '權限不足：只有群組建立者可以更改成員身分' });
  }

  if (role !== 'member' && role !== 'subadmin') {
    return res.status(400).json({ error: '無效的身分' });
  }

  await db.run('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', [role, groupId, memberId]);
  io.to(`group-${groupId}`).emit('role-updated');
  res.json({ success: true });
}));

app.get('/api/groups/:groupId/schedule/:userId', asyncHandler(async (req, res) => {
  const { groupId, userId } = req.params;
  const db = getDB();
  const row = await db.get('SELECT schedule_data FROM group_schedules WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  if (row && row.schedule_data) {
    res.json({ schedule: JSON.parse(row.schedule_data) });
  } else {
    res.json({ schedule: null });
  }
}));

app.get('/api/groups/:groupId/match', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const db = getDB();
  
  const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  const scheduleSelector = group.is_specific_dates 
    ? 'gs.schedule_data AS schedule_data' 
    : 'COALESCE(gs.schedule_data, s.schedule_data) AS schedule_data';

  const scheduleQuery = `SELECT u.id, u.username, COALESCE(u.display_name, u.username) AS display_name, 
       u.avatar_style, u.avatar_url, u.status_message, u.contact_line, u.contact_discord, u.contact_ig, u.quiet_hours_data,
       ${scheduleSelector}, gm.weight, gm.role 
       FROM group_members gm 
       JOIN users u ON gm.user_id = u.id 
       LEFT JOIN schedules s ON u.id = s.user_id 
       LEFT JOIN group_schedules gs ON u.id = gs.user_id AND gs.group_id = ? 
       WHERE gm.group_id = ?`;

  const params = [groupId, groupId];
  const members = await db.all(scheduleQuery, params);
  
  const membersData = members.map(m => {
    let parsedSchedule = null;
    let parsedQuietHours = null;
    if (m.schedule_data) {
      try { parsedSchedule = JSON.parse(m.schedule_data); } catch(e) { console.error('Parse err'); }
    }
    if (m.quiet_hours_data) {
      try { parsedQuietHours = JSON.parse(m.quiet_hours_data); } catch(e) {}
    }
    return {
      id: m.id,
      username: m.display_name,
      login_username: m.username,
      avatar_style: m.avatar_style || 'notionists',
      avatar_url: m.avatar_url || '',
      status_message: m.status_message,
      contact_line: m.contact_line,
      contact_discord: m.contact_discord,
      contact_ig: m.contact_ig,
      quiet_hours: parsedQuietHours,
      weight: m.weight || 1,
      role: m.role || 'member',
      schedule: parsedSchedule
    };
  });
  
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
    SELECT m.id, m.message, m.created_at, COALESCE(u.display_name, u.username) AS username, u.username AS login_username, u.avatar_style, u.avatar_url, m.type, m.payload
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.group_id = ?
    ORDER BY m.created_at ASC
  `, [groupId]);
  const formattedRows = rows.map(r => ({
    ...r,
    created_at: r.created_at + 'Z' // Enforce UTC so browser parses to local time correctly
  }));
  res.json({ messages: formattedRows });
}));

app.post('/api/groups/:groupId/messages', asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId, message, type = 'text', payload = null } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ error: '留言不能為空' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: '留言不能超過 500 字' });
  }

  const db = getDB();
  
  const result = await db.run('INSERT INTO messages (group_id, user_id, message, type, payload) VALUES (?, ?, ?, ?, ?) RETURNING id', [groupId, userId, message.trim(), type, payload]);
  const msgId = result.lastID;
  const row = await db.get(`
    SELECT m.id, m.message, m.created_at, COALESCE(u.display_name, u.username) AS username, u.username AS login_username, u.avatar_style, u.avatar_url, m.type, m.payload
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `, [msgId]);
  
  io.to(`group-${groupId}`).emit('new-message', { ...row, created_at: row.created_at + 'Z' });
  res.json({ message: { ...row, created_at: row.created_at + 'Z' } });
}));

app.post('/api/messages/:messageId/vote', asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { userId, optionIndex } = req.body;
  const db = getDB();
  
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
  if (!msg || msg.type !== 'poll') return res.status(404).json({ error: '找不到該投票' });
  
  const payload = JSON.parse(msg.payload);
  
  // 移除使用者先前的投票
  payload.options.forEach(opt => {
    if (!opt.voters) opt.voters = [];
    opt.voters = opt.voters.filter(id => String(id) !== String(userId));
  });
  
  // 加入新選項
  if (optionIndex !== null && payload.options[optionIndex]) {
    if (!payload.options[optionIndex].voters) payload.options[optionIndex].voters = [];
    payload.options[optionIndex].voters.push(Number(userId));
  }
  
  const newPayloadStr = JSON.stringify(payload);
  await db.run('UPDATE messages SET payload = ? WHERE id = ?', [newPayloadStr, messageId]);
  
  io.to(`group-${msg.group_id}`).emit('poll-updated', { messageId: msg.id, payload: newPayloadStr });
  res.json({ success: true, payload: newPayloadStr });
}));

// Vue Router fallback: Catch all non-API routes and serve index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    next();
  }
});

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
