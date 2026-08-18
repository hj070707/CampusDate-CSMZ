const db = require('./db');

const DIMENSIONS = ['values', 'personality', 'lifestyle', 'communication', 'future'];

// 维度权重：价值观 > 情感沟通 > 未来规划 > 性格 > 生活方式
const DIMENSION_WEIGHTS = {
  values: 1.5,
  communication: 1.4,
  future: 1.2,
  personality: 1.0,
  lifestyle: 0.9
};

// 互补维度：这些维度差异适中（1-2分）时反而加分，而非纯看相似
const COMPLEMENT_DIMENSIONS = new Set(['personality', 'lifestyle']);

const DIMENSION_LABELS = {
  values: '价值观',
  personality: '性格特质',
  lifestyle: '生活方式',
  communication: '情感沟通',
  future: '未来规划'
};

/**
 * 计算两用户的综合匹配度
 * 
 * 算法：加权欧几里得距离变体 + 互补维度加成
 * 
 * 1. 对每个维度计算差异 diff = |scoreA - scoreB|（0-4）
 * 2. 相似维度：similarity = (4 - diff) / 4  → 差异越小越好
 * 3. 互补维度：diff 在 1-2 时为"甜区"，给满分；diff=0 或 diff>2 递减
 * 4. 加权求和 → 归一化到 0-100
 */
function calculateSimilarity(scoresA, scoresB) {
  let totalScore = 0;
  let totalWeight = 0;

  for (const dim of DIMENSIONS) {
    const a = Number(scoresA?.[dim] || 0);
    const b = Number(scoresB?.[dim] || 0);
    const diff = Math.abs(a - b);
    const w = DIMENSION_WEIGHTS[dim];

    let dimScore;
    if (COMPLEMENT_DIMENSIONS.has(dim)) {
      // 互补维度：差异 1-2 是甜区
      if (diff <= 2 && diff >= 1) {
        dimScore = 1.0; // 完美互补
      } else if (diff === 0) {
        dimScore = 0.85; // 太像了，略减
      } else {
        dimScore = Math.max(0, (4 - diff) / 4); // 差异太大，递减
      }
    } else {
      // 相似维度：差异越小越好
      dimScore = (4 - diff) / 4;
    }

    totalScore += dimScore * w;
    totalWeight += w;
  }

  return parseFloat(((totalScore / totalWeight) * 100).toFixed(1));
}

/**
 * 生成结构化匹配理由
 * 返回：
 * {
 *   headline: '你们是高度契合的灵魂伴侣 💖',
 *   matches: [{dimension, label, aScore, bScore, reason}],     // 相似点
 *   complements: [{dimension, label, aScore, bScore, reason}]  // 互补点
 * }
 */
function buildReasons(scoresA, scoresB, score) {
  const dims = [];
  for (const dim of DIMENSIONS) {
    const a = Number(scoresA?.[dim] || 0);
    const b = Number(scoresB?.[dim] || 0);
    const diff = Math.abs(a - b);
    dims.push({ dim, a, b, diff, isComplement: COMPLEMENT_DIMENSIONS.has(dim) });
  }

  // 相似维度：差异最小的前 2 个 → 共同点
  const simDims = dims.filter(d => !d.isComplement).sort((x, y) => x.diff - y.diff);
  const matches = simDims.slice(0, 2).map(d => ({
    dimension: d.dim,
    label: DIMENSION_LABELS[d.dim],
    aScore: d.a,
    bScore: d.b,
    reason: d.diff === 0
      ? `你们在「${DIMENSION_LABELS[d.dim]}」上几乎完全一致（你 ${d.a.toFixed(1)} / TA ${d.b.toFixed(1)}），天生同频。`
      : `你们在「${DIMENSION_LABELS[d.dim]}」上非常接近（你 ${d.a.toFixed(1)} / TA ${d.b.toFixed(1)}），相处会有很多共鸣。`
  }));

  // 互补维度：差异在甜区(1-2)的 → 互补亮点
  const compDims = dims.filter(d => d.isComplement && d.diff >= 1 && d.diff <= 2)
    .sort((x, y) => y.diff - x.diff);
  const complements = compDims.slice(0, 1).map(d => ({
    dimension: d.dim,
    label: DIMENSION_LABELS[d.dim],
    aScore: d.a,
    bScore: d.b,
    reason: `在「${DIMENSION_LABELS[d.dim]}」上你们各有风格（你 ${d.a.toFixed(1)} / TA ${d.b.toFixed(1)}），这种差异恰好能互相补充，让关系更有趣。`
  }));

  // 如果没有甜区互补，取相似维度的第 3 个作为额外共同点
  if (complements.length === 0 && simDims.length > 2) {
    const d = simDims[2];
    matches.push({
      dimension: d.dim,
      label: DIMENSION_LABELS[d.dim],
      aScore: d.a,
      bScore: d.b,
      reason: `你们在「${DIMENSION_LABELS[d.dim]}」上也比较接近（你 ${d.a.toFixed(1)} / TA ${d.b.toFixed(1)}）。`
    });
  }

  let headline;
  if (score >= 90) headline = '你们是高度契合的灵魂伴侣 💖';
  else if (score >= 80) headline = '你们是非常难得的同频之人 ✨';
  else if (score >= 70) headline = '你们很可能是彼此值得尝试的那个 TA 🌹';
  else if (score >= 60) headline = '匹配度不错，勇敢迈出第一步吧 🌱';
  else headline = '差异中藏着吸引力，不妨给彼此一个机会 🍀';

  return { headline, matches, complements };
}

