import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSprintPlanning, submitSprintPlanning, type SprintPlanning } from '../api/endpoints';

interface SprintPlanningPanelProps {
  sprintId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SprintPlanningPanel({ sprintId, isOpen, onClose }: SprintPlanningPanelProps) {
  const [planning, setPlanning] = useState<SprintPlanning | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    
    (async () => {
      try {
        const res = await getSprintPlanning(sprintId);
        setPlanning(res.planning);
        setContent(res.planning?.content ?? '');
      } catch (err) {
        setError('Не удалось загрузить план спринта');
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
      const res = await submitSprintPlanning(sprintId, content);
      setPlanning(res.planning);
      setContent(res.planning.content);
    } catch (err) {
      setError('Не удалось сохранить план спринта');
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
          <h2 className="text-xl font-semibold text-slate-100">📋 План спринта</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && <div className="p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <div className="text-center text-slate-400">Загрузка...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Содержание плана спринта</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Опишите цели и план спринта..."
                  className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none h-48 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить план'}
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

          {planning && (
            <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">Последнее обновление:</div>
              <Link
                to={`/app/profile/${planning.creator?.id}`}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition inline-block"
              >
                {planning.creator?.name}
              </Link>
              <div className="text-xs text-slate-500">{new Date(planning.createdAt).toLocaleString('ru-RU')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
