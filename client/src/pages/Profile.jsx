import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, MessageCircle, Phone, LogOut, Trash2, Save,
  Sparkles, AlertTriangle, CheckCircle2, CalendarDays, HelpCircle, KeyRound,
  History, Heart, ShieldCheck, ChevronRight
} from 'lucide-react';
import { API } from '../App';

export default function Profile({ user, setUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ ok: false, text: '' });
  const [history, setHistory] = useState({ loading: true, total: 0, items: [] });
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    fetch(`${API}/api/profile`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProfile(d); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function loadHistory() {
    setHistory(h => ({ ...h, loading: true }));
    try {
      const r = await fetch(`${API}/api/profile/match-history`, { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setHistory({ loading: false, total: d.total || 0, items: d.items || [] });
      } else {
        setHistory({ loading: false, total: 0, items: [] });
      }
    } catch (_) {
      setHistory({ loading: false, total: 0, items: [] });
    }
  }
  useEffect(() => { loadHistory(); }, []);

  function onChange(k, v) {
    setProfile(p => ({ ...(p || {}), [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const r = await fetch(`${API}/api/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          gender: profile.gender,
          wechat: profile.wechat,
          phone: profile.phone,
          join_next_round: profile.joinNextRound ? 1 : 0
        })
      });
      const d = await r.json();
      if (r.ok) {
        setMsg('✅ 资料已保存');
        setUser({ ...(user || {}), name: profile.name });
        setTimeout(() => setMsg(''), 2500);
      } else {
        setMsg('❌ ' + (d.error || '保存失败'));
      }
    } finally { setSaving(false); }
  }

  async function toggleJoin() {
    const newVal = !profile.joinNextRound;
    setJoinLoading(true);
    try {
      const r = await fetch(`${API}/api/profile/join-next-round`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join: newVal })
      });
      const d = await r.json();
      if (r.ok) {
        setProfile(p => ({ ...(p || {}), joinNextRound: newVal }));
        setMsg(d.message || (newVal ? '✅ 已确认参与下周匹配' : '⏸ 已设置不参与下周匹配'));
        setTimeout(() => setMsg(''), 2500);
      }
    } finally { setJoinLoading(false); }
  }

  async function deactivate() {
    if (!confirm('确定要注销账号吗？\n\n注销后：\n• 个人信息将匿名化处理（邮箱/昵称/微信/手机号全部清空或替换）\n• 无法再登录这个账号\n• 问卷数据仅保留匿名形式用于算法改进\n\n这个操作不可逆，确定吗？')) return;

    try {
      const r = await fetch(`${API}/api/profile`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const d = await r.json();
      if (r.ok) {
        setUser(null);
        alert(d.message || '账号已注销');
        navigate('/');
      } else {
        alert(d.error || '注销失败');
      }
    } catch (e) {
      alert('网络错误');
    }
  }

  async function logout() {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    navigate('/');
  }

  async function changePassword(e) {
    e?.preventDefault?.();
    setPwdMsg({ ok: false, text: '' });
    const { current, next, confirm } = pwd;
    if (!current || !next || !confirm) {
      setPwdMsg({ ok: false, text: '请完整填写 3 个密码输入框' });
      return;
    }
    if (next.length < 6) {
      setPwdMsg({ ok: false, text: '新密码至少 6 位' });
      return;
    }
    if (next !== confirm) {
      setPwdMsg({ ok: false, text: '两次输入的新密码不一致，请重新确认' });
      return;
    }
    if (current === next) {
      setPwdMsg({ ok: false, text: '新密码不能与旧密码相同' });
      return;
    }
    setPwdLoading(true);
    try {
      const r = await fetch(`${API}/api/profile/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      const d = await r.json();
      if (r.ok) {
        setPwd({ current: '', next: '', confirm: '' });
        setPwdMsg({ ok: true, text: d.message || '✅ 密码修改成功！' });
        setTimeout(() => setPwdMsg({ ok: false, text: '' }), 3500);
      } else {
        setPwdMsg({ ok: false, text: '❌ ' + (d.error || '修改失败') });
      }
    } catch (_) {
      setPwdMsg({ ok: false, text: '❌ 网络错误，请稍后再试' });
    } finally {
      setPwdLoading(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">加载中...</div>;
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={36} className="text-red-400" />
        <p className="text-gray-600">请先登录</p>
        <Link to="/login" className="text-rose-600 hover:underline">去登录 →</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User size={22} className="text-rose-500" /> 个人资料
          </h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回首页</Link>
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
            {msg.startsWith('✅') ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {msg.replace(/^[✅❌⏸]\s*/, '')}
          </div>
        )}

        {/* 头部卡片 */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-rose-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-rose-100 to-amber-100 rounded-full blur-3xl opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {(profile.name || '?').slice(0, 1)}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{profile.name || '未设置昵称'}</div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Mail size={13} /> {profile.email}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold">
                  🏫 {profile.school || '长沙民政职业技术学院'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  注册于 {String(profile.created_at || '').slice(0, 10)}
                </span>
                {profile.isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                    ⚙️ 管理员
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 资料编辑 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-rose-500" /> 基本信息
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">昵称</span>
              <input
                type="text"
                value={profile.name || ''}
                onChange={e => onChange('name', e.target.value)}
                maxLength={20}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">性别</span>
              <select
                value={profile.gender || ''}
                onChange={e => onChange('gender', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              >
                <option value="">未设置</option>
                <option value="male">👨 男生</option>
                <option value="female">👩 女生</option>
                <option value="other">🎓 其他</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <MessageCircle size={12} /> 微信号
              </span>
              <input
                type="text"
                value={profile.wechat || ''}
                onChange={e => onChange('wechat', e.target.value)}
                placeholder="匹配成功后双方同意才互相可见"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Phone size={12} /> 手机号（选填）
              </span>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={e => onChange('phone', e.target.value)}
                maxLength={11}
                placeholder="11 位手机号"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              disabled={saving}
              onClick={save}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-60 transition shadow-sm hover:shadow-md"
            >
              <Save size={16} /> {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </div>

        {/* 参与匹配开关 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-500" /> 下周匹配设置
          </h3>
          <div className={`flex items-center justify-between p-4 rounded-2xl border
            ${profile.joinNextRound ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <div className="font-semibold text-gray-800 mb-0.5">
                {profile.joinNextRound ? '✅ 你已确认参与下周匹配' : '⏸ 你设置了本周不参与匹配'}
              </div>
              <div className="text-xs text-gray-500">
                {profile.joinNextRound
                  ? '系统会在每周一中午 12:00 自动为你寻找最契合的 TA'
                  : '期末、期中或者只是想休息一下，随时可以跳开。等你准备好了再回来～'}
              </div>
            </div>
            <button
              disabled={joinLoading}
              onClick={toggleJoin}
              className={`relative w-14 h-8 rounded-full transition-all shrink-0
                ${profile.joinNextRound ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all
                ${profile.joinNextRound ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
            <HelpCircle size={12} /> 完成问卷 + 打开此开关 → 才会进入匹配池
          </p>
        </div>

        {/* 修改密码卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <KeyRound size={16} className="text-indigo-500" /> 修改密码
          </h3>
          <form onSubmit={changePassword} className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">当前密码（用于身份验证）</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="输入你现在使用的密码"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                value={pwd.current}
                onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
              />
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">新密码（至少 6 位）</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="设置一个新密码"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                  value={pwd.next}
                  onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">再输入一次新密码</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="和上面保持一致"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                  value={pwd.confirm}
                  onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                />
              </label>
            </div>

            {pwdMsg.text && (
              <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${
                pwdMsg.ok ? 'bg-green-50 border border-green-200 text-green-800'
                         : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {pwdMsg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{pwdMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                💡 密码不会保存在数据库中，系统只会记录一个不可反推的 bcrypt 哈希。
                修改成功后当前会话不会被强制退出，**下次登录记得用新密码**。
              </p>
              <button
                type="submit"
                disabled={pwdLoading}
                className="px-5 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.99] transition-all disabled:opacity-60 inline-flex items-center gap-2 shrink-0"
              >
                <KeyRound size={14} />
                {pwdLoading ? '修改中...' : '确认修改'}
              </button>
            </div>
          </form>
        </div>

        {/* 历史匹配记录卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <History size={16} className="text-amber-500" /> 匹配历史信封
            <span className="ml-auto text-xs text-gray-400 font-normal">
              共 {history.total || 0} 封
            </span>
          </h3>

          {history.loading ? (
            <div className="text-sm text-gray-400 py-6 text-center">正在翻找你的信笺... 📮</div>
          ) : history.items.length === 0 ? (
            <div className="p-6 bg-amber-50/60 rounded-2xl border border-dashed border-amber-200 text-center">
              <div className="text-4xl mb-2">💌</div>
              <div className="font-semibold text-gray-700 mb-1">还没有匹配记录</div>
              <div className="text-xs text-gray-500 mb-3 leading-relaxed">
                完成问卷 + 打开「参与下周匹配」开关后<br />
                系统会在每周一中午 12:00 把信封送过来
              </div>
              <Link
                to="/survey"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition"
              >
                去填问卷 <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {history.items.map((it) => {
                const d = it.createdAt ? new Date(it.createdAt) : null;
                const dateText = d
                  ? `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                  : '# ' + String(it.roundId).slice(0, 8);

                const statusBadge = it.contactStatus.bothApproved
                  ? { cls: 'bg-green-100 text-green-700 border-green-200', txt: '✅ 联系方式已互换', icon: ShieldCheck }
                  : it.contactStatus.selfRequested
                  ? { cls: 'bg-amber-50 text-amber-700 border-amber-200', txt: '⏳ 等待对方同意', icon: Heart }
                  : { cls: 'bg-gray-50 text-gray-500 border-gray-200', txt: '✉ 未发起交换', icon: Mail };
                const StatusIcon = statusBadge.icon;

                const genderEmoji = it.partner?.gender === 'female' ? '👩'
                                  : it.partner?.gender === 'male' ? '👨' : '🎓';

                return (
                  <div
                    key={it.matchId}
                    className="border border-gray-100 rounded-2xl p-4 hover:shadow-sm hover:border-amber-200 transition-all cursor-pointer"
                    onClick={() => navigate('/match')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {(it.partner?.name || '同学').slice(0, 1)}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                            {genderEmoji} {it.partner?.name || '神秘的TA'}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <CalendarDays size={11} /> {dateText}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent leading-none">
                          {it.score}%
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">匹配度</div>
                      </div>
                    </div>
                    {it.headline && (
                      <div className="text-xs text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1 inline-block mb-2 border border-rose-100">
                        {it.headline}
                      </div>
                    )}
                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${statusBadge.cls}`}>
                      <StatusIcon size={12} /> {statusBadge.txt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 危险操作区 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> 危险操作
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
            >
              <LogOut size={18} /> <span className="font-semibold">退出登录</span>
            </button>
            <button
              onClick={deactivate}
              className="flex items-center justify-center gap-2 p-4 border border-red-200 rounded-xl text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 size={18} /> <span className="font-semibold">注销账号（匿名化删除）</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
