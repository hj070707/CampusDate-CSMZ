import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Heart, Sparkles, ShieldCheck, GraduationCap, Clock,
  Users, FileCheck, LogOut, UserCircle, ChevronRight,
  ClipboardList, CalendarDays, Coffee, Menu, X, MessageCircle, AlertCircle
} from 'lucide-react';
import { API } from '../App';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.05 } }
};
const scaleOnHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -6, transition: { duration: 0.35, ease: 'easeOut' } }
};
// 翻数字动画：数字变化时做一次从下往上翻
const flipNumber = {
  enter: { opacity: 0, y: 20, rotateX: -30 },
  center: { opacity: 1, y: 0, rotateX: 0 },
  exit: { opacity: 0, y: -20, rotateX: 30 }
};

/**
 * 计算距下一个"每周一中午 12:00"的剩余时间
 */
function useNextMondayCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(now);
  const weekday = target.getDay(); // 0=Sun..6=Sat
  const dayOffset = (1 - weekday + 7) % 7; // 1=Mon
  target.setDate(target.getDate() + dayOffset);
  target.setHours(12, 0, 0, 0);
  // 如果本周一 12:00 已经过（dayOffset=0 且 当前时间 > 12:00），推到下下周一
  if (dayOffset === 0 && now > target) {
    target.setDate(target.getDate() + 7);
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  const targetText = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日 · 周一 · 12:00`;
  return { days, hours, mins, secs, targetText };
}

export default function Home({ user, setUser }) {
  const [school, setSchool] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -50]);

  const { days, hours, mins, secs, targetText } = useNextMondayCountdown();

  useEffect(() => {
    fetch(`${API}/api/school/info`).then(r => r.json()).then(d => setSchool(d)).catch(() => {});
    fetch(`${API}/api/school/kpi`).then(r => r.json()).then(d => setKpi(d)).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const abbr = school?.abbr || 'CSMZ';
  const name = school?.name || '长沙民政职业技术学院';
  const domain = school?.emailDomain || 'csmzxy.edu.cn';
  const slogan = school?.slogan || '在民院，遇见对的人。';
  const tagline = school?.tagline || '让一段缘分，值得等待。';

  const steps = [
    {
      n: '01',
      icon: <ClipboardList size={32} />,
      title: '填写一份深度问卷',
      desc: '20 道关于价值观、性格、生活方式、沟通方式与未来规划的问题，让算法真正认识你。花 10 分钟认真填写，匹配会更准。'
    },
    {
      n: '02',
      icon: <CalendarDays size={32} />,
      title: '每周一中午 12:00，打开信封',
      desc: '系统会自动运行匹配算法，帮你选出本周最契合的一位同学，附带匹配度、合拍理由、爱好共同点。'
    },
    {
      n: '03',
      icon: <Coffee size={32} />,
      title: '去见见 TA 吧',
      desc: '双方都点击「愿意展示联系方式」后，互相看到微信号。约一场咖啡、散个步、逛一逛民政学院的校园——剩下的交给你们自己写。'
    }
  ];

  const whys = [
    {
      icon: <Heart className="text-rose-500" size={28} />,
      title: '每周一次',
      desc: '没有左滑右滑，没有无尽筛选。每周一中午 12:00 固定时间统一揭晓，一周至多一次配对，把精力留给真正重要的人。'
    },
    {
      icon: <Sparkles className="text-amber-500" size={28} />,
      title: '精准匹配',
      desc: '基于价值观、情感风格、生活方式等契合度研究与加权匹配算法——不只看相似，也捕捉互补的差异。'
    },
    {
      icon: <ShieldCheck className="text-green-500" size={28} />,
      title: '隐私优先',
      desc: '这不是公开社交平台。任何人除匹配对象外，只能看到与自己有关的信息；微信号需双方都同意才互相可见。'
    },
    {
      icon: <GraduationCap className="text-indigo-500" size={28} />,
      title: '仅限在校生',
      desc: `仅限 ${name} 校园邮箱（@${domain}）注册验证，你遇见的每一个人，都和你一样走在民院的校园里。`
    }
  ];

  const faqs = [
    {
      q: '这个平台是干嘛的？',
      a: '一个恋爱（date）匹配平台。我们认真写了 20 道关于你的问卷，每周一开信封，把最契合的那个人介绍给你。'
    },
    {
      q: '需要付费吗？',
      a: '完全免费。这是一个同学之间的非营利项目，放在作品集里也是开源的。'
    },
    {
      q: '那周很忙，能不参加吗？',
      a: '当然可以。在「个人资料」里关闭下周匹配的开关，跳过就好。期末/期中或者想休息一下都没问题，等你准备好了我们随时在。'
    },
    {
      q: '匹配是怎么算的？',
      a: '综合 5 个维度的加权相似度（价值观权重最高），并做了近 3 轮防重复匹配，避免这周还是上周那个人。'
    },
    {
      q: '我的微信号会被别人看到吗？',
      a: '不会。只有当你和匹配对象都点击"我愿意展示微信"时，才会互相看到对方的微信。这是个双向的温柔设计。'
    },
    {
      q: '我注销账号数据怎么办？',
      a: '一键匿名化处理：邮箱变成随机串、昵称/微信/手机全部清空，只保留匿名问卷数据用于算法改进。可在个人资料页操作。'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">

      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-100 rounded-full blur-[120px] opacity-40" />
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] bg-amber-100 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-[10%] left-[10%] w-[380px] h-[380px] bg-indigo-50 rounded-full blur-[120px] opacity-50" />
      </div>

      {/* ========== 导航栏 ========== */}
      <motion.nav
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">{abbr[0]}</div>
            <div className="leading-tight">
              <div className="text-base md:text-lg font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
                {abbr} · CampusDate
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 hidden md:block">{name} 专属匹配</div>
            </div>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how" className="hover:text-rose-600 transition">如何参与</a>
            <a href="#why" className="hover:text-rose-600 transition">为什么选择我们</a>
            <a href="#faq" className="hover:text-rose-600 transition">常见问题</a>
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="inline-flex items-center gap-1.5 hover:text-rose-600 transition">
                  <UserCircle size={16} /> 个人资料
                </Link>
                <Link to="/match" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:shadow-md hover:shadow-rose-100 transition">
                  <Heart size={14} /> 看本周匹配
                </Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition" title="退出登录">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition">登录</Link>
                <Link to="/register" className="px-5 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:shadow-md hover:shadow-rose-100 transition">
                  立即加入
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden text-gray-600" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 text-sm">
            <a href="#how" onClick={() => setMenuOpen(false)}>如何参与</a>
            <a href="#why" onClick={() => setMenuOpen(false)}>为什么选择我们</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>常见问题</a>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block">个人资料</Link>
                <Link to="/match" onClick={() => setMenuOpen(false)} className="block text-rose-600 font-semibold">看本周匹配</Link>
                <button onClick={handleLogout} className="text-red-500">退出登录</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}>登录</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="text-rose-600 font-semibold">立即加入</Link>
              </>
            )}
          </div>
        )}
      </motion.nav>

      {/* ========== Hero 区 ========== */}
      <motion.section
        className="relative z-10 px-6 pt-12 pb-16 md:pt-24 md:pb-24"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-white/60 backdrop-blur-sm border border-rose-200/60 rounded-full text-sm font-semibold text-rose-600 shadow-sm"
          >
            🌸 {abbr} 民院 · 同学之间的校园匹配
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-black text-gray-800 mb-4 leading-[1.15]">
            告别左滑右滑
            <br />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              {slogan}
            </span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            {tagline}
            <br />
            填写一份深度问卷，<b className="text-rose-600">每周一中午 12:00</b> 系统自动揭晓与你最契合的那个人。
          </motion.p>

          {/* CTA + 邮箱输入 */}
          <motion.div variants={fadeInUp} className="max-w-xl mx-auto mb-12">
            <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-rose-100">
              <div className="flex-1 flex items-center gap-2 w-full">
                <input
                  type="email"
                  disabled={!!user}
                  placeholder={user ? (user.name ? `嗨，${user.name}，你已登录 ✨` : '你已登录') : `你的校园邮箱 xxx@${domain}`}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400 transition disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <Link
                to={user ? (user.email ? '/survey' : '/profile') : '/register'}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:shadow-lg hover:shadow-rose-200 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
              >
                {user ? '填写问卷 / 查看进度' : '开始 🌸'}
                <ChevronRight size={18} />
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
              <AlertCircle size={12} /> 仅接受 <b className="text-gray-500">@{domain}</b> 校园邮箱注册 · 完全免费 · 永不卖数据
            </p>
          </motion.div>

          {/* 倒计时卡 */}
          <motion.div variants={fadeInUp} className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 text-white rounded-3xl p-6 md:p-8 shadow-2xl shadow-rose-200 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 40%)' }} />
              <div className="relative">
                <div className="flex items-center justify-center gap-2 mb-4 text-white/90">
                  <Clock size={18} /> <span className="font-semibold">距下次配对揭晓</span>
                </div>
                <div className="grid grid-cols-4 gap-3 md:gap-5 mb-3" style={{ perspective: 600 }}>
                  {[
                    { v: days, l: '天' },
                    { v: hours, l: '时' },
                    { v: mins, l: '分' },
                    { v: secs, l: '秒' },
                  ].map((it, i) => (
                    <div key={i} className="bg-white/15 backdrop-blur rounded-2xl p-3 md:p-5 border border-white/20 relative overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          // 用补零后的字符串作为 key，数字一变就触发翻页动画
                          key={String(it.v).padStart(2, '0')}
                          variants={flipNumber}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className="text-3xl md:text-5xl font-black tabular-nums leading-none"
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          {String(it.v).padStart(2, '0')}
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-xs md:text-sm text-white/80 mt-2">{it.l}</div>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-white/90 text-center">
                  🗓 {targetText} 统一开信封
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ========== KPI 区 ========== */}
      <section className="relative z-10 px-6 -mt-4 mb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="bg-white rounded-3xl shadow-xl border border-rose-100 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-rose-100"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {[
              { Icon: Users, color: 'text-rose-500', value: kpi?.totalUsers ? kpi.totalUsers.toLocaleString() : '—', suffix: '+', label: '本校已注册用户' },
              { Icon: FileCheck, color: 'text-amber-500', value: kpi ? `${kpi.completionRatePercent}%` : '—', suffix: '', label: '本校问卷完成率' },
              { Icon: Heart, color: 'text-indigo-500', value: kpi?.totalMatches ? kpi.totalMatches.toLocaleString() : '—', suffix: '', label: '累计成功匹配（对）' },
            ].map((it, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                className="p-6 md:p-8 text-center"
              >
                {/* 温柔呼吸的 icon：3-5 秒一次周期 */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                  className={`${it.color} mx-auto mb-3 inline-flex`}
                >
                  <it.Icon size={30} />
                </motion.div>
                <div className="text-3xl md:text-4xl font-black text-gray-800 tabular-nums">
                  {it.value}
                  {it.suffix && <span className="text-lg text-gray-400 font-bold ml-1">{it.suffix}</span>}
                </div>
                <div className="text-sm text-gray-500 mt-1">{it.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== 如何参与 ========== */}
      <section id="how" className="relative z-10 px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold mb-4">HOW TO JOIN</div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-3">如何参与？三步就够啦</h2>
            <p className="text-gray-500">从注册到遇到 TA，总共 3 步，每一步都很温柔。</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                className="bg-gradient-to-br from-rose-50/60 to-white p-7 rounded-3xl border border-rose-100 shadow-sm hover:shadow-lg hover:shadow-rose-100 transition"
                variants={scaleOnHover}
                initial="rest"
                whileHover="hover"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md">
                    {s.icon}
                  </div>
                  <div className="text-5xl font-black text-rose-100 leading-none">{s.n}</div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 为什么选择我们 ========== */}
      <section id="why" className="relative z-10 px-6 py-20 bg-gradient-to-b from-white to-rose-50/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold mb-4">WHY US</div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-3">为什么 {abbr} 同学选择我们？</h2>
            <p className="text-gray-500">认真的人，值得认真的相遇。</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {whys.map((w, i) => (
              <motion.div
                key={i}
                className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition flex gap-5"
                variants={scaleOnHover}
                initial="rest"
                whileHover="hover"
              >
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center border border-gray-100">
                  {w.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1.5">{w.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{w.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className="relative z-10 px-6 py-20 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold mb-4">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-3">常见问题</h2>
            <p className="text-gray-500">你可能想问的几个问题</p>
          </div>
          <div className="space-y-3">
            {faqs.map((it, i) => {
              // 每条 FAQ 内部维护 open 状态以使用 motion 平滑展开
              const Item = (props) => {
                const { data, idx } = props;
                const [open, setOpen] = useState(false);
                return (
                  <motion.div
                    className="bg-gray-50/60 border border-gray-100 rounded-2xl overflow-hidden"
                    initial={{ y: 24, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.008, y: -2 }}
                  >
                    <button
                      className="w-full p-5 text-left cursor-pointer font-semibold text-gray-800 flex items-center justify-between gap-4 hover:bg-white/60 transition"
                      onClick={() => setOpen(v => !v)}
                    >
                      <span>Q{idx + 1}. {data.q}</span>
                      <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="text-gray-400 shrink-0"
                      >
                        <ChevronRight size={18} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                            {data.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              };
              return <Item key={i} data={it} idx={i} />;
            })}
          </div>
        </div>
      </section>

      {/* ========== CTA 大卡片 ========== */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 rounded-3xl p-10 md:p-16 text-white text-center relative overflow-hidden shadow-2xl shadow-rose-200">
            <div className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 0 0, #fff 0, transparent 50%), radial-gradient(circle at 100% 100%, #fff 0, transparent 50%)' }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-black mb-3">准备好了吗？</h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl mx-auto leading-relaxed">
                加入 {abbr} · {name} 校园匹配
                <br />
                {slogan}
              </p>
              {user ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/survey"
                    className="w-full sm:w-auto px-8 py-3.5 bg-white text-rose-600 rounded-2xl font-bold hover:shadow-xl hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-2"
                  >
                    继续填写问卷 <ChevronRight size={18} />
                  </Link>
                  <Link
                    to="/match"
                    className="w-full sm:w-auto px-8 py-3.5 bg-white/15 backdrop-blur border border-white/30 text-white rounded-2xl font-semibold hover:bg-white/25 transition"
                  >
                    <Heart size={16} className="inline mr-1.5" />看本周匹配
                  </Link>
                </div>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-rose-600 rounded-2xl font-bold hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  立即加入 {abbr} 🌸 <ChevronRight size={20} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="relative z-10 mt-auto px-6 py-12 border-t border-gray-100 bg-white/60 backdrop-blur">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">{abbr[0]}</div>
              <span className="text-xl font-bold text-gray-800">{abbr} · CampusDate</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              {name} 学生自发打造的非营利校园匹配实验。<br />
              灵感来自斯坦福 Date Drop —— 认真的人，值得认真的相遇。
            </p>
            <div className="mt-4 text-sm font-bold text-gray-700">🌸 {slogan}</div>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">探索</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link to="/match" className="hover:text-rose-600">匹配结果</Link></li>
              <li><Link to="/survey" className="hover:text-rose-600">填写问卷</Link></li>
              <li><Link to="/profile" className="hover:text-rose-600">个人资料</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">关于</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#how" className="hover:text-rose-600">如何参与</a></li>
              <li><a href="#why" className="hover:text-rose-600">为什么选择我们</a></li>
              <li><a href="#faq" className="hover:text-rose-600">常见问题</a></li>
              <li className="flex items-center gap-1 text-gray-400"><MessageCircle size={12} /> 问题反馈：请联系运营同学</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div>© {new Date().getFullYear()} {abbr} · {name} 校园匹配平台 · Made with 🌸 in {name}</div>
          <div className="flex items-center gap-4">
            <span>仅接受 @{domain} 邮箱注册</span>
            <span>·</span>
            <span>完全非营利 · 开源作品集项目</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
