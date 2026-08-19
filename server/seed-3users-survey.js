// 复用统一数据库适配层（SQLite 或 Postgres 自动切换）
const db = require('./db');

const PATTERNS = {
  // id=1 管理员 (稳重男 1111@qq.com)
  1: [0,1,2,3,0, 1,0,2,1,3, 2,1,0,2,1, 0,2,3,1,0, 1,0,2,1,3],
  // id=2 女用户 (1112@qq.com)：价值观/未来与 id=1 相似，性格与生活方式互补甜区 → 高匹配
  2: [0,1,2,1,0, 0,1,1,2,0, 1,2,1,0,1, 0,1,2,0,0, 0,1,1,1,2],
  // id=3 男用户 (1113@qq.com)：完全相反 → 不参与 id=1-2 的配对
  3: [3,2,1,0,3, 3,2,3,0,1, 0,3,2,3,2, 3,0,1,2,3, 3,2,3,0,1]
};

const DIMENSIONS = ['values', 'personality', 'lifestyle', 'communication', 'future'];

const all = (sql, params = []) => new Promise((r, j) =>
  db.all(sql, params, (e, rows) => e ? j(e) : r(rows))
);
const run = (sql, params = []) => new Promise((r, j) =>
  db.run(sql, params, function (e) { e ? j(e) : r(this) })
);

(async () => {
  const questions = await all(
    'SELECT id, options, category, weight FROM questions WHERE is_active = 1 ORDER BY id ASC'
  );
  const qMap = {};
  for (const q of questions) qMap[q.id] = {
    options: JSON.parse(q.options),
    category: q.category,
    weight: q.weight || 1.0
  };

  for (const userId of [1, 2, 3]) {
    const pattern = PATTERNS[userId];
    const dimSum = {};
    const dimW = {};
    DIMENSIONS.forEach(d => { dimSum[d] = 0; dimW[d] = 0; });

    const rows = [];
    const qIds = Object.keys(qMap).map(Number).sort((a, b) => a - b);
    qIds.forEach((qid, i) => {
      const q = qMap[qid];
      const selIdx = pattern[i] || 0;
      const opt = q.options[selIdx];
      const dim = opt.dimension || q.category;
      const w = q.weight;
      if (DIMENSIONS.includes(dim)) {
        dimSum[dim] += opt.score * w;
        dimW[dim] += w;
      }
      rows.push({ qid, answer: opt.text });
    });

    const scores = {};
    DIMENSIONS.forEach(d => {
      scores[d] = dimW[d] > 0 ? parseFloat((dimSum[d] / dimW[d]).toFixed(2)) : 0;
    });
    const scoresJSON = JSON.stringify(scores);

    await run('DELETE FROM answers WHERE user_id = ?', [userId]);
    for (const r of rows) {
      await run(
        'INSERT INTO answers (user_id, question_id, answer, dimension_scores) VALUES (?, ?, ?, ?)',
        [userId, r.qid, r.answer, scoresJSON]
      );
    }
    await run(
      `UPDATE users SET
         join_next_round = 1
       WHERE id = ?`,
      [userId]
    );
    console.log(`[USER ${userId}] 维度得分:`, scores);
  }

  db.close();
  console.log('\\n✅ 3 账号问卷写入成功！现在可以：npm run match:now');
})().catch(e => { console.error(e); process.exit(1); });
