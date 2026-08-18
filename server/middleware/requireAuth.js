// ✅ 你负责：登录校验中间件
module.exports = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  req.userId = req.session.userId;
  next();
};
