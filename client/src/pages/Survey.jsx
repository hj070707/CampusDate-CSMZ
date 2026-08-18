import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../App';
import { CheckCircle2, Home, Mail, ChevronRight, Heart, Sparkles } from 'lucide-react';

export default function Survey() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false); // 提交成功后展示成功卡片
  const navigate = useNavigate();
  const topRef = useRef(null);

  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);

  // 获取题目
  useEffect(() => {
    fetch(`${API}/api/survey/questions`)
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || []);
        setLoading(false);

        // 尝试恢复本地暂存
        const saved = localStorage.getItem('survey_answers');
        if (saved) {
          try {
            setAnswers(JSON.parse(saved));
          } catch { }
        }
      })
      .catch(() => {
        setError('加载题目失败');
        setLoading(false);
      });
  }, []);

  // 自动暂存到 localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem('survey_answers', JSON.stringify(answers));
    }
  }, [answers]);

  // 翻页时自动滚动到问卷顶部
  useEffect(() => {
    // 先让题目 DOM 渲染一帧，再回到页面最顶端，避免 scrollIntoView 计算偏差
    const t = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(t);
  }, [currentPage]);

  const handleSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const progress = questions.length > 0
    ? Math.round((Object.keys(answers).length / questions.length) * 100)
    : 0;

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      const confirmed = window.confirm(`还有 ${questions.length - Object.keys(answers).length} 题未答，确定提交吗？`);
      if (!confirmed) return;
    }

    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, selectedIndex]) => ({
      questionId: parseInt(questionId),
      selectedIndex
    }));

    try {
      const res = await fetch(`${API}/api/survey/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: payload })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');

      // 清除暂存
      localStorage.removeItem('survey_answers');

      // 默认把"参与下周匹配"打开（可在个人资料里随时关闭）
      try {
        await fetch(`${API}/api/profile/join-next-round`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ join: true })
        });
      } catch (_) { /* 静默失败，不影响主流程 */ }

      // 展示成功卡片，不再用 confirm 弹窗
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 提交成功后的展示卡片：信封撕开 + 飘浮心形 + 按钮脉冲
  if (submitted) {
    // 随机生成 8 个飘浮心形 / 星星的参数（seeded）
    const floats = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (i % 4) * 25 + 5 + (i % 2) * 5,         // 0-100% 水平分布
      delay: i * 0.25,
      dur: 3 + (i % 4) * 0.6,                    // 3-5s 周期
      type: i % 3 === 0 ? 'spark' : 'heart',
      size: 14 + (i % 3) * 4,
      color: i % 2 === 0 ? 'text-rose-400' : 'text-amber-400'
    }));

    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 flex items-center justify-center px-4 py-10 relative overflow-hidden">
        {/* 背景飘浮的爱心/星星 */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {floats.map(f => (
            <motion.div
              key={f.id}
              className={`absolute ${f.color} opacity-60`}
              style={{ left: `${f.x}%`, bottom: '-10%' }}
              animate={{
                y: [0, -window.innerHeight * 0.8],
                x: [0, (f.id % 2 === 0 ? 1 : -1) * 40],
                opacity: [0, 0.7, 0],
                rotate: [0, f.id % 2 === 0 ? 20 : -20]
              }}
              transition={{
                duration: f.dur,
                delay: f.delay,
                repeat: Infinity,
                ease: 'easeOut',
                repeatDelay: 1
              }}
            >
              {f.type === 'heart' ? <Heart size={f.size} fill="currentColor" /> : <Sparkles size={f.size} />}
            </motion.div>
          ))}
        </div>

        <div className="max-w-md w-full relative z-10">
          {/* 主卡：从天上掉下来 + 轻微回弹 */}
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.85, rotate: -3 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 130, damping: 16, mass: 0.8 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-rose-100 text-center relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-100 rounded-full blur-2xl opacity-60" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-100 rounded-full blur-2xl opacity-60" />
            <div className="relative">
              {/* 打勾：先缩放弹出，再轻轻呼吸 */}
              <motion.div
                initial={{ scale: 0, rotate: -60 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
                className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-200"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <CheckCircle2 size={32} className="text-white" />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                className="text-2xl font-extrabold text-gray-800 mb-3"
              >
                问卷提交成功！
              </motion.h2>
              <motion.p
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
                className="text-gray-600 text-sm leading-relaxed mb-6"
              >
                我们已经帮你确认参与下周匹配啦 🎉<br />
                系统将在 <b className="text-rose-600">每周一中午 12:00</b> 自动为你寻找最契合的 TA。
              </motion.p>

              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
                className="space-y-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(244,114,182,0.45)' }}
                  whileTap={{ scale: 0.98 }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
                  onClick={() => navigate('/match')}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold shadow-lg shadow-rose-200 active:scale-[0.99] transition-all"
                >
                  <Mail size={18} /> 查看匹配结果 <ChevronRight size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(249,250,251,1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/')}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  <Home size={18} /> 返回首页
                </motion.button>
              </motion.div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-center text-xs text-gray-400 mt-4"
          >
            💌 在民院，遇见对的人
          </motion.p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 顶部进度 */}
        <div ref={topRef} className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
                      <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">深度匹配问卷</h2>
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回首页</Link>
            </div>
            <span className="text-sm text-gray-500">
              已答 {Object.keys(answers).length}/{questions.length} 题
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">{progress}%</p>
        </div>

        {/* 题目列表 */}
        <div className="space-y-6">
          {currentQuestions.map((q, idx) => {
            const globalIndex = currentPage * QUESTIONS_PER_PAGE + idx + 1;
            const selected = answers[q.id];

            return (
              <div key={q.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {globalIndex}
                  </span>
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded mb-1">
                      {q.category}
                    </span>
                    <h3 className="text-lg font-medium text-gray-800">{q.content}</h3>
                  </div>
                </div>

                <div className="space-y-2 ml-11">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(q.id, idx)}
                                            className={`w-full text-left px-4 py-4 md:py-3 rounded-lg border-2 transition-all text-sm md:text-base ${
                        selected === idx
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50'
                      }`}

                    >
                      <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 分页导航 */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>

          <span className="text-sm text-gray-500">
            第 {currentPage + 1}/{totalPages} 页
          </span>

          {currentPage < totalPages - 1 ? (
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              className="px-6 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600"
            >
              下一页
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交问卷'}
            </button>
          )}
        </div>

        {/* 暂存提示 */}
        <p className="text-center text-xs text-gray-400 mt-4">
          答案会自动暂存，刷新页面不会丢失
        </p>
      </div>
    </div>
  );
}