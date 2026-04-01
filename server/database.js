const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'schedule_master.db');

let db = null;
let SQL = null;

// Persist DB to disk
function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Auto-save every 5 seconds if db exists
setInterval(() => { if (db) saveDb(); }, 5000);

// Graceful shutdown save
process.on('exit', () => { if (db) saveDb(); });
process.on('SIGINT', () => { if (db) saveDb(); process.exit(0); });
process.on('SIGTERM', () => { if (db) saveDb(); process.exit(0); });

async function initDb() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys (sql.js supports PRAGMA)
  db.run('PRAGMA foreign_keys = ON;');

  createSchema();
  migrateSchema();
  seedDataIfEmpty();
  saveDb(); // initial save

  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'member',
      pin TEXT,
      avatar_color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'member',
      created_by INTEGER REFERENCES users(id),
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      used_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chip_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT,
      usage_count INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      assignee_id INTEGER,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      task_date TEXT,
      task_time TEXT DEFAULT '09:00',
      duration INTEGER DEFAULT 60,
      category TEXT DEFAULT '업무',
      location TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_type TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      memo TEXT,
      color TEXT DEFAULT '#6366f1',
      created_by INTEGER,
      attendees TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Add new columns to existing DB (backward compatibility)
function migrateSchema() {
  // users 테이블 신규 컬럼
  const userCols = { role: "TEXT DEFAULT 'member'", pin: 'TEXT', avatar_color: 'TEXT' };
  let existingUserCols = [];
  try {
    const r = db.exec("PRAGMA table_info(users)");
    if (r && r[0]) existingUserCols = r[0].values.map(row => row[1]);
  } catch (e) { /* ignore */ }
  for (const [col, def] of Object.entries(userCols)) {
    if (!existingUserCols.includes(col)) {
      try { db.run(`ALTER TABLE users ADD COLUMN ${col} ${def}`); } catch (e) { /* ignore */ }
    }
  }

  // 첫 번째 사용자를 admin으로 설정 (아직 아무도 admin이 없을 때)
  try {
    const admins = db.exec("SELECT COUNT(*) FROM users WHERE role='admin'");
    if (admins[0]?.values[0][0] === 0) {
      db.run("UPDATE users SET role='admin' WHERE id=(SELECT MIN(id) FROM users)");
    }
  } catch (e) { /* ignore */ }

  // 기본 칩 프리셋 시드 (없을 때)
  try {
    const chipCount = db.exec("SELECT COUNT(*) FROM chip_presets");
    if (chipCount[0]?.values[0][0] === 0) {
      const systemChips = [
        ['클라이언트 미팅', 'title', null], ['팀 회의', 'title', null],
        ['디자인 검토', 'title', null], ['견적 제출', 'title', null],
        ['현장 방문', 'title', null], ['팀 스탠드업', 'title', null],
      ];
      for (const [label, type, value] of systemChips) {
        db.run("INSERT INTO chip_presets (label, type, value, is_system) VALUES (?,?,?,1)", [label, type, value]);
      }
    }
  } catch (e) { /* ignore */ }

  const columns = ['task_date', 'task_time', 'duration', 'category', 'location', 'is_recurring', 'recurring_type'];
  const defaults = {
    task_date: null,
    task_time: "'09:00'",
    duration: 60,
    category: "'업무'",
    location: null,
    is_recurring: 0,
    recurring_type: null,
  };
  const types = {
    task_date: 'TEXT',
    task_time: 'TEXT',
    duration: 'INTEGER',
    category: 'TEXT',
    location: 'TEXT',
    is_recurring: 'INTEGER',
    recurring_type: 'TEXT',
  };

  let existingCols = [];
  try {
    const result = db.exec("PRAGMA table_info(tasks)");
    if (result && result[0]) {
      existingCols = result[0].values.map(row => row[1]);
    }
  } catch (e) { /* ignore */ }

  for (const col of columns) {
    if (!existingCols.includes(col)) {
      try {
        const def = defaults[col] !== null ? ` DEFAULT ${defaults[col]}` : '';
        db.run(`ALTER TABLE tasks ADD COLUMN ${col} ${types[col]}${def}`);
      } catch (e) { /* column may already exist */ }
    }
  }
}

