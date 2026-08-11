import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (localStorage.getItem('pigmarket-admin-token')) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', form);
      localStorage.setItem('pigmarket-admin-token', response.data.token);
      setMessage('Logged in successfully. Redirecting...');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err.message || 'Login failed.';
      setMessage(`Login failed: ${errorMessage}`);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
      <p className="mt-2 text-slate-600">Enter your credentials to manage the shop.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm text-slate-700">
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
        </label>
        <label className="block text-sm text-slate-700">
          Password
          <input type="password" name="password" value={form.password} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
        </label>
        <button type="submit" className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-white hover:bg-rose-700">Login</button>
      </form>
      {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
