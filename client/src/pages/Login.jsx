import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import { API } from '../App';

export default function Login({ setUser }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || '登录失败');
      setUser(data);
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-md border border-rose-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-semibold mb-3">
            🌸 CSMZ · 校园匹配
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">欢迎回来</h2>
          <p className="text-sm text-gray-500 mt-1">登录 CSMZ · 长沙民政职业技术学院 匹配平台</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <Mail size={12} /> 校园邮箱 @csmzxy.edu.cn
            </span>
            <input
              type="email"
              placeholder="xxx@csmzxy.edu.cn"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <Lock size={12} /> 密码
            </span>
            <input
              type="password"
              placeholder="至少 6 位"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:shadow-lg hover:shadow-rose-200 active:scale-[0.99] transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? '登录中...' : '登录，开信封 💌'} <ChevronRight size={16} />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-center text-sm text-gray-500">
            还没有账号？ <Link to="/register" className="text-rose-600 font-semibold hover:underline">立即注册 →</Link>
          </p>
          <p className="text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <ArrowLeft size={12} /> 返回 CSMZ 首页
            </Link>
          </p>
        </div>

        <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 leading-relaxed">
          💡 Tip：如果你还没有民院邮箱但想在本地 Demo 体验，可以联系我演示账号；线上版本将严格限制仅 @csmzxy.edu.cn。
        </div>
      </div>
    </div>
  );
}
