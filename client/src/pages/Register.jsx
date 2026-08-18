import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, MessageCircle, Phone, User } from 'lucide-react';
import { API } from '../App';

export default function Register({ setUser }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    gender: '',
    wechat: '',
    phone: ''
  });
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/school/info`).then(r => r.json()).then(d => setSchoolInfo(d)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || '注册失败');
      setUser(data);
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  const schoolName = schoolInfo?.name || '长沙民政职业技术学院';
  const domain = schoolInfo?.emailDomain || 'csmzxy.edu.cn';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-md border border-rose-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-semibold mb-3">
            🌸 {schoolInfo?.abbr || 'CSMZ'} · 校园匹配
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">加入 {schoolName}</h2>
          <p className="text-sm text-gray-500 mt-1">每周一中午 12:00，为你揭晓最契合的 TA</p>
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4 text-center p-3 bg-red-50 border border-red-100 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <User size={12} /> 昵称 · 匹配结果里对 TA 展示
            </span>
            <input
              type="text"
              placeholder="例：小橘子 / 一只柚子"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              maxLength={20}
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <Mail size={12} /> 校园邮箱（仅 <b className="text-rose-600">@{domain}</b> 可注册）
            </span>
            <input
              type="email"
              placeholder={`xxx@${domain}`}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">性别</span>
            <select
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value })}
              required
            >
              <option value="">请选择你的性别</option>
              <option value="male">👨 男生</option>
              <option value="female">👩 女生</option>
              <option value="other">🎓 其他</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">密码 · 至少 6 位</span>
            <input
              type="password"
              placeholder="**** ****"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </label>

          <div className="pt-2 mb-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <ShieldCheck size={12} className="text-green-500" />
              <span>联系方式仅在「双方都同意」后才向匹配对象展示</span>
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <MessageCircle size={12} /> 微信号 <span className="text-gray-400">（匹配成功后方便交换，推荐填写）</span>
            </span>
            <input
              type="text"
              placeholder="如 wxid_xxxxxx 或你的微信号"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.wechat}
              onChange={e => setForm({ ...form, wechat: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <Phone size={12} /> 手机号 <span className="text-gray-400">（选填）</span>
            </span>
            <input
              type="tel"
              placeholder="11 位手机号"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              maxLength={11}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:shadow-lg hover:shadow-rose-200 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {submitting ? '注册中...' : '立即注册，开启缘分 🌸'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-center text-sm text-gray-500">
            已有账号？<Link to="/login" className="text-rose-600 font-semibold hover:underline">去登录 →</Link>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link to="/" className="text-gray-400 hover:text-gray-600 text-xs">← 返回首页</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
