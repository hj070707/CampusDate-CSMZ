// ============================================================
//  统一数据库适配层
//  有 DATABASE_URL 环境变量 → 用 Postgres（Supabase / Railway / Render Postgres）
//  没有 → 用本地 SQLite 文件（本地开发零配置）
//
//  pg 适配器模拟 sqlite3 的 API（run/get/all/serialize/prepare），
//  路由代码几乎不用改，只需把 ? 占位符统一即可。
// ============================================================

const path = require('path');

const isPostgres = !!process.env.DATABASE_URL;

let db;
let dbReady;

if (isPostgres) {
  // ============ Postgres 适配器（模拟 sqlite3 API） ============
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase / Render Postgres 要求 SSL，但证书自签名需忽略验证
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  /**
   * 把 SQLite 风格 SQL 转成 Postgres 兼容
   * 1. ? 占位符 → $1, $2, $3...
   * 2. date('now') → CURRENT_DATE
   * 3. date(column) → column::date
   */
  function convertSql(sql) {
    let i = 0;
    let result = sql.replace(/\?/g, () => `$${++i}`);
    // date('now') → CURRENT_DATE
    result = result.replace(/date\(\s*['"]now['"]\s*\)/gi, 'CURRENT_DATE');
    // date(xxx) → (xxx)::date
    result = result.replace(/date\(([^)]+)\)/gi, '($1)::date');
    return result;
  }

  db = {
    _pool: pool,
    _isPostgres: true,

    /**
     * run(sql, params, cb) —— 模拟 sqlite3 的 db.run
     * 对 INSERT 自动追加 RETURNING id，把结果塞进 this.lastID
     */
    run(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      const converted = convertSql(sql);
      const isInsert = /^\s*INSERT\s+INTO\s/i.test(sql);
      const hasReturning = /\bRETURNING\b/i.test(sql);
      // INSERT 且没有 RETURNING → 自动追加（去掉末尾分号）
      const finalSql = isInsert && !hasReturning
        ? converted.replace(/;\s*$/, '') + ' RETURNING id'
        : converted;

      pool.query(finalSql, params || [], (err, res) => {
        if (err) return cb(err);
        // 模拟 sqlite3 callback 里的 this.lastID 和 this.changes
        const ctx = {
          lastID: res.rows && res.rows[0] ? res.rows[0].id : undefined,
          changes: res.rowCount || 0
        };
        cb.call(ctx, null);
      });
    },

    /**
     * get(sql, params, cb) —— 模拟 sqlite3 的 db.get（返回单行）
     */
    get(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      pool.query(convertSql(sql), params || [], (err, res) => {
        if (err) return cb(err);
        cb(null, res.rows[0]);
      });
    },

    /**
     * all(sql, params, cb) —— 模拟 sqlite3 的 db.all（返回多行）
     */
    all(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      pool.query(convertSql(sql), params || [], (err, res) => {
        if (err) return cb(err);
        cb(null, res.rows);
      });
    },

    /**
     * serialize(fn) —— pg 的连接池天然串行化，此处等价于直接执行
     */
    serialize(fn) {
      if (fn) fn();
    },

    /**
     * prepare(sql) —— 返回 stmt 对象，支持 run/finalize
     * pg 下收集所有 run 的 Promise，finalize 时 Promise.all 等待全部完成
     */
    prepare(sql) {
      const converted = convertSql(sql);
      const isInsert = /^\s*INSERT\s+INTO\s/i.test(sql);
      const hasReturning = /\bRETURNING\b/i.test(sql);
      const finalSql = isInsert && !hasReturning
        ? converted.replace(/;\s*$/, '') + ' RETURNING id'
        : converted;

      const pending = [];

      return {
        run(...args) {
          const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          const p = pool.query(finalSql, args);
          pending.push(p);
          if (cb) {
            p.then(res => {
              const ctx = {
                lastID: res.rows && res.rows[0] ? res.rows[0].id : undefined,
                changes: res.rowCount || 0
              };
              cb.call(ctx, null);
            }).catch(err => cb(err));
          }
        },
        async finalize(cb) {
          try {
            await Promise.all(pending);
            if (cb) cb(null);
          } catch (err) {
            if (cb) cb(err);
          }
        }
      };
    },

    close(cb) {
      pool.end().then(() => cb && cb()).catch(() => cb && cb());
    }
  };

  // ============ Postgres 建表（异步，导出 ready promise） ============
  dbReady = (async () => {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'schema-postgres.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('[db] schema-postgres.sql 不存在，跳过建表');
      return;
    }
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    // 按分号分割逐条执行（pg 的 query 不支持多条含分号的语句）
    const statements = schema.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('[db] Postgres schema 初始化完成');
  })();

} else {
  // ============ SQLite 模式（用 better-sqlite3，支持 Node 24 预编译） ============
  // better-sqlite3 是同步 API，这里包装成 sqlite3 的 callback 风格，路由代码不用改
  const BetterSqlite3 = require('better-sqlite3');
  const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
  const _bsq = new BetterSqlite3(DB_PATH);

  db = {
    _bsq,
    _isPostgres: false,

    /** run(sql, params, cb) — 模拟 sqlite3 的 db.run，同步执行后回调 */
    run(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      try {
        const stmt = _bsq.prepare(sql);
        const result = stmt.run(...(params || []));
        // 模拟 sqlite3 callback 里的 this.lastID 和 this.changes
        const ctx = {
          lastID: result.lastInsertRowid,
          changes: result.changes
        };
        if (cb) cb.call(ctx, null);
      } catch (err) {
        if (cb) cb(err);
      }
    },

    /** get(sql, params, cb) — 模拟 sqlite3 的 db.get（返回单行） */
    get(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      try {
        const row = _bsq.prepare(sql).get(...(params || []));
        if (cb) cb(null, row);
      } catch (err) {
        if (cb) cb(err);
      }
    },

    /** all(sql, params, cb) — 模拟 sqlite3 的 db.all（返回多行） */
    all(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      try {
        const rows = _bsq.prepare(sql).all(...(params || []));
        if (cb) cb(null, rows);
      } catch (err) {
        if (cb) cb(err);
      }
    },

    /** serialize(fn) — better-sqlite3 是同步的，直接执行 fn */
    serialize(fn) {
      if (fn) fn();
    },

    /** prepare(sql) — 返回 stmt 对象，支持 run/finalize */
    prepare(sql) {
      const stmt = _bsq.prepare(sql);
      return {
        run(...args) {
          const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          try {
            const result = stmt.run(...args);
            if (cb) {
              cb.call({
                lastID: result.lastInsertRowid,
                changes: result.changes
              }, null);
            }
          } catch (err) {
            if (cb) cb(err);
          }
        },
        // better-sqlite3 是同步的，finalize 立即回调
        finalize(cb) {
          if (cb) cb(null);
        }
      };
    },

    close(cb) {
      _bsq.close();
      if (cb) cb();
    }
  };

  dbReady = Promise.resolve();

  // ============ SQLite 建表 + 增量字段 ============
  function addColumn(sql) {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.warn('[db] addColumn warning:', err.message);
      }
    });
  }

  db.serialize(() => {
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
    addColumn('ALTER TABLE users ADD COLUMN school TEXT DEFAULT "长沙民政职业技术学院"');
    addColumn('ALTER TABLE users ADD COLUMN wechat TEXT');
    addColumn('ALTER TABLE users ADD COLUMN phone TEXT');
    addColumn('ALTER TABLE users ADD COLUMN join_next_round INTEGER DEFAULT 1');
    addColumn('ALTER TABLE users ADD COLUMN last_match_round INTEGER');
    addColumn('ALTER TABLE users ADD COLUMN deactivated_at DATETIME');

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
}

// 导出 db 对象 + ready promise（server.js 启动时 await dbReady 再 listen）
db.ready = dbReady;
db.isPostgres = isPostgres;

module.exports = db;
