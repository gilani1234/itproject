import { useEffect, useState } from 'react';
import { getLessons, createLesson, listTeams } from '../api/endpoints';
import { getStoredUser } from '../lib/auth';
import type { Lesson, Team } from '../api/endpoints';

export function LessonsPage() {
  const user = getStoredUser();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [lessonsRes, teamsRes] = await Promise.all([getLessons(), listTeams()]);
      setLessons(lessonsRes.lessons);
      setTeams(teamsRes.teams);
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !title.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await createLesson(selectedTeam, title, description || undefined);
      setLessons([...lessons, res.lesson]);
      setTitle('');
      setDescription('');
      setSelectedTeam('');
      setShowForm(false);
    } catch (err) {
      setError('Не удалось создать лекцию');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isTeacher = user?.role === 'TEACHER';
  const groupedLessons = lessons.reduce(
    (acc, lesson) => {
      const teamId = lesson.teamId;
      if (!acc[teamId]) acc[teamId] = [];
      acc[teamId].push(lesson);
      return acc;
    },
    {} as Record<string, Lesson[]>
  );

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">📚 Лекции и материалы</h1>
        {isTeacher && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg font-semibold transition"
          >
            {showForm ? '✕ Отмена' : '+ Новая лекция'}
          </button>
        )}
      </div>

      {error && <div className="p-4 bg-red-900/30 text-red-300 rounded-lg mb-4">{error}</div>}

      {isTeacher && showForm && (
        <form onSubmit={handleCreateLesson} className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Выбрать команду</label>
              {teams.length === 0 ? (
                <div className="p-3 bg-slate-700 text-slate-300 rounded-lg text-sm">
                  📌 Сначала создайте команду в разделе "Команды"
                </div>
              ) : (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                >
                  <option value="">-- Выберите команду --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Название лекции</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название..."
                className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Описание (опционально)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите содержание лекции..."
                className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none h-24 resize-none"
              />
            </div>

            <button
              disabled={submitting || !title.trim() || !selectedTeam || teams.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-lg transition"
            >
              {submitting ? 'Создаём...' : 'Создать лекцию'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-12">загружаем лекции...</div>
      ) : lessons.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          {isTeacher ? 'Нет лекций. Создайте первую!' : 'Лекции еще не добавлены'}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedLessons).map(([teamId, teamLessons]) => {
            const team = teams.find((t) => t.id === teamId);
            return (
              <div key={teamId}>
                <h2 className="text-xl font-bold text-slate-200 mb-4 pb-2 border-b border-slate-800">
                  {team?.name || `Команда ${teamId.substring(0, 8)}`}
                </h2>
                <div className="grid gap-4">
                  {teamLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-100 mb-2">{lesson.title}</h3>
                          {lesson.description && <p className="text-slate-400 text-sm mb-4">{lesson.description}</p>}
                          <div className="flex items-center gap-6 text-sm text-slate-400">
                            <span>📄 {lesson.contents?.length || 0} материалов</span>
                            <span>❓ {lesson.quizzes?.length || 0} тестов</span>
                            {lesson.completed && <span className="text-emerald-400">✅ Пройдена</span>}
                          </div>
                        </div>
                        <a
                          href={`/app/lessons/${lesson.id}`}
                          className="ml-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-semibold transition"
                        >
                          Перейти
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
