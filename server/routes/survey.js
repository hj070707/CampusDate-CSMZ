const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const db = require('../db');
const router = express.Router();

// GET /api/survey/questions — 获取所有题目
router.get('/questions', (req, res) => {
  db.all(
    'SELECT id, category, content, options, type, weight, order_num FROM questions WHERE is_active = 1 ORDER BY order_num',
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

// POST /api/survey/answers — 提交答案 + 计算维度得分
router.post('/answers', requireAuth, (req, res) => {
  const { answers } = req.body;
  const userId = req.userId;
  
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: '答案格式错误' });
  }

  db.all('SELECT id, options, category, weight FROM questions WHERE is_active = 1', [], (err, questions) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const questionMap = {};
    for (const q of questions) {
      questionMap[q.id] = {
        options: JSON.parse(q.options),
        category: q.category,
        weight: q.weight || 1.0
      };
    }

    // 加权聚合：每个维度的得分 = Σ(score × weight) / Σ(weight)
    const dimensionWeightedSum = {
      values: 0, personality: 0, lifestyle: 0,
      communication: 0, future: 0
    };
    const dimensionWeightTotal = { ...dimensionWeightedSum };
    const answersToInsert = [];
    
    for (const ans of answers) {
      const q = questionMap[ans.questionId];
      if (!q) continue;
      const selectedOption = q.options[ans.selectedIndex];
      if (!selectedOption) continue;
      
      const dim = selectedOption.dimension || q.category;
      const w = q.weight;
      if (dimensionWeightedSum[dim] !== undefined) {
        dimensionWeightedSum[dim] += selectedOption.score * w;
        dimensionWeightTotal[dim] += w;
      }
      answersToInsert.push({
        userId, questionId: ans.questionId,
        answer: selectedOption.text,
        dimension: dim, score: selectedOption.score
      });
    }

    // 归一化到 1.0 - 5.0
    const normalizedScores = {};
    for (const dim of Object.keys(dimensionWeightedSum)) {
      const totalW = dimensionWeightTotal[dim];
      normalizedScores[dim] = totalW > 0
        ? parseFloat((dimensionWeightedSum[dim] / totalW).toFixed(2))
        : 0;
    }

    // 先删除旧答案，再用 prepare 批量插入新答案
    db.run('DELETE FROM answers WHERE user_id = ?', [userId], async function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const stmt = db.prepare(
        'INSERT INTO answers (user_id, question_id, answer, dimension_scores) VALUES (?, ?, ?, ?)'
      );
      for (const a of answersToInsert) {
        stmt.run(userId, a.questionId, a.answer, JSON.stringify(normalizedScores));
      }
      // 等待所有插入完成（pg 下 finalize 是异步的）
      await new Promise((resolve, reject) => {
        stmt.finalize((err) => err ? reject(err) : resolve());
      });

      res.json({
        success: true,
        message: '问卷提交成功',
        dimensionScores: normalizedScores
      });
    });
  });
});

// GET /api/survey/status — 查询问卷状态 + 维度得分
router.get('/status', requireAuth, (req, res) => {
  const userId = req.userId;
  
  db.get('SELECT COUNT(*) as count FROM answers WHERE user_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const completed = row.count > 0;
    
    if (!completed) return res.json({ completed: false });
    
    db.get('SELECT dimension_scores FROM answers WHERE user_id = ? LIMIT 1', [userId], (err, scoreRow) => {
      if (err || !scoreRow) return res.json({ completed: true, dimensionScores: null });
      try {
        const scores = JSON.parse(scoreRow.dimension_scores);
        res.json({ completed: true, dimensionScores: scores });
      } catch {
        res.json({ completed: true, dimensionScores: null });
      }
    });
  });
});

module.exports = router;
