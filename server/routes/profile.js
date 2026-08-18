const express = require('express');
const bcrypt = require('bcryptjs');
const requireAuth = require('../middleware/requireAuth');
const db = require('../db');
const router = express.Router();

const BCRYPT_ROUNDS = 10;

/**
 * GET /api/profile
 * 获取当前用户完整资料（不含 password_hash）
 */
router.get('/', requireAuth, (req, res) => {
  db.get(
    `SELECT id, email, name, gender, school, wechat, phone,
            join_next_round, is_admin, created_at
     FROM users WHERE id = ?`,
    [req.userId],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: '用户不存在' });
      res.json({
        ...user,
        joinNextRound: !!user.join_next_round,
        isAdmin: !!user.is_admin
      });
    }
  );
});

/**
 * PUT /api/profile
 * 更新用户可编辑字段：name / gender / wechat / phone / join_next_round
 */
router.put('/', requireAuth, (req, res) => {
  const allowFields = ['name', 'gender', 'wechat', 'phone', 'join_next_round'];
  const sets = [];
  const params = [];
  for (const f of allowFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) {
      const v = f === 'join_next_round'
        ? (req.body[f] || req.body['joinNextRound'] ? 1 : 0)
        : (req.body[f] === '' ? null : req.body[f]);
      sets.push(`${f} = ?`);
      params.push(v);
    }
  }
  if (sets.length === 0) {
    return res.status(400).json({ error: '没有需要更新的字段' });
  }
  params.push(req.userId);
  db.run(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

/**
 * POST /api/profile/join-next-round
 * 快捷切换"是否参与下周匹配"
 * body: { join: true/false }
 */
router.post('/join-next-round', requireAuth, (req, res) => {
  const join = req.body.join === true ? 1 : 0;
  db.run(
    'UPDATE users SET join_next_round = ? WHERE id = ?',
    [join, req.userId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        joinNextRound: join === 1,
        message: join ? '已确认参与下周匹配，期待你的好消息～' : '已设置本周不参与匹配，祝你考试顺利 💪'
      });
    }
  );
});

/**
 * POST /api/profile/change-password
 * 修改当前用户密码
 * body: { currentPassword, newPassword }
 *
 * 安全规则：
 *   1. 必须提供"旧密码"并通过 bcrypt.verify（防止账号被盗后直接改密）
 *   2. 新密码 >= 6 位（对齐注册校验）
 *   3. 新密码 ≠ 旧密码（校验明文即可，和注册保持一致）
 *   4. 成功后返回 200，前端可提示"下次登录请使用新密码"
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '请填写旧密码和新密码' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少需要 6 位' });
  }
  if (String(currentPassword) === String(newPassword)) {
    return res.status(400).json({ error: '新密码不能和旧密码相同' });
  }

  // 1. 查出用户 hash
  const user = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id, password_hash FROM users WHERE id = ?`,
      [req.userId],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.password_hash === 'ANON') {
    return res.status(400).json({ error: '账号已注销，无法修改密码' });
  }

  // 2. 校验旧密码
  const ok = await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!ok) return res.status(401).json({ error: '旧密码不正确，请再试一次' });

  // 3. 生成新 hash 并 UPDATE
  const newHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newHash, req.userId],
      function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });

  res.json({ success: true, message: '✅ 密码修改成功！下次登录请使用新密码～' });
});

/**
 * DELETE /api/profile
 * 注销账号（匿名化存储，保留匹配历史用于算法改进）
 *
 * 流程（对齐隐私协议 §5）：
 *   1. 邮箱置为随机匿名串、昵称/微信/手机清空
 *   2. is_active = 0, deactivated_at = now
 *   3. 匹配记录保留（不包含任何 PII）
 *   4. 销毁 session
 */
router.delete('/', requireAuth, (req, res) => {
  const userId = req.userId;
  const randomTag = 'deactivated_' + Math.random().toString(36).slice(2, 10);
  const anonEmail = `${randomTag}@local.invalid`;

  db.serialize(() => {
    // 匿名化个人信息
    db.run(
      `UPDATE users
       SET email = ?,
           password_hash = 'ANON',
           name = '匿名用户',
           wechat = NULL,
           phone = NULL,
           gender = NULL,
           join_next_round = 0,
           is_active = 0,
           deactivated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [anonEmail, userId],
      (err) => {
        if (err) return res.status(500).json({ error: '注销失败：' + err.message });
      }
    );
    // 答案表保持，但把 user_id 映射到匿名后的用户（其实 id 没变，已经足够"不可追溯"）
    // 我们再额外把答案中的 dimension_scores 留着（匿名统计），不做更细处理
  });

  // 销毁登录态
  req.session.destroy(() => {
    res.json({
      success: true,
      message: '账号已注销，所有个人信息已匿名化处理。感谢你的参与～'
    });
  });
});

/**
 * GET /api/profile/match-history
 * 返回当前用户所有历史匹配记录（时间倒序，最多 20 轮）
 */
router.get('/match-history', requireAuth, (req, res) => {
  const userId = req.userId;
  db.all(
    `SELECT m.id AS match_id, m.score, m.round_id, m.reasons, m.created_at,
            CASE WHEN m.user_a_id = ? THEN m.contact_exchanged_a ELSE m.contact_exchanged_b END AS self_exchanged,
            CASE WHEN m.user_a_id = ? THEN m.contact_exchanged_b ELSE m.contact_exchanged_a END AS partner_exchanged,
            pu.id   AS partner_id,
            pu.name AS partner_name,
            pu.gender AS partner_gender
     FROM matches m
     JOIN users pu
       ON (m.user_a_id = ? AND m.user_b_id = pu.id)
       OR (m.user_b_id = ? AND m.user_a_id = pu.id)
     WHERE m.user_a_id = ? OR m.user_b_id = ?
     ORDER BY m.created_at DESC
     LIMIT 20`,
    [userId, userId, userId, userId, userId, userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const list = rows.map(r => {
        let reasons = null;
        try { reasons = r.reasons ? JSON.parse(r.reasons) : null; } catch (_) {}
        const selfExchanged = r.self_exchanged === 1;
        const partnerExchanged = r.partner_exchanged === 1;
        return {
          matchId: r.match_id,
          roundId: r.round_id,
          score: r.score,
          createdAt: r.created_at,
          headline: reasons?.headline || '',
          partner: {
            id: r.partner_id,
            name: r.partner_name || '神秘的TA',
            gender: r.partner_gender
          },
          contactStatus: {
            selfRequested: selfExchanged,
            partnerApproved: partnerExchanged,
            bothApproved: selfExchanged && partnerExchanged
          }
        };
      });
      res.json({ total: list.length, items: list });
    }
  );
});

module.exports = router;
