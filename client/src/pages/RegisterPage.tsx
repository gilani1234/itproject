import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api/endpoints';
import { setStoredUser, setToken } from '../lib/auth';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = { name, email, password, role };
      if (role === 'TEACHER') {
        payload.inviteCode = inviteCode;
      }
      const res = await register(payload);
      setToken(res.token);
      setStoredUser(res.user);
      navigate('/app');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Не удалось зарегистрироваться';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <div className="mb-6">
          <div className="text-2xl font-bold">Регистрация</div>
          <div className="mt-1 text-sm text-slate-400">
            {role === 'STUDENT' ? 'Аккаунт студента' : 'Аккаунт преподавателя'}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="text-xs text-slate-400 block mb-2">Тип аккаунта</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="STUDENT"
                  checked={role === 'STUDENT'}
                  onChange={() => setRole('STUDENT')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Студент</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="TEACHER"
                  checked={role === 'TEACHER'}
                  onChange={() => setRole('TEACHER')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Преподаватель</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
              placeholder="Алексей Иванов"
            />
          </div>

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
              placeholder="минимум 6 символов"
            />
          </div>

          {role === 'TEACHER' && (
            <div>
              <label className="text-xs text-slate-400">Код приглашения</label>
              <input
                type="password"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
                placeholder="Введите код для регистрации преподавателя"
              />
            </div>
          )}

          {error ? <div className="rounded-xl bg-rose-900/30 p-3 text-sm text-rose-200">{error}</div> : null}

          <button
            disabled={loading || (role === 'TEACHER' && !inviteCode)}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Создаём…' : 'Создать аккаунт'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800"
          >
            У меня уже есть аккаунт
          </button>
        </form>
      </div>
    </div>
  );
}

