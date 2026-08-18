const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');
const { runMatching } = require('./match-algo');
const authRoutes = require('./routes/auth');
const surveyRoutes = require('./routes/survey');
const matchRoutes = require('./routes/match');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = 3000;

// 站点信息 —— 民政学院专属
const SCHOOL = {
  abbr: 'CSMZ',
  name: '长沙民政职业技术学院',
  emailDomain: 'csmzxy.edu.cn',
  slogan: '在民院，遇见对的人。',
  tagline: '让一段缘分，值得等待。',
  // 每周一中午 12:00 揭晓
  revealWeekday: '周一',
  revealTimeText: '12:00',
  cron: '0 12 * * 1'
};

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'campusdate-csmz-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ========== 公开学校信息接口（首页品牌化用） ==========
app.get('/api/school/info', (_req, res) => {
  res.json(SCHOOL);
});

// 本校 KPI：注册人数、问卷完成率、累计成功配对数
app.get('/api/school/kpi', (_req, res) => {
  db.get('SELECT COUNT(*) AS total_users FROM users WHERE is_active = 1 OR is_active IS NULL', [], (err1, usersRow) => {
    if (err1) return res.status(500).json({ error: err1.message });
    const totalUsers = usersRow.total_users;

    db.get(
      `SELECT COUNT(DISTINCT user_id) AS users_surveyed
       FROM answers`,
      [],
      (err2, surveyRow) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const usersSurveyed = surveyRow.users_surveyed;
        const completionRate = totalUsers ? ((usersSurveyed / totalUsers) * 100).toFixed(1) : 0;

        db.get('SELECT COUNT(*) AS total_matches FROM matches', [], (err3, mRow) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({
            totalUsers,
            usersSurveyed,
            completionRatePercent: Number(completionRate),
            totalMatches: mRow.total_matches * 1  // 每 match 一对即 1 个成功配对（若计数为累计人次则 ×2）
          });
        });
      }
    );
  });
});

// ========== 路由挂载 ==========
app.use('/api/auth', authRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

// ========== 定时任务：每周一中午 12:00 自动匹配 ==========
// cron 格式：秒 分 时 日 月 周
// 每周一 12:00:00 触发 → '0 0 12 * * 1'
const MATCHING_CRON = process.env.MATCHING_CRON || '0 0 12 * * 1';

cron.schedule(MATCHING_CRON, async () => {
  const stamp = new Date().toLocaleString('zh-CN', { hour12: false });
  console.log(`\n[⏰ 定时触发匹配] ${stamp} — 民政学院每周一 12:00 定时匹配开始`);
  try {
    const result = await runMatching();
    console.log(`[✅ 定时匹配完成] ${result.message}`);
  } catch (err) {
    console.error(`[❌ 定时匹配失败]`, err.message || err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Shanghai'
});

const server = app.listen(PORT, () => {
  const stamp = new Date().toLocaleString('zh-CN', { hour12: false });
  console.log(`
╔═══════════════════════════════════════════════════════╗
║          🌸  CampusDate · ${SCHOOL.name}  🌸           ║
║          (CSMZ 民政学院专属校园匹配平台 v0.2)           ║
╠═══════════════════════════════════════════════════════╣
║  🚀 Server   : http://localhost:${PORT}
║  🎓 学校邮箱  : *@${SCHOOL.emailDomain}
║  🕐 揭晓时间  : 每周${SCHOOL.revealWeekday} ${SCHOOL.revealTimeText}
║  ⏱  Cron     : ${MATCHING_CRON}  (Asia/Shanghai)
║  🕵 启动时间  : ${stamp}
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = { server, SCHOOL };
