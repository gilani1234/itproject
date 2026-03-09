import { useEffect, useState } from 'react';
import { getUserRating, type SprintRating } from '../api/endpoints';
import { getStoredUser } from '../lib/auth';

export function ProfilePage() {
  const user = getStoredUser();
  const [rating, setRating] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [ratings, setRatings] = useState<SprintRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await getUserRating(user.id);
        setRating(res.user.rating);
        setTotalPoints(res.user.totalPoints);
        setRatings(res.ratings);
      } catch {
        setError('Не удалось загрузить рейтинг.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-7xl shadow-lg">
            👨‍💻
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{user?.name ?? 'Пользователь'}</h2>
            <p className="mt-1 text-lg text-emerald-300">
              {user?.role === 'TEACHER' ? 'Преподаватель' : 'Студент'}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Email</div>
                <div className="mt-2 break-words font-medium">{user?.email ?? '—'}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Рейтинг</div>
                <div className="mt-2 text-3xl font-bold text-emerald-400">{rating}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Общо баллов</div>
                <div className="mt-2 text-3xl font-bold text-yellow-400">{totalPoints}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Оценок получено</div>
                <div className="mt-2 text-3xl font-bold text-slate-300">{ratings.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800">{error}</div>
      )}

      {/* Ratings History */}
      {!loading && (
        <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
          <h3 className="mb-6 text-xl font-semibold">История оценок</h3>
          {ratings.length === 0 ? (
            <p className="text-sm text-slate-400">Нет оценок</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="flex items-start justify-between rounded-lg bg-slate-950 p-4 ring-1 ring-slate-800">
                  <div>
                    <p className="font-medium text-slate-100">{r.sprint?.name ?? 'Спринт'}</p>
                    {r.feedback && <p className="mt-1 text-sm text-slate-400">{r.feedback}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">{r.points}</p>
                    <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <p className="text-slate-400">Загрузка…</p>}
    </div>
  );
}

