import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Survey from './pages/Survey';
import MatchResult from './pages/MatchResult';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import QuestionManage from './pages/QuestionsManage';

export const API = import.meta.env?.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500">加载中...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route path="/survey" element={user ? <Survey /> : <Navigate to="/login" />} />
        <Route path="/match" element={user ? <MatchResult /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
        <Route path="/admin/questions" element={user?.isAdmin ? <QuestionManage /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
