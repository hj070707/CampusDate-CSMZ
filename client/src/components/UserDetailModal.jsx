import { useEffect, useState } from 'react';
import { API } from '../App';

export default function UserDetailModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/users/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8">加载中...</div>
    </div>
  );

  const { user, survey, matches } = data;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold">用户详情</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">基本信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">ID:</span> {user.id}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">邮箱:</span> {user.email}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">昵称:</span> {user.name || '-'}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">性别:</span> {user.gender || '-'}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">注册时间:</span> {new Date(user.created_at).toLocaleString()}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500">角色:</span> 
                <span className={user.is_admin ? 'text-purple-600 font-medium' : ''}>
                  {user.is_admin ? '管理员' : '普通用户'}
                </span>
              </div>
            </div>
          </div>

          {/* 问卷维度得分 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">问卷维度得分</h3>
            {survey.completed ? (
              <div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {Object.entries(survey.dimensionScores).map(([dim, score]) => (
                    <div key={dim} className="text-center bg-rose-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-rose-600">{score}</div>
                      <div className="text-xs text-gray-500 capitalize">{dim}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">完成时间: {new Date(survey.surveyTime).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">该用户尚未完成问卷</p>
            )}
          </div>

          {/* 匹配历史 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">匹配历史</h3>
            {matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map(m => (
                  <div key={m.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-sm">
                    <span>匹配对象: {m.partner_name || '匿名'} ({m.partner_gender})</span>
                    <span className="text-rose-600 font-bold">匹配度: {m.score?.toFixed(1) || '-'}%</span>
                    <span className="text-gray-400 text-xs">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">暂无匹配记录</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={async () => {
                await fetch(`${API}/api/admin/users/${userId}/set-admin`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ isAdmin: !user.is_admin })
                });
                window.location.reload();
              }}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
            >
              {user.is_admin ? '取消管理员' : '设为管理员'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
