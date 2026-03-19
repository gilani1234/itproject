import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentProfile, type StudentProfileDetail } from '../api/endpoints';
import { getAvatarUrl } from '../lib/auth';

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<StudentProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    (async () => {
      try {
        setLoading(true);
        const res = await getStudentProfile(userId);
        setUser(res.user);
      } catch (err) {
        setError('Не удалось загрузить профиль');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-400">Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
        >
          ← Назад
        </button>
        <div className="rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
          <p className="text-slate-400">⚠️ Профиль не найден</p>
        </div>
      </div>
    );
  }

  // Get initials for placeholder avatar
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? '?';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
      >
        ← Назад
      </button>

      {/* Profile Card */}
      <div className="rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Avatar */}
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-7xl shadow-lg overflow-hidden flex-shrink-0">
            {user.avatar ? (
              <img src={getAvatarUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{user.name}</h2>
            <p className="mt-1 text-lg text-emerald-300">Студент</p>
            
            {user.bio && (
              <p className="mt-3 text-slate-300 leading-relaxed">{user.bio}</p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Email</div>
                <div className="mt-2 break-words font-medium text-xs">{user.email}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Рейтинг</div>
                <div className="mt-2 text-3xl font-bold text-emerald-400">{user.rating}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                <div className="text-slate-400">Общо баллов</div>
                <div className="mt-2 text-3xl font-bold text-yellow-400">{user.totalPoints}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800">
          {error}
        </div>
      )}

      {/* Ratings History */}
      {user.ratings && user.ratings.length > 0 && (
        <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
          <h3 className="mb-6 text-xl font-semibold">История оценок</h3>
          <div className="space-y-3">
            {user.ratings.map((r, idx) => (
              <div key={idx} className="flex items-start justify-between rounded-lg bg-slate-950 p-4 ring-1 ring-slate-800">
                <div>
                  <p className="font-medium text-slate-100">{r.sprint?.name ?? 'Спринт'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">{r.points}</p>
                  <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
