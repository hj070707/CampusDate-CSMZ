const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// 校园邮箱白名单 —— 仅允许长沙民政职业技术学院邮箱注册
const SCHOOL_EMAIL_DOMAIN = 'csmzxy.edu.cn';
const SCHOOL_NAME = '长沙民政职业技术学院';
const SCHOOL_ABBR = 'CSMZ';

function isValidSchoolEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  // 允许以 @csmzxy.edu.cn 结尾
  return lower.endsWith('@' + SCHOOL_EMAIL_DOMAIN);
}

// ✅ 注册（校园邮箱白名单 + 收集微信/手机）
router.post('/register', async (req, res) => {
  const { email, password, name, gender, wechat, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码必填' });
  }
  if (!isValidSchoolEmail(email)) {
    return res.status(400).json({
      error: `仅支持 ${SCHOOL_NAME} 校园邮箱注册（@${SCHOOL_EMAIL_DOMAIN}）`
    });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (email, password_hash, name, gender, wechat, phone, school, join_next_round)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [email, hash, name || null, gender || null, wechat || null, phone || null, SCHOOL_NAME],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: '该邮箱已注册' });
          }
          return res.status(500).json({ error: '服务器错误' });
        }
        req.session.userId = this.lastID;
        res.json({
          id: this.lastID,
          email,
          name: name || null,
          school: SCHOOL_NAME,
          message: '注册成功，欢迎加入民政学院匹配圈～'
        });
      }
    );
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ✅ 登录
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    if (!user.is_active || user.deactivated_at) {
      return res.status(403).json({ error: '账号已被禁用或已注销' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: '账号或密码错误' });

    req.session.userId = user.id;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: !!user.is_admin,
      school: user.school
    });
  });
});

// ✅ 获取当前登录用户（含新字段）
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登录' });
  db.get(
    `SELECT id, email, name, gender, is_admin, school, wechat, phone, join_next_round
     FROM users WHERE id = ?`,
    [req.session.userId],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: '用户不存在' });
      res.json({
        ...user,
        isAdmin: !!user.is_admin,
        joinNextRound: !!user.join_next_round
      });
    }
  );
});

// ✅ 登出（安全：destroy session + 返回空）
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: '已退出登录' });
  });
});

module.exports = router;
module.exports.CONSTANTS = { SCHOOL_EMAIL_DOMAIN, SCHOOL_NAME, SCHOOL_ABBR };
