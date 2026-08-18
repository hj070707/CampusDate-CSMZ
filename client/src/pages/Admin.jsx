import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserDetailModal from '../components/UserDetailModal';
import { API } from '../App';
import {
  Users, FileCheck2, HeartHandshake, CalendarCheck,
  PlayCircle, BarChart3, ListChecks, Shield, Crown,
  AlertCircle, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

const CATEGORY_LABELS = {
  values: '价值观',
  personality: '性格特质',
  lifestyle: '生活方式',
  communication: '情感沟通',
  future: '未来规划'
};

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [matchRunning, setMatchRunning] = useState(false);
  const [lastMatchResult, setLastMatchResult] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchUsers(1);
  }, []);

  const fetchStats = () => {
    fetch(`${API}/api/admin/stats`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setStats(data))
      .catch(() => setMsg({ type: 'err', text: '统计加载失败，请确认管理员权限' }));
  };

  const fetchUsers = (p) => {
    fetch(`${API}/api/admin/users?page=${p}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setUsers(data.users || []);
        setPage(data.page);
        setTotalPages(data.totalPages || 1);
      });
  };

  const triggerMatch = async () => {
    setMatchRunning(true);
    setMsg({ type: '', text: '' });
    setLastMatchResult(null);
    try {
      const res = await fetch(`${API}/api/admin/trigger-match`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setLastMatchResult(data);
        setMsg({ type: 'ok', text: data.message });
        fetchStats(); // 刷新统计
      } else {
        setMsg({ type: 'err', text: data.error || '匹配失败' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: '网络错误' });
    } finally {
      setMatchRunning(false);
      setTimeout(() => setMsg(m => (m.type === 'ok' ? { ...m, text: '' } : m)), 8000);
    }
  };

  if (!stats) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 bg-gray-50">
      <RefreshCw className="animate-spin mr-2" size={18} /> 加载中...
    </div>
  );

  const statCards = [
    {
      title: '总用户数', value: stats.totalUsers,
      sub: `今日新增 +${stats.todayUsers}`,
      icon: Users, color: 'from-sky-500 to-blue-500', bg: 'bg-sky-50 border-sky-100'
    },
    {
      title: '问卷完成', value: `${stats.surveyCompleted}人`,
      sub: `完成率 ${stats.surveyRate}%`,
      icon: FileCheck2, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 border-emerald-100'
    },
    {
      title: '下周参与匹配', value: `${stats.joinNextRoundCount || 0}人`,
      sub: `参与率 ${stats.joinRate ?? 0}%`,
      icon: CalendarCheck, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 border-amber-100'
    },
    {
      title: '累计成功配对', value: `${stats.totalMatchedPairs || 0} 对`,
      sub: `${stats.totalRounds || 0} 轮匹配，覆盖 ${stats.totalMatchedUsers || 0} 位同学`,
      icon: HeartHandshake, color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50 border-rose-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20 backdrop-blur bg-white/90">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-sm">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-800 leading-tight">
              CSMZ 民政学院 · 校园匹配平台 <span className="text-xs text-rose-500 ml-1 align-middle">ADMIN</span>
            </h1>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              每周一 12:00 自动开信封 · 运营后台 v0.2
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/questions"
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition"
          >
            <ListChecks size={14} /> 题目管理
          </Link>
          <Link to="/" className="text-sm text-rose-600 hover:underline px-3">返回首页</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* ===== 统计卡片 ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div key={i} className={`rounded-2xl p-5 shadow-sm border ${s.bg} relative overflow-hidden`}>
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br"
                style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
              <div className="flex items-start justify-between mb-3 relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-sm`}>
                  <s.icon size={18} />
                </div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
              <div className="text-xs text-gray-500 mb-1">{s.title}</div>
              <div className="text-3xl font-black text-gray-800 leading-none">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ===== 操作区 ===== */}
        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          {/* 匹配管理 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PlayCircle size={18} className="text-rose-500" /> 匹配管理
              </h3>
              <span className="text-xs text-gray-400">Cron: 每周一 12:00 自动开信封</span>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-5 mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-800 mb-1">🏮 手动开信封</div>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                    立即对「完成问卷 + 参与下周匹配」的异性用户执行一次匹配。
                    近 3 轮已互相匹配过的组合会自动跳过，结果会写入新轮次。
                  </p>
                </div>
                <button
                  onClick={triggerMatch}
                  disabled={matchRunning}
                  className={`shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all
                    ${matchRunning
                      ? 'bg-gray-300 cursor-wait'
                      : 'bg-gradient-to-r from-rose-500 to-amber-500 hover:shadow-lg hover:shadow-rose-200 active:scale-[0.99]'
                    }`}
                >
                  {matchRunning
                    ? <><RefreshCw className="animate-spin" size={16} /> 匹配中...</>
                    : <><PlayCircle size={17} /> 立即执行一次匹配</>}
                </button>
              </div>

              {msg.text && (
                <div className={`mt-4 p-3 rounded-xl text-sm flex items-start gap-2 ${
                  msg.type === 'ok'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                </div>
              )}

              {lastMatchResult?.pairs?.length > 0 && (
                <div className="mt-4 border-t border-rose-100 pt-4">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <BarChart3 size={12} /> 本轮配对明细（共 {lastMatchResult.matched} 对）
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {lastMatchResult.pairs.map((p, idx) => (
                      <div key={idx} className="bg-white/80 rounded-xl px-3 py-2 text-sm flex items-center justify-between border border-rose-50">
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-rose-500 font-bold">{p.userA}</span>
                          <span className="text-gray-400">×</span>
                          <span className="text-amber-600 font-bold">{p.userB}</span>
                        </div>
                        <span className="text-sm font-extrabold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                          {p.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 快捷入口 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ListChecks size={18} className="text-blue-500" /> 快捷入口
            </h3>
            <div className="space-y-2">
              <Link
                to="/admin/questions"
                className="block p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition"
              >
                <div className="font-semibold text-blue-700 text-sm flex items-center gap-1.5">
                  <ListChecks size={14} /> 题库管理
                </div>
                <div className="text-xs text-blue-500/80 mt-0.5">
                  增删改 5 大类 25 道题目，调整权重和排序
                </div>
              </Link>
              <button
                onClick={fetchStats}
                className="w-full text-left p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition"
              >
                <div className="font-semibold text-gray-700 text-sm flex items-center gap-1.5">
                  <RefreshCw size={14} /> 刷新统计
                </div>
                <div className="text-xs text-gray-500 mt-0.5">重新拉取最新指标</div>
              </button>
            </div>
          </div>
        </div>

        {/* ===== 用户列表 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Users size={18} className="text-indigo-500" /> 用户列表
              <span className="text-xs text-gray-400 font-normal ml-1">点击行查看详情</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[820px]">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">邮箱</th>
                  <th className="px-6 py-3">昵称</th>
                  <th className="px-6 py-3">性别</th>
                  <th className="px-6 py-3">问卷</th>
                  <th className="px-6 py-3">参与下周</th>
                  <th className="px-6 py-3">角色</th>
                  <th className="px-6 py-3">注册时间</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">暂无用户</td></tr>
                ) : (
                  users.map(u => {
                    const deactivated = !!u.deactivated_at;
                    return (
                      <tr
                        key={u.id}
                        className={`border-t border-gray-50 cursor-pointer transition ${
                          deactivated ? 'opacity-40 line-through' : 'hover:bg-rose-50'
                        }`}
                        onClick={() => !deactivated && setSelectedUser(u.id)}
                      >
                        <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">#{u.id}</td>
                        <td className="px-6 py-3.5 text-gray-700">{u.email}</td>
                        <td className="px-6 py-3.5 text-gray-800 font-medium">
                          {u.name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          <GenderTag gender={u.gender} />
                        </td>
                        <td className="px-6 py-3.5">
                          {u.survey_done === 1
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <FileCheck2 size={11} /> 已完成
                              </span>
                            : <span className="text-xs text-gray-400">未填</span>}
                        </td>
                        <td className="px-6 py-3.5">
                          {u.join_next_round === 1 || u.join_next_round === null
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700 border border-rose-200">
                                <CalendarCheck size={11} /> 参与
                              </span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">
                                暂停
                              </span>}
                        </td>
                        <td className="px-6 py-3.5">
                          {u.is_admin
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 border border-purple-200 font-medium">
                                <Crown size={11} /> 管理员
                              </span>
                            : <span className="text-xs text-gray-500">用户</span>}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500 font-mono">
                          {new Date(u.created_at).toLocaleString('zh-CN', { hour12: false })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end items-center">
              <button
                onClick={() => setPage(p => { const np = Math.max(1, p - 1); fetchUsers(np); return np; })}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchUsers(p)}
                  className={`min-w-[32px] px-3 py-1.5 rounded-lg text-sm ${
                    page === p ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => { const np = Math.min(totalPages, p + 1); fetchUsers(np); return np; })}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          © CSMZ 民政学院 · 校园匹配平台 · 管理后台 v0.2
        </div>
      </div>

      {/* 用户详情弹窗 */}
      {selectedUser && (
        <UserDetailModal
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={() => { fetchUsers(page); fetchStats(); }}
        />
      )}
    </div>
  );
}

function GenderTag({ gender }) {
  if (gender === 'male') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
      👨 男
    </span>
  );
  if (gender === 'female') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-pink-100 text-pink-700 border border-pink-200">
      👩 女
    </span>
  );
  return <span className="text-xs text-gray-400">—</span>;
}
