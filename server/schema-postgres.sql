-- ============================================================
--  Postgres 建表脚本（Supabase / Railway / Render Postgres 通用）
--  由 db.js 在模块加载时自动执行（按分号逐条）
--  注意：SQLite 的 AUTOINCREMENT → Postgres 的 SERIAL
--        DATETIME DEFAULT CURRENT_TIMESTAMP → TIMESTAMP DEFAULT NOW()
-- ============================================================

-- ========== 用户表 ==========
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  gender TEXT,
  is_admin INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  school TEXT DEFAULT '长沙民政职业技术学院',
  wechat TEXT,
  phone TEXT,
  join_next_round INTEGER DEFAULT 1,
  last_match_round INTEGER,
  deactivated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== 题目表 ==========
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  options TEXT NOT NULL,
  type TEXT DEFAULT 'single',
  weight REAL DEFAULT 1.0,
  order_num INTEGER,
  is_active INTEGER DEFAULT 1
);

-- ========== 答案表 ==========
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  dimension_scores TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- ========== 匹配结果表 ==========
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  user_a_id INTEGER NOT NULL,
  user_b_id INTEGER NOT NULL,
  score REAL,
  round_id INTEGER,
  reasons TEXT,
  contact_exchanged_a INTEGER DEFAULT 0,
  contact_exchanged_b INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_a_id) REFERENCES users(id),
  FOREIGN KEY (user_b_id) REFERENCES users(id)
);

-- ========== 索引 ==========
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);
