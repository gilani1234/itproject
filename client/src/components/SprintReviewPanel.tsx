import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSprintReview, submitSprintReview, type SprintReview } from '../api/endpoints';

interface SprintReviewPanelProps {
  sprintId: string;
  isOpen: boolean;
  onClose: () => void;
  isTeacher?: boolean;
}

export function SprintReviewPanel({ sprintId, isOpen, onClose, isTeacher = false }: SprintReviewPanelProps) {
  const [review, setReview] = useState<SprintReview | null>(null);
  const [summary, setSummary] = useState('');
  const [completed, setCompleted] = useState('0');
  const [notCompleted, setNotCompleted] = useState('0');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getSprintReview(sprintId);
        setReview(res.review);
        if (res.review) {
          setSummary(res.review.summary);
          setCompleted(String(res.review.completed));
          setNotCompleted(String(res.review.notCompleted));
        }
      } catch (err) {
        setError('Не удалось загрузить обзор спринта');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sprintId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitSprintReview(sprintId, summary, parseInt(completed) || 0, parseInt(notCompleted) || 0);
      setReview(res.review);
    } catch (err) {
      setError('Не удалось сохранить обзор спринта');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl ring-1 ring-slate-700 overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between">
          <h2 className="text-xl font-semibold text-slate-100">✅ Обзор спринта</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && <div className="p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <div className="text-center text-slate-400">Загрузка...</div>
          ) : !isTeacher ? (
            <div className="p-4 bg-slate-800 rounded-lg text-slate-300 text-sm">
              📋 Обзор спринта может заполнить только преподаватель. Вы можете просмотреть результат ниже.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Итоговый отчёт спринта</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Опишите результаты спринта, выполненные задачи, проблемы..."
                  className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none h-32 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Выполнено задач</label>
                  <input
                    type="number"
                    value={completed}
                    onChange={(e) => setCompleted(e.target.value)}
                    min="0"
                    className="w-full bg-slate-800 text-slate-100 rounded-lg px-4 py-2 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Не выполнено</label>
                  <input
                    type="number"
                    value={notCompleted}
                    onChange={(e) => setNotCompleted(e.target.value)}
                    min="0"
                    className="w-full bg-slate-800 text-slate-100 rounded-lg px-4 py-2 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить обзор'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition"
                >
                  Закрыть
                </button>
              </div>
            </form>
          )}

          {review && (
            <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-sm font-medium text-slate-200 mb-3">Результаты спринта:</div>
              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                <div className="bg-slate-900 p-3 rounded">
                  <div className="text-xs text-slate-400">Выполнено</div>
                  <div className="text-2xl font-bold text-emerald-400">{review.completed}</div>
                </div>
                <div className="bg-slate-900 p-3 rounded">
                  <div className="text-xs text-slate-400">Не выполнено</div>
                  <div className="text-2xl font-bold text-orange-400">{review.notCompleted}</div>
                </div>
              </div>
              <div className="text-xs text-slate-400">
                <Link
                  to={`/app/profile/${review.creator?.id}`}
                  className="text-emerald-400 hover:text-emerald-300 transition"
                >
                  {review.creator?.name}
                </Link>
                {' '} • {new Date(review.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