/**
 * 查询"用户近3轮匹配过的对象集合"，用于防重复
 */
function getRecentMatchedSet(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT
         CASE WHEN user_a_id = ? THEN user_b_id ELSE user_a_id END AS partner_id
       FROM matches
       WHERE (user_a_id = ? OR user_b_id = ?)
       ORDER BY id DESC
       LIMIT 6`,
      [userId, userId, userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(new Set(rows.map(r => r.partner_id)));
      }
    );
  });
}

/**
 * 全局匹配入口
 * - 仅匹配：完成问卷 + is_active=1 + join_next_round=1 + 未注销(deactivated_at IS NULL)
 * - 防重复：近 3 轮已配对的组合不再匹配
 * - 仅异性
 * - 贪心算法 + 保存匹配理由 reasons JSON
 */
async function runMatching() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT u.id, u.name, u.gender, u.email, u.wechat, u.phone,
              a.dimension_scores
       FROM users u
       JOIN answers a ON u.id = a.user_id
       WHERE (u.is_active = 1 OR u.is_active IS NULL)
         AND u.deactivated_at IS NULL
         AND (u.join_next_round = 1 OR u.join_next_round IS NULL)
       GROUP BY u.id`,
      [],
      async (err, users) => {
        if (err) return reject(err);
        if (users.length < 2) {
          return resolve({ message: '完成问卷且愿意参与本轮匹配的用户不足 2 人', matched: 0 });
        }

        // 解析维度得分
        const userScores = users
          .map(u => {
            try {
              return { ...u, scores: JSON.parse(u.dimension_scores) };
            } catch (_) { return null; }
          })
          .filter(Boolean);

        // 为每个用户预取近3轮匹配对象
        const recentMap = new Map();
        await Promise.all(
          userScores.map(async u => {
            recentMap.set(u.id, await getRecentMatchedSet(u.id));
          })
        );

        // 构建所有候选配对
        const pairs = [];
        for (let i = 0; i < userScores.length; i++) {
          for (let j = i + 1; j < userScores.length; j++) {
            const u1 = userScores[i];
            const u2 = userScores[j];
            if (!u1.gender || !u2.gender || u1.gender === u2.gender) continue;
            // 防重复匹配
            if ((recentMap.get(u1.id) || new Set()).has(u2.id)) continue;
            if ((recentMap.get(u2.id) || new Set()).has(u1.id)) continue;

            const score = calculateSimilarity(u1.scores, u2.scores);
            pairs.push({
              userA: u1,
              userB: u2,
              similarity: score,
              reasons: buildReasons(u1.scores, u2.scores, score)
            });
          }
        }

        pairs.sort((a, b) => b.similarity - a.similarity);

        const matched = new Set();
        const results = [];
        const roundId = Date.now();

        for (const pair of pairs) {
          if (matched.has(pair.userA.id) || matched.has(pair.userB.id)) continue;
          matched.add(pair.userA.id);
          matched.add(pair.userB.id);
          results.push({
            userA_id: pair.userA.id,
            userB_id: pair.userB.id,
            score: pair.similarity,
            reasons: pair.reasons,
            round_id: roundId
          });
        }

        if (results.length === 0) {
          return resolve({ message: '没有合适的匹配对（可能是都被近3轮匹配过滤了，下周再来吧）', matched: 0, roundId });
        }

        db.run('DELETE FROM matches WHERE round_id = ?', [roundId], function (_err) {
          const stmt = db.prepare(
            `INSERT INTO matches (user_a_id, user_b_id, score, round_id, reasons)
             VALUES (?, ?, ?, ?, ?)`
          );

          for (const r of results) {
            stmt.run(r.userA_id, r.userB_id, r.score, r.round_id, JSON.stringify(r.reasons));
          }
          stmt.finalize();

          // 更新用户 last_match_round，并把 join_next_round 重置为 1（下周默认继续参与，可手动关闭）
          const updStmt = db.prepare(
            `UPDATE users SET last_match_round = ?, join_next_round = 1 WHERE id = ?`
          );
          const touchedUserIds = new Set();
          for (const r of results) {
            if (!touchedUserIds.has(r.userA_id)) { updStmt.run(roundId, r.userA_id); touchedUserIds.add(r.userA_id); }
            if (!touchedUserIds.has(r.userB_id)) { updStmt.run(roundId, r.userB_id); touchedUserIds.add(r.userB_id); }
          }
          updStmt.finalize();

          resolve({
            message: `[CSMZ 民政学院匹配] 本轮完成！共匹配 ${results.length} 对，匹配轮次 #${roundId}`,
            matched: results.length,
            roundId,
            pairs: results.map(r => ({
              userA: userScores.find(u => u.id === r.userA_id)?.name,
              userB: userScores.find(u => u.id === r.userB_id)?.name,
              score: r.score
            }))
          });
        });
      }
    );
  });
}

