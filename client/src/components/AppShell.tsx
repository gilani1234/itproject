import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth, getStoredUser } from '../lib/auth';

const navItems = [
  { to: '/app', label: 'Дашборд' },
  { to: '/app/teams', label: 'Команды' },
  { to: '/app/kanban', label: 'Kanban' },
  { to: '/app/chat', label: 'Чат' },
  { to: '/app/analytics', label: 'Аналитика' },
  { to: '/app/profile', label: 'Профиль' },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = getStoredUser();

  return (
    <div className="h-full bg-slate-950 text-slate-100">
      <div className="flex h-full">
        <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl">🏢</div>
              <div>
                <div className="text-lg font-bold tracking-tight">IT Leadership Lab</div>
                <div className="text-xs text-slate-400">Виртуальная IT-компания</div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="rounded-xl bg-slate-900 px-4 py-3">
              <div className="text-xs text-slate-400">Роль</div>
              <div className="text-sm font-medium">{user?.role === 'TEACHER' ? 'Преподаватель' : 'Студент'}</div>
            </div>
          </div>

          <nav className="px-3 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  [
                    'block rounded-xl px-5 py-3 text-sm transition',
                    isActive ? 'bg-slate-800 text-emerald-300' : 'text-slate-200 hover:bg-slate-900',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-800 p-5">
            <button
              onClick={() => {
                clearAuth();
                navigate('/login');
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
            >
              Выйти
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
            <div className="text-lg font-semibold">Virtual IT Company</div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">👤</div>
              <div className="leading-tight">
                <div className="text-sm font-medium">{user?.name ?? 'Пользователь'}</div>
                <div className="text-xs text-slate-400">{user?.email ?? ''}</div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

