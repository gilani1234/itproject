import { useEffect, useState } from 'react';
import { getUserRating, type SprintRating, updateProfile, uploadAvatar } from '../api/endpoints';
import { getStoredUser, setStoredUser, getAvatarUrl } from '../lib/auth';

export function ProfilePage() {
  const user = getStoredUser();
  const [rating, setRating] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [ratings, setRatings] = useState<SprintRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [editName, setEditName] = useState(user?.name ?? '');
  const [editBio, setEditBio] = useState(user?.bio ?? '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar ?? '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setEditAvatar(url);
    setAvatarFile(null);
    setAvatarPreview(url || '');
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setEditAvatar('');
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSubmitting(true);
      setError(null);

      let avatarPath: string | null = editAvatar || null;

      if (avatarFile) {
        const res = await uploadAvatar(avatarFile);
        avatarPath = res.avatar;
      }

      const res = await updateProfile(editName || undefined, avatarPath, editBio || null);
      setStoredUser(res.user);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? '?';

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-800">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-7xl shadow-lg overflow-hidden">
            {avatarPreview ? (
              <img src={getAvatarUrl(avatarPreview)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="flex-1">
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Имя</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">О себе</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Расскажите о себе..."
                    maxLength={500}
                    className="h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-400">{editBio.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Аватар</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleAvatarFileChange}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">или укажите URL:</div>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={handleAvatarChange}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none mt-1"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {submitting ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 transition"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold">{user?.name ?? 'Пользователь'}</h2>
                <p className="mt-1 text-lg text-emerald-300">{user?.role === 'TEACHER' ? 'Преподаватель' : 'Студент'}</p>
                {user?.bio && <p className="mt-3 text-slate-300">{user.bio}</p>}

                <button
                  onClick={() => setEditMode(true)}
                  className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
                >
                  Редактировать профиль
                </button>

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
              </>
            )}
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800">{error}</div>}

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

      {loading && <p className="text-slate-400">Загрузка...</p>}
    </div>
  );
}