import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../App';

export default function QuestionManage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    category: 'values',
    content: '',
    options: [{ text: '', score: 3, dimension: 'values' }],
    type: 'single',
    weight: 1.0,
    order_num: 0
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = () => {
    fetch(`${API}/api/admin/questions`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setQuestions(data.questions || []);
        setLoading(false);
      });
  };

  const handleSave = async () => {
    const url = editing 
      ? `${API}/api/admin/questions/${editing}`
      : `${API}/api/admin/questions`;
    const method = editing ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form)
    });
    
    if (res.ok) {
      setEditing(null);
      setForm({
        category: 'values',
        content: '',
        options: [{ text: '', score: 3, dimension: 'values' }],
        type: 'single',
        weight: 1.0,
        order_num: 0
      });
      fetchQuestions();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这道题？')) return;
    await fetch(`${API}/api/admin/questions/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    fetchQuestions();
  };

  const addOption = () => {
    setForm(prev => ({
      ...prev,
      options: [...prev.options, { text: '', score: 3, dimension: prev.category }]
    }));
  };

  if (loading) return <div className="p-10 text-center">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">问卷题目管理</h1>
        <Link to="/admin" className="text-rose-600 hover:underline text-sm">← 返回管理后台</Link>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* 添加/编辑表单 */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
          <h3 className="font-bold mb-4">{editing ? '编辑题目' : '添加新题目'}</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <select 
              className="border rounded-lg px-3 py-2"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
            >
              <option value="values">价值观</option>
              <option value="personality">性格</option>
              <option value="lifestyle">生活方式</option>
              <option value="communication">沟通</option>
              <option value="future">未来规划</option>
            </select>
            
            <input
              type="number"
              placeholder="权重"
              className="border rounded-lg px-3 py-2"
              value={form.weight}
              onChange={e => setForm({...form, weight: parseFloat(e.target.value)})}
              step="0.1"
            />
          </div>

          <textarea
            placeholder="题目内容"
            className="w-full border rounded-lg px-3 py-2 mb-4"
            rows="2"
            value={form.content}
            onChange={e => setForm({...form, content: e.target.value})}
          />

          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-500">选项设置：</p>
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  placeholder="选项文字"
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={opt.text}
                  onChange={e => {
                    const newOpts = [...form.options];
                    newOpts[idx].text = e.target.value;
                    setForm({...form, options: newOpts});
                  }}
                />
                <input
                  type="number"
                  placeholder="得分"
                  className="w-20 border rounded-lg px-3 py-2"
                  value={opt.score}
                  onChange={e => {
                    const newOpts = [...form.options];
                    newOpts[idx].score = parseInt(e.target.value);
                    setForm({...form, options: newOpts});
                  }}
                  min="1"
                  max="5"
                />
                <select
                  className="w-32 border rounded-lg px-3 py-2"
                  value={opt.dimension}
                  onChange={e => {
                    const newOpts = [...form.options];
                    newOpts[idx].dimension = e.target.value;
                    setForm({...form, options: newOpts});
                  }}
                >
                  <option value="values">价值观</option>
                  <option value="personality">性格</option>
                  <option value="lifestyle">生活方式</option>
                  <option value="communication">沟通</option>
                  <option value="future">未来规划</option>
                </select>
              </div>
            ))}
            <button onClick={addOption} className="text-sm text-rose-600 hover:underline">+ 添加选项</button>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-rose-500 text-white px-6 py-2 rounded-lg hover:bg-rose-600">
              {editing ? '保存修改' : '添加题目'}
            </button>
            {editing && (
              <button onClick={() => {setEditing(null); setForm({category:'values',content:'',options:[{text:'',score:3,dimension:'values'}],type:'single',weight:1,order_num:0})}} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
                取消
              </button>
            )}
          </div>
        </div>

        {/* 题目列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold">现有题目（{questions.length} 道）</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">维度</th>
                <th className="px-4 py-3">题目</th>
                <th className="px-4 py-3">选项</th>
                <th className="px-4 py-3">权重</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">{q.id}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{q.category}</span></td>
                  <td className="px-4 py-3 max-w-xs truncate">{q.content}</td>
                  <td className="px-4 py-3 text-gray-500">{q.options.length} 个选项</td>
                  <td className="px-4 py-3">{q.weight}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => {setEditing(q.id); setForm({...q, options: [...q.options]})}} className="text-blue-600 hover:underline mr-3">编辑</button>
                    <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
