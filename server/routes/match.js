const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { runMatching, getUserMatch, getMatchReasons, exchangeContact } = require('../match-algo');
const db = require('../db');
const router = express.Router();

/**
 * GET /api/match/result
 * 获取当前用户的最新匹配结果（含匹配理由 + 联系信息显示权限）
 */
router.get('/result', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const match = await getUserMatch(userId);

    if (!match) {
      return res.json({
        hasMatch: false,
        message: '本周匹配尚未生成，请耐心等待下周一中午12点'
      });
    }

    // 读取最新一条记录，判断联系信息展示权限（双方点击"展示"则都看得到）
    db.get(
      `SELECT id, contact_exchanged_a, contact_exchanged_b, reasons
       FROM matches
       WHERE id = ?`,
      [match.matchId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        // 分辨当前用户是 A 还是 B
        const isA = match.isUserA;
        const canSeeContact = isA
          ? (row.contact_exchanged_a === 1 && row.contact_exchanged_b === 1)
          : (row.contact_exchanged_b === 1 && row.contact_exchanged_a === 1);

        // 单方"我想看"的状态：仅对方还未同意时，前端提示"已发送请求"
        const iRequested = isA ? (row.contact_exchanged_a === 1) : (row.contact_exchanged_b === 1);

        const partnerOut = {
          name: match.partner.name,
          gender: match.partner.gender,
          dimensionScores: match.partner.dimensionScores,
          // 双方均同意才展示联系方式
          wechat: canSeeContact ? match.partner.wechat : null,
          phone: canSeeContact ? match.partner.phone : null,
          contactVisible: canSeeContact,
          contactRequested: iRequested
        };

        let reasons = null;
        try {
          reasons = row.reasons ? JSON.parse(row.reasons) : null;
        } catch (_) { reasons = null; }

        res.json({
          hasMatch: true,
          match: {
            matchId: match.matchId,
            score: match.score,
            partner: partnerOut,
            reasons,
            createdAt: match.createdAt,
            roundId: match.roundId
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/match/:id/exchange-contact
 * 点击"我愿意展示我的联系方式" —— 双方都点击后，才互相可见
 */
router.post('/:id/exchange-contact', requireAuth, (req, res) => {
  const userId = req.userId;
  const matchId = req.params.id;

  db.get(
    `SELECT * FROM matches WHERE id = ?`,
    [matchId],
    (err, m) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!m) return res.status(404).json({ error: '匹配不存在' });
      if (m.user_a_id !== userId && m.user_b_id !== userId) {
        return res.status(403).json({ error: '无权操作' });
      }

      const isA = m.user_a_id === userId;
      const field = isA ? 'contact_exchanged_a' : 'contact_exchanged_b';
      // 如果对方也同意了 → 都可见
      const otherField = isA ? 'contact_exchanged_b' : 'contact_exchanged_a';
      const bothVisible = m[otherField] === 1;

      db.run(
        `UPDATE matches SET ${field} = 1 WHERE id = ?`,
        [matchId],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({
            success: true,
            contactVisible: bothVisible,  // true=现在双方都可见了
            partnerApproved: bothVisible
          });
        }
      );
    }
  );
});

/**
 * POST /api/match/run（管理员或定时任务用）
 * 手动触发匹配
 */
router.post('/run', requireAuth, async (req, res) => {
  try {
    // 可选：检查是否是管理员，不过这里允许已登录用户触发
    const result = await runMatching();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
