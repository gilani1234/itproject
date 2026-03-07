import { getStoredUser } from '../lib/auth';

export function ProfilePage() {
  const user = getStoredUser();

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-7xl shadow-lg">
            👨‍💻
          </div>
          <div className="flex-1">
            <div className="text-3xl font-bold">{user?.name ?? 'Пользователь'}</div>
            <div className="mt-1 text-lg text-emerald-300">
              {user?.role === 'TEACHER' ? 'Преподаватель' : 'Студент'}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Email</div>
                <div className="mt-1 font-medium">{user?.email ?? '—'}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Рейтинг</div>
                <div className="mt-1 text-2xl font-bold text-emerald-400">87</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Выполнено задач</div>
                <div className="mt-1 font-medium">42</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Просрочек</div>
                <div className="mt-1 font-medium text-orange-300">3</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

