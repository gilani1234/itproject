import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/endpoints';
import { setStoredUser, setToken } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      setToken(res.token);
      setStoredUser(res.user);
      navigate('/app');
    } catch (e) {
      setError('Не удалось войти. Проверь email/пароль.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <div className="mb-6">
          <div className="text-2xl font-bold">Вход</div>
          <div className="mt-1 text-sm text-slate-400">IT Leadership Lab • Виртуальная IT-компания</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>

          {error ? <div className="rounded-xl bg-rose-900/30 p-3 text-sm text-rose-200">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Входим…' : 'Войти'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800"
          >
            Создать аккаунт
          </button>
        </form>
      </div>
    </div>
  );
}