/**
 * 获取用户最新匹配结果
 * 返回结构扩充：matchId / roundId / isUserA / partner.{wechat,phone} / myScores
 */
function getUserMatch(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT m.id as match_id, m.score, m.round_id, m.reasons, m.created_at,
              CASE WHEN m.user_a_id = ? THEN 1 ELSE 0 END as is_user_a,
              -- 对方信息
              pu.id as partner_id,
              pu.name as partner_name,
              pu.gender as partner_gender,
              pu.wechat as partner_wechat,
              pu.phone  as partner_phone,
              pa.dimension_scores as partner_scores,
              -- 我的维度得分
              ma.dimension_scores as my_scores,
              -- 联系方式交换状态
              CASE WHEN m.user_a_id = ? THEN m.contact_exchanged_a ELSE m.contact_exchanged_b END as self_exchanged,
              CASE WHEN m.user_a_id = ? THEN m.contact_exchanged_b ELSE m.contact_exchanged_a END as partner_exchanged
       FROM matches m
       -- 关联对方用户
       JOIN users pu
         ON (m.user_a_id = ? AND m.user_b_id = pu.id)
         OR (m.user_b_id = ? AND m.user_a_id = pu.id)
       -- 关联对方维度得分
       LEFT JOIN answers pa ON pu.id = pa.user_id
       -- 关联我的维度得分
       LEFT JOIN answers ma ON ma.user_id = ?
       WHERE m.user_a_id = ? OR m.user_b_id = ?
       GROUP BY m.id
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [userId, userId, userId, userId, userId, userId, userId, userId],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        let partnerScores = null;
        let myScores = null;
        try { partnerScores = row.partner_scores ? JSON.parse(row.partner_scores) : null; } catch (_) {}
        try { myScores = row.my_scores ? JSON.parse(row.my_scores) : null; } catch (_) {}
        let reasons = null;
        try { reasons = row.reasons ? JSON.parse(row.reasons) : null; } catch (_) {}

        const contactRequested = row.self_exchanged === 1;
        const contactVisible = (row.self_exchanged === 1) && (row.partner_exchanged === 1);

        resolve({
          matchId: row.match_id,
          roundId: row.round_id,
          score: row.score,
          reasons,
          isUserA: row.is_user_a === 1,
          myScores,
          partner: {
            id: row.partner_id,
            name: row.partner_name || '神秘的TA',
            gender: row.partner_gender,
            wechat: contactVisible ? (row.partner_wechat || '') : '',
            phone: contactVisible ? (row.partner_phone || '') : '',
            contactRequested,
            contactVisible,
            dimensionScores: partnerScores
          },
          createdAt: row.created_at
        });
      }
    );
  });
}

module.exports = {
  runMatching,
  getUserMatch,
  calculateSimilarity,
  buildReasons
};
