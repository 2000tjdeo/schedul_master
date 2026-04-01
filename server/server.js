const express = require('express');
const cors = require('cors');
const { initDb, query, queryOne, run } = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /api/users
app.get('/api/users', (req, res) => {
  try {
    const users = query('SELECT * FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users  — create or return existing user
app.post('/api/users', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' });
    }
    const trimmed = name.trim();
    const existing = queryOne('SELECT * FROM users WHERE name = ?', [trimmed]);
    if (existing) return res.json(existing);

    const { lastInsertRowid } = run('INSERT INTO users (name) VALUES (?)', [trimmed]);
    const user = queryOne('SELECT * FROM users WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

const TASK_SELECT = `
  SELECT
    t.*,
    u1.name AS assignee_name,
    u2.name AS creator_name,
    (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count
  FROM tasks t
  LEFT JOIN users u1 ON t.assignee_id = u1.id
  LEFT JOIN users u2 ON t.created_by = u2.id
`;

// GET /api/tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = query(TASK_SELECT + ' ORDER BY t.created_at DESC');
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = queryOne(TASK_SELECT + ' WHERE t.id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: '작업을 찾을 수 없습니다.' });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
app.post('/api/tasks', (req, res) => {
  try {
    const {
      title, description, status, priority, due_date, assignee_id, created_by,
      task_date, task_time, duration, category, location, is_recurring, recurring_type,
    } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: '제목을 입력해주세요.' });
    }
    const { lastInsertRowid } = run(
      `INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by,
         task_date, task_time, duration, category, location, is_recurring, recurring_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description || null,
        status || 'todo',
        priority || 'medium',
        due_date || task_date || null,
        assignee_id || null,
        created_by || null,
        task_date || null,
        task_time || '09:00',
        duration || 60,
        category || '업무',
        location || null,
        is_recurring ? 1 : 0,
        recurring_type || null,
      ]
    );
    const task = queryOne(TASK_SELECT + ' WHERE t.id = ?', [lastInsertRowid]);
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '작업을 찾을 수 없습니다.' });

    const {
      title, description, status, priority,
      due_date, assignee_id,
      task_date, task_time, duration, category, location, is_recurring, recurring_type,
    } = req.body;

    const newTitle      = title      !== undefined ? (title ? title.trim() : existing.title) : existing.title;
    const newDesc       = description !== undefined ? description : existing.description;
    const newStatus     = status      !== undefined ? status      : existing.status;
    const newPriority   = priority    !== undefined ? priority    : existing.priority;
    const newDueDate    = due_date    !== undefined ? due_date    : existing.due_date;
    const newAssigneeId = assignee_id !== undefined ? assignee_id : existing.assignee_id;
    const newTaskDate   = task_date   !== undefined ? task_date   : existing.task_date;
    const newTaskTime   = task_time   !== undefined ? task_time   : existing.task_time;
    const newDuration   = duration    !== undefined ? duration    : existing.duration;
    const newCategory   = category    !== undefined ? category    : existing.category;
    const newLocation   = location    !== undefined ? location    : existing.location;
    const newRecurring  = is_recurring !== undefined ? (is_recurring ? 1 : 0) : existing.is_recurring;
    const newRecurType  = recurring_type !== undefined ? recurring_type : existing.recurring_type;

    run(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?,
           due_date = ?, assignee_id = ?,
           task_date = ?, task_time = ?, duration = ?, category = ?,
           location = ?, is_recurring = ?, recurring_type = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        newTitle, newDesc, newStatus, newPriority,
        newDueDate, newAssigneeId,
        newTaskDate, newTaskTime, newDuration, newCategory,
        newLocation, newRecurring, newRecurType,
        req.params.id,
      ]
    );

    const task = queryOne(TASK_SELECT + ' WHERE t.id = ?', [req.params.id]);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '작업을 찾을 수 없습니다.' });

    // Delete comments first (sql.js doesn't enforce FK CASCADE automatically)
    run('DELETE FROM comments WHERE task_id = ?', [req.params.id]);
    run('DELETE FROM tasks WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: '작업이 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Comments ─────────────────────────────────────────────────────────────────

// GET /api/tasks/:id/comments
app.get('/api/tasks/:id/comments', (req, res) => {
  try {
    const comments = query(
      'SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/comments
app.post('/api/tasks/:id/comments', (req, res) => {
  try {
    const { user_id, user_name, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }
    const taskExists = queryOne('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!taskExists) return res.status(404).json({ error: '작업을 찾을 수 없습니다.' });

    const { lastInsertRowid } = run(
      'INSERT INTO comments (task_id, user_id, user_name, content) VALUES (?, ?, ?, ?)',
      [req.params.id, user_id || null, user_name || '익명', content.trim()]
    );
    const comment = queryOne('SELECT * FROM comments WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Appointments ──────────────────────────────────────────────────────────────

// GET /api/appointments
app.get('/api/appointments', (req, res) => {
  try {
    const appts = query('SELECT * FROM appointments ORDER BY date ASC, start_time ASC');
    res.json(appts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/appointments
app.post('/api/appointments', (req, res) => {
  try {
    const { title, date, start_time, end_time, location, memo, color, created_by, attendees } = req.body;
    if (!title?.trim() || !date || !start_time || !end_time)
      return res.status(400).json({ error: '제목, 날짜, 시간은 필수입니다.' });
    const { lastInsertRowid } = run(
      `INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by, attendees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), date, start_time, end_time, location||null, memo||null, color||'#6366f1', created_by||null, attendees||null]
    );
    const appt = queryOne('SELECT * FROM appointments WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(appt);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/appointments/:id
app.put('/api/appointments/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '약속을 찾을 수 없습니다.' });
    const { title, date, start_time, end_time, location, memo, color, attendees } = req.body;
    run(
      `UPDATE appointments SET title=?, date=?, start_time=?, end_time=?, location=?, memo=?, color=?, attendees=?, updated_at=datetime('now') WHERE id=?`,
      [
        title ?? existing.title, date ?? existing.date,
        start_time ?? existing.start_time, end_time ?? existing.end_time,
        location !== undefined ? location : existing.location,
        memo !== undefined ? memo : existing.memo,
        color ?? existing.color,
        attendees !== undefined ? attendees : existing.attendees,
        req.params.id
      ]
    );
    res.json(queryOne('SELECT * FROM appointments WHERE id = ?', [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/appointments/:id
app.delete('/api/appointments/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM appointments WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '약속을 찾을 수 없습니다.' });
    run('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Start ────────────────────────────────────────────────────────────────────

// ─── Auth (PIN 기반) ──────────────────────────────────────────────────────────

// POST /api/auth/login — 이름+PIN 로그인
app.post('/api/auth/login', (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '이름을 입력해주세요.' });
    const user = queryOne('SELECT * FROM users WHERE name = ?', [name.trim()]);
    if (!user) return res.status(404).json({ error: '등록되지 않은 사용자입니다.' });
    if (user.pin && !pin) return res.status(401).json({ error: 'PIN을 입력해주세요.', needPin: true });
    if (user.pin && user.pin !== pin) return res.status(401).json({ error: 'PIN이 올바르지 않습니다.' });
    const { pin: _p, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/set-pin — PIN 설정/변경
app.post('/api/auth/set-pin', (req, res) => {
  try {
    const { user_id, pin } = req.body;
    if (!pin || !/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN은 4~6자리 숫자여야 합니다.' });
    run('UPDATE users SET pin = ? WHERE id = ?', [pin, user_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Admin — 사용자 관리 ───────────────────────────────────────────────────────

// GET /api/admin/users
app.get('/api/admin/users', (req, res) => {
  try {
    const users = query('SELECT id, name, role, avatar_color, created_at FROM users ORDER BY created_at ASC');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/users/:id/role
app.put('/api/admin/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
    run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    const user = queryOne('SELECT id, name, role FROM users WHERE id = ?', [req.params.id]);
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', (req, res) => {
  try {
    run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 초대 토큰 ────────────────────────────────────────────────────────────────

const crypto = require('crypto');

// POST /api/invitations — 초대 생성
app.post('/api/invitations', (req, res) => {
  try {
    const { created_by, role = 'member', expires_hours = 72 } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expires_hours * 3600000).toISOString();
    const { lastInsertRowid } = run(
      'INSERT INTO invitations (token, role, created_by, expires_at) VALUES (?, ?, ?, ?)',
      [token, role, created_by, expiresAt]
    );
    const inv = queryOne('SELECT * FROM invitations WHERE id = ?', [lastInsertRowid]);
    res.json(inv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/invitations — 초대 목록
app.get('/api/invitations', (req, res) => {
  try {
    const list = query(`
      SELECT i.*, u.name AS creator_name, u2.name AS used_by_name
      FROM invitations i
      LEFT JOIN users u  ON i.created_by = u.id
      LEFT JOIN users u2 ON i.used_by    = u2.id
      ORDER BY i.created_at DESC
    `);
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/invitations/accept — 토큰으로 가입
app.post('/api/invitations/accept', (req, res) => {
  try {
    const { token, name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '이름을 입력해주세요.' });
    const inv = queryOne('SELECT * FROM invitations WHERE token = ?', [token]);
    if (!inv)          return res.status(404).json({ error: '초대가 존재하지 않습니다.' });
    if (inv.used_at)   return res.status(410).json({ error: '이미 사용된 초대입니다.' });
    if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: '만료된 초대입니다.' });

    const existing = queryOne('SELECT * FROM users WHERE name = ?', [name.trim()]);
    let user;
    if (existing) {
      user = existing;
    } else {
      const { lastInsertRowid } = run('INSERT INTO users (name, role) VALUES (?, ?)', [name.trim(), inv.role]);
      user = queryOne('SELECT * FROM users WHERE id = ?', [lastInsertRowid]);
    }
    run('UPDATE invitations SET used_at = ?, used_by = ? WHERE id = ?',
      [new Date().toISOString(), user.id, inv.id]);
    const { pin: _p, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/invitations/:id
app.delete('/api/invitations/:id', (req, res) => {
  try {
    run('DELETE FROM invitations WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 칩 프리셋 ────────────────────────────────────────────────────────────────

// GET /api/chip-presets
app.get('/api/chip-presets', (req, res) => {
  try {
    const chips = query('SELECT * FROM chip_presets ORDER BY usage_count DESC, id ASC');
    res.json(chips);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chip-presets
app.post('/api/chip-presets', (req, res) => {
  try {
    const { label, type, value, created_by } = req.body;
    if (!label?.trim() || !type) return res.status(400).json({ error: '필수 항목 누락' });
    const { lastInsertRowid } = run(
      'INSERT INTO chip_presets (label, type, value, created_by) VALUES (?, ?, ?, ?)',
      [label.trim(), type, value || null, created_by || null]
    );
    res.json(queryOne('SELECT * FROM chip_presets WHERE id = ?', [lastInsertRowid]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/chip-presets/:id/use — 사용 횟수 +1
app.put('/api/chip-presets/:id/use', (req, res) => {
  try {
    run('UPDATE chip_presets SET usage_count = usage_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/chip-presets/:id
app.delete('/api/chip-presets/:id', (req, res) => {
  try {
    run('DELETE FROM chip_presets WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Schedule Master server running at http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