function seedDataIfEmpty() {
  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const count = result[0]?.values[0][0] ?? 0;
  if (count > 0) {
    // users already exist: seed appointments if table is empty
    const apptResult = db.exec('SELECT COUNT(*) as count FROM appointments');
    const apptCount = apptResult[0]?.values[0][0] ?? 0;
    if (apptCount === 0) {
      const today = new Date();
      const fmt = (d) => d.toISOString().split('T')[0];
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      let u1 = null, u2 = null;
      try {
        const u1r = db.exec("SELECT id FROM users ORDER BY id ASC LIMIT 1");
        u1 = u1r[0]?.values[0][0] ?? null;
        const u2r = db.exec("SELECT id FROM users ORDER BY id ASC LIMIT 1 OFFSET 1");
        u2 = u2r[0]?.values[0][0] ?? u1;
      } catch(e) { /* ignore */ }
      if (u1) {
        db.run("INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          ['클라이언트 미팅', fmt(today), '13:00', '14:00', '회의실 A', '신규 프로젝트 요구사항 논의', '#6366f1', u1]);
        db.run("INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by, attendees) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          ['팀 스탠드업', fmt(today), '09:00', '09:15', '', '주간 진행상황 공유', '#10b981', u2, '김민준,이서연']);
        db.run("INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          ['디자인 리뷰', fmt(tomorrow), '15:00', '16:00', '온라인', 'Figma 리뷰', '#f97316', u1]);
        saveDb();
      }
    }
    return;
  }

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  const nextMonth = new Date(today); nextMonth.setDate(today.getDate() + 30);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const in3days = new Date(today); in3days.setDate(today.getDate() + 3);
  const in5days = new Date(today); in5days.setDate(today.getDate() + 5);

  db.run("INSERT INTO users (name) VALUES ('김민준')");
  db.run("INSERT INTO users (name) VALUES ('이서연')");

  const u1 = db.exec('SELECT id FROM users WHERE name = ?', ['김민준'])[0].values[0][0];
  const u2 = db.exec('SELECT id FROM users WHERE name = ?', ['이서연'])[0].values[0][0];

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['UI 디자인 시스템 구축', '공통 컴포넌트 라이브러리 및 색상 팔레트, 타이포그래피 가이드를 작성합니다. Figma 파일 포함.', 'todo', 'high', fmt(nextWeek), u1, u1, fmt(nextWeek), '10:00', 120, '업무']
  );
  const t1 = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['API 엔드포인트 개발', 'REST API 설계 및 구현. 인증, 사용자 관리, 작업 CRUD 기능 포함.', 'in_progress', 'high', fmt(today), u2, u1, fmt(today), '14:00', 90, '업무']
  );
  const t2 = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['데이터베이스 스키마 설계', 'SQLite 스키마 정의 및 마이그레이션 스크립트 작성 완료.', 'done', 'medium', fmt(yesterday), u1, u2, fmt(yesterday), '09:00', 60, '업무']
  );
  const t3 = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['사용자 테스트 진행', '베타 사용자 5명을 대상으로 UX 테스트를 진행하고 피드백을 수집합니다.', 'todo', 'low', fmt(nextMonth), u2, u2, fmt(nextMonth), '15:00', 60, '개인']
  );

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['클라이언트 미팅', '신규 프로젝트 요구사항 논의 및 일정 협의.', 'todo', 'high', fmt(tomorrow), u1, u1, fmt(tomorrow), '13:00', 60, '미팅']
  );

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['팀 회의', '주간 스프린트 계획 및 진행상황 공유.', 'in_progress', 'medium', fmt(in3days), u2, u1, fmt(in3days), '10:00', 30, '미팅']
  );

  db.run(
    "INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, task_date, task_time, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['견적 제출', '클라이언트에게 프로젝트 견적서 제출.', 'todo', 'medium', fmt(in5days), u1, u2, fmt(in5days), '17:00', 30, '업무']
  );

  db.run("INSERT INTO comments (task_id, user_id, user_name, content) VALUES (?, ?, ?, ?)", [t2, u1, '김민준', '인증 부분은 JWT를 사용하는 게 좋을 것 같아요!']);
  db.run("INSERT INTO comments (task_id, user_id, user_name, content) VALUES (?, ?, ?, ?)", [t2, u2, '이서연', '네, 동의합니다. Refresh token도 구현할게요.']);
  db.run("INSERT INTO comments (task_id, user_id, user_name, content) VALUES (?, ?, ?, ?)", [t3, u2, '이서연', '스키마 리뷰 부탁드립니다.']);
  db.run("INSERT INTO comments (task_id, user_id, user_name, content) VALUES (?, ?, ?, ?)", [t3, u1, '김민준', '확인했습니다. 좋아 보여요!']);

  // Sample appointments
  db.run("INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ['클라이언트 미팅', fmt(today), '13:00', '14:00', '회의실 A', '신규 프로젝트 요구사항 논의', '#6366f1', u1]);
  db.run("INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by, attendees) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['팀 스탠드업', fmt(today), '09:00', '09:15', '', '주간 진행상황 공유', '#10b981', u2, '김민준,이서연']);
  db.run("INSERT INTO appointments (title, date, start_time, end_time, location, memo, color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ['디자인 리뷰', fmt(tomorrow), '15:00', '16:00', '온라인', 'Figma 리뷰', '#f97316', u1]);
}

// Helper: run a SELECT query and return rows as objects
function query(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// Helper: run a SELECT and return the first row as an object (or null)
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run an INSERT/UPDATE/DELETE and return { lastInsertRowid, changes }
function run(sql, params = []) {
  db.run(sql, params);
  const meta = db.exec('SELECT last_insert_rowid() as id, changes() as changes');
  const row = meta[0]?.values[0];
  saveDb();
  return { lastInsertRowid: row?.[0] ?? null, changes: row?.[1] ?? 0 };
}

module.exports = { initDb, query, queryOne, run };
