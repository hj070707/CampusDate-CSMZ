import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, UserCircle, Mail, Phone, MessageCircle, ShieldCheck, ChevronRight, AlertTriangle, Radar } from 'lucide-react';
import { API } from '../App';
import RadarChart from '../components/RadarChart';

const DIM_LABELS = {
  values: '价值观',
  personality: '性格',
  lifestyle: '生活方式',
  communication: '沟通方式',
  future: '未来规划'
};

export default function MatchResult() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [requesting, setRequesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/match/result`, { credentials: 'include' });
      const d = await r.json();
      if (!r.ok) setErr(d.error || '加载失败');
      setResult(d);
    } catch (e) {
      setErr('网络错误');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRequestContact() {
    if (!result?.match?.matchId) return;
    setRequesting(true);
    try {
      const r = await fetch(`${API}/api/match/${result.match.matchId}/exchange-contact`, {
        method: 'POST',
        credentials: 'include'
      });
      const d = await r.json();
      if (r.ok) {
        // 如果对方也点了，刷新结果就能看到联系方式
        setTimeout(load, 300);
        if (!d.partnerApproved) {
          alert('✅ 已同意展示你的联系方式。对方也同意后，你们就能互相看到微信啦～');
        } else {
          alert('🎉 太棒了！双方都同意展示联系方式，下面可以看到微信/手机号啦');
        }
      } else {
        alert(d.error || '请求失败');
      }
    } finally { setRequesting(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">加载中...</div>;

  if (err) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="text-red-500"><AlertTriangle size={40} /></div>
        <p className="text-gray-600">{err}</p>
        <Link to="/login" className="text-rose-600 hover:underline">去登录 →</Link>
      </div>
    );
  }

  if (!result || !result.hasMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white py-20 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-7xl mb-6">💌</div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">信封还没拆开</h2>
          <p className="text-gray-600 mb-2 leading-relaxed">
            {result?.message || '本周匹配结果暂未生成'}
          </p>
          <div className="mt-6 mb-8 inline-block px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            🕐 匹配将于 <b>每周一中午 12:00</b> 自动揭晓，记得回来开信封哦
          </div>
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-md hover:shadow-lg transition-all"
            >
              回到首页 <ChevronRight size={18} className="ml-1" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { score, partner, reasons } = result.match;
  const dims = partner?.dimensionScores || {};

  const pageStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="flex justify-between items-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-800">💌 本周你的匹配</h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回民院首页</Link>
        </motion.div>

        <motion.div
          variants={pageStagger}
          initial="hidden"
          animate="visible"
        >

        {/* 匹配度大卡片 + 昵称：信封撕开的仪式感 */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-3xl p-8 shadow-xl text-center mb-6 border border-rose-100 relative overflow-hidden"
          whileHover={{ y: -4, boxShadow: '0 30px 60px -20px rgba(244,114,182,0.25)' }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-100 rounded-full blur-2xl opacity-60" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-100 rounded-full blur-2xl opacity-60" />

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-2"
            >
              <Heart size={14} className="text-rose-500" /> 综合匹配度
            </motion.div>

            {/* 分数：数字滚动展开 + 心跳呼吸 */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 12, delay: 0.2 }}
              className="mb-3"
            >
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent"
              >
                {score}%
              </motion.div>
            </motion.div>

            {reasons?.headline && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-100 to-amber-100 rounded-full text-rose-700 font-semibold"
              >
                <Sparkles size={16} /> {reasons.headline}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.4 }}
              className="mt-8 flex items-center justify-center"
            >
              <div className="flex items-center gap-3 bg-rose-50 px-5 py-3 rounded-2xl border border-rose-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white flex items-center justify-center text-xl font-bold">
                  {(partner?.name || '同学').slice(0, 1)}
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold text-gray-800">{partner?.name || '神秘的TA'}</div>
                  <div className="text-xs text-gray-500">
                    {partner?.gender === 'female' ? '👩 民院女生' : partner?.gender === 'male' ? '👨 民院男生' : '🎓 民院同学'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 合拍理由 */}
        {reasons && (
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-gray-100"
            whileHover={{ y: -3 }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
              <Sparkles size={18} className="text-amber-500" /> 为什么我们认为你们会合拍
            </h3>
            <motion.div
              variants={pageStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {(reasons.matches || []).map((it, idx) => (
                <motion.div
                  key={'m' + idx}
                  variants={fadeUp}
                  className="flex gap-3 mb-4 last:mb-2"
                >
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 text-sm mb-0.5">
                      共同点 · {it.label}
                      <span className="text-gray-400 font-normal ml-2">TA {Number(it.bScore).toFixed(1)} / 你 {Number(it.aScore).toFixed(1)}</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{it.reason}</p>
                  </div>
                </motion.div>
              ))}
              {(reasons.complements || []).map((it, idx) => (
                <motion.div
                  key={'c' + idx}
                  variants={fadeUp}
                  className="flex gap-3"
                >
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">✨</div>
                  <div>
                    <div className="font-semibold text-gray-700 text-sm mb-0.5">
                      互补亮点 · {it.label}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{it.reason}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* 5 维画像雷达图 — 你 vs TA 对比 */}
        {Object.keys(dims).length > 0 && (
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-gray-100"
          >
            <h3 className="font-bold mb-2 flex items-center gap-2 text-gray-800">
              <Radar size={18} className="text-rose-500" /> 5 维画像对比
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-500 opacity-70 align-middle mr-1" /> 红色 = 你，
              <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500 opacity-70 align-middle mx-1 ml-2" /> 蓝色 = TA
              — 重叠越多越同频，错落有致说明互补
            </p>
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center"
            >
              <RadarChart
                dataA={result.match.myScores || {}}
                dataB={dims}
                labelA="你"
                labelB="TA"
                size={310}
              />
            </motion.div>
            {/* TA 的具体数值 */}
            <div className="grid grid-cols-5 gap-2 mt-2 pt-4 border-t border-gray-50">
              {Object.entries(dims).map(([dim, v]) => (
                <motion.div
                  key={dim}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="text-sm font-bold text-gray-700">{Number(v).toFixed(1)}</div>
                  <div className="text-xs text-gray-400">{DIM_LABELS[dim] || dim}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 联系方式卡片（双方同意才展示） */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-rose-100"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
            <MessageCircle size={18} className="text-green-500" /> 联系 TA
          </h3>

          {partner?.contactVisible ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center"><MessageCircle size={16} /></div>
                <div>
                  <div className="text-xs text-green-600 mb-0.5">微信号（双方都同意展示啦 🎉）</div>
                  <div className="font-mono text-base font-bold text-gray-800">{partner.wechat || '— 对方未填写 —'}</div>
                </div>
              </div>
              {partner.phone && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center"><Phone size={16} /></div>
                  <div>
                    <div className="text-xs text-blue-600 mb-0.5">手机号</div>
                    <div className="font-mono text-base font-bold text-gray-800">{partner.phone}</div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 加好友时不妨说一句："嗨，我是民院匹配过来的，你的 <b>价值观</b> 跟我真的太同频了！" —— 参考上面的"合拍理由"展开话题会更自然哦。
              </p>
            </motion.div>
          ) : (
            <div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4"
              >
                <ShieldCheck size={20} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600 leading-relaxed">
                  为了保护双方隐私，你的联系方式只有在 <b>你和 TA 都点击下方按钮</b> 之后，才会互相可见。
                  这和"把微信号写在纸上，同时翻过来"是同一个仪式感 ✨
                </div>
              </motion.div>
              <motion.button
                whileHover={!partner?.contactRequested ? { scale: 1.02, boxShadow: '0 20px 40px -12px rgba(244,114,182,0.5)' } : {}}
                whileTap={!partner?.contactRequested ? { scale: 0.98 } : {}}
                animate={!partner?.contactRequested && !requesting ? {
                  // 心跳：吸引注意点一下
                  scale: [1, 1.025, 1]
                } : {}}
                transition={!partner?.contactRequested && !requesting ? {
                  scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                  type: 'spring'
                } : {}}
                disabled={requesting || partner?.contactRequested}
                onClick={handleRequestContact}
                className={`w-full py-3 rounded-xl font-semibold transition-all
                  ${partner?.contactRequested
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-200 active:scale-[0.99]'
                  }`}
              >
                {requesting ? '提交中...' : partner?.contactRequested
                  ? '✅ 已发送 — 等待对方也同意'
                  : '我也想展示我的微信，跟 TA 打招呼 👋'}
              </motion.button>
              <p className="text-xs text-gray-400 mt-3 text-center">
                <Mail size={12} className="inline mr-1 align-middle" />
                你的微信号仅对这位匹配对象展示，绝不会被任何其他人看到
              </p>
            </div>
          )}
        </motion.div>

        {/* 温柔提醒卡片 */}
        <motion.div
          variants={fadeUp}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 leading-relaxed"
        >
          <div className="font-bold mb-1">🌱 一些温柔的提醒</div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>匹配度只是参考，真正的合拍要你们自己写故事</li>
            <li>加好友后记得互相尊重，民院的同学都要真诚相待</li>
            <li>有任何不适，可以随时在「个人资料」里修改匹配参与设置</li>
          </ul>
        </motion.div>

        </motion.div> {/* stagger 容器结束 */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-8 text-center text-xs text-gray-400"
        >
          © CSMZ 民政学院 · 校园匹配平台 · 在民院，遇见对的人
        </motion.div>
      </div>
    </div>
  );
}
