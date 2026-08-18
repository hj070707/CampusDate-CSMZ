const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

/**
 * 安全地为表添加列（忽略列已存在错误）
 */
function addColumn(sql) {
  db.run(sql, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.warn('[db] addColumn warning:', err.message);
    }
  });
}

db.serialize(() => {
  // ========== 用户表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      gender TEXT,
      is_admin INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // 增量扩展字段（兼容旧库）
  addColumn('ALTER TABLE users ADD COLUMN school TEXT DEFAULT "长沙民政职业技术学院"');
  addColumn('ALTER TABLE users ADD COLUMN wechat TEXT');
  addColumn('ALTER TABLE users ADD COLUMN phone TEXT');
  addColumn('ALTER TABLE users ADD COLUMN join_next_round INTEGER DEFAULT 1');
  addColumn('ALTER TABLE users ADD COLUMN last_match_round INTEGER');
  addColumn('ALTER TABLE users ADD COLUMN deactivated_at DATETIME');

  // ========== 题目表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      options TEXT NOT NULL,
      type TEXT DEFAULT 'single',
      weight REAL DEFAULT 1.0,
      order_num INTEGER,
      is_active INTEGER DEFAULT 1
    )
  `);

  // ========== 答案表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer TEXT NOT NULL,
      dimension_scores TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // ========== 匹配结果表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_a_id INTEGER NOT NULL,
      user_b_id INTEGER NOT NULL,
      score REAL,
      round_id INTEGER,
      reasons TEXT,
      contact_exchanged_a INTEGER DEFAULT 0,
      contact_exchanged_b INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_a_id) REFERENCES users(id),
      FOREIGN KEY (user_b_id) REFERENCES users(id)
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id)');
});

module.exports = db;