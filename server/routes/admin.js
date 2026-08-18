const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const db = require('../db');
const router = express.Router();

// 管理员权限校验
const requireAdmin = (req, res, next) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, row) => {
    if (err || !row || !row.is_admin) {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  });
};

// 仪表盘统计
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  db.get('SELECT COUNT(*) as total FROM users', [], (err, totalRow) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get(`SELECT COUNT(*) as today FROM users WHERE date(created_at) = date('now')`, [], (err, todayRow) => {
      db.get('SELECT COUNT(DISTINCT user_id) as completed FROM answers', [], (err, ansRow) => {
        const completed = ansRow ? ansRow.completed : 0;
        // 总匹配轮次
        db.get('SELECT COUNT(DISTINCT round_id) as rounds FROM matches', [], (err, roundRow) => {
          const totalRounds = roundRow ? (roundRow.rounds || 0) : 0;
          // 累计成功配对数（matches 行数 = 配对数 × 1，一对一行）
          db.get('SELECT COUNT(*) as pairs FROM matches', [], (err, pairRow) => {
            const totalMatchedPairs = pairRow ? (pairRow.pairs || 0) : 0;
            // 累计匹配过的独立用户数（user_a_id ∪ user_b_id）
            db.get(`
              SELECT COUNT(*) as users FROM (
                SELECT user_a_id AS uid FROM matches
                UNION
                SELECT user_b_id AS uid FROM matches
              )
            `, [], (err, uRow) => {
              const totalMatchedUsers = uRow ? (uRow.users || 0) : 0;
              db.get('SELECT COUNT(*) as joiner FROM users WHERE join_next_round = 1 OR join_next_round IS NULL', [], (err, joinRow) => {
                const totalUsers = totalRow.total || 0;
                const joiners = joinRow ? joinRow.joiner : 0;
                res.json({
                  totalUsers,
                  todayUsers: todayRow ? todayRow.today : 0,
                  surveyCompleted: completed,
                  surveyRate: totalUsers > 0 ? Math.round((completed / totalUsers) * 100) : 0,
                  joinNextRoundCount: joiners,
                  joinRate: totalUsers > 0 ? Math.round((joiners / totalUsers) * 100) : 0,
                  totalRounds,
                  totalMatchedPairs,
                  totalMatchedUsers
                });
              });
            });
          });
        });
      });
    });
  });
});

// 用户列表
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT u.id, u.email, u.name, u.gender, u.is_admin, u.created_at,
            u.join_next_round, u.last_match_round, u.deactivated_at,
            CASE WHEN a.user_id IS NOT NULL THEN 1 ELSE 0 END AS survey_done
     FROM users u
     LEFT JOIN (SELECT DISTINCT user_id FROM answers) a ON a.user_id = u.id
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT COUNT(*) as count FROM users', [], (err, countRow) => {
        res.json({
          users: rows,
          total: countRow.count,
          page,
          totalPages: Math.ceil(countRow.count / limit)
        });
      });
    }
  );
});

const { runMatching } = require('../match-algo');

/**
 * POST /api/admin/trigger-match
 * 手动触发匹配。返回结构扩展：
 * { matched, message, roundId, pairs:[{userA, userB, score}] }
 */
router.post('/trigger-match', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log(`[Admin] 手动触发匹配，操作人: ${req.userId}`);
    const result = await runMatching();
    res.json({ 
      message: result.message,
      matched: result.matched,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个用户详情
router.get('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const userId = req.params.id;

  db.get(
    'SELECT id, email, name, gender, is_admin, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: '用户不存在' });

      // 获取问卷维度得分
      db.get(
        'SELECT dimension_scores, created_at as survey_time FROM answers WHERE user_id = ? LIMIT 1',
        [userId],
        (err, answerRow) => {
          let dimensionScores = null;
          let surveyTime = null;

          if (answerRow && answerRow.dimension_scores) {
            try {
              dimensionScores = JSON.parse(answerRow.dimension_scores);
              surveyTime = answerRow.survey_time;
            } catch { }
          }

          // 获取匹配历史
          db.all(
            `SELECT m.id, m.score, m.created_at,
              u.name as partner_name, u.gender as partner_gender
             FROM matches m
             LEFT JOIN users u ON (m.user_a_id = ? AND m.user_b_id = u.id) OR (m.user_b_id = ? AND m.user_a_id = u.id)
             WHERE m.user_a_id = ? OR m.user_b_id = ?
             ORDER BY m.created_at DESC`,
            [userId, userId, userId, userId],
            (err, matches) => {
              res.json({
                user,
                survey: {
                  completed: !!dimensionScores,
                  dimensionScores,
                  surveyTime
                },
                matches: matches || []
              });
            }
          );
        }
      );
    }
  );
});

// 设置/取消管理员
router.post('/users/:id/set-admin', requireAuth, requireAdmin, (req, res) => {
  const { isAdmin } = req.body;
  db.run(
    'UPDATE users SET is_admin = ? WHERE id = ?',
    [isAdmin ? 1 : 0, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: isAdmin ? '已设为管理员' : '已取消管理员' });
    }
  );
});

// 禁用/启用用户
router.post('/users/:id/toggle-status', requireAuth, requireAdmin, (req, res) => {
  // 需要先在 users 表加 is_active 字段
  db.run(
    'UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
// 获取所有题目
router.get('/questions', requireAuth, requireAdmin, (req, res) => {
  db.all(
    'SELECT id, category, content, options, type, weight, order_num, is_active FROM questions ORDER BY order_num',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const questions = rows.map(r => ({
        ...r,
        options: JSON.parse(r.options)
      }));
      res.json({ questions });
    }
  );
});

// 添加新题目
router.post('/questions', requireAuth, requireAdmin, (req, res) => {
  const { category, content, options, type, weight, order_num } = req.body;
  db.run(
    'INSERT INTO questions (category, content, options, type, weight, order_num) VALUES (?, ?, ?, ?, ?, ?)',
    [category, content, JSON.stringify(options), type || 'single', weight || 1.0, order_num],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// 更新题目
router.put('/questions/:id', requireAuth, requireAdmin, (req, res) => {
  const { category, content, options, type, weight, order_num, is_active } = req.body;
  db.run(
    'UPDATE questions SET category=?, content=?, options=?, type=?, weight=?, order_num=?, is_active=? WHERE id=?',
    [category, content, JSON.stringify(options), type, weight, order_num, is_active, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

// 删除题目
router.delete('/questions/:id', requireAuth, requireAdmin, (req, res) => {
  db.run('DELETE FROM questions WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});


module.exports = router;