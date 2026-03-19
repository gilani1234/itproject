import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRetrospective, submitRetrospective, type Retrospective } from '../api/endpoints';

interface RetrospectivePanelProps {
  sprintId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RetrospectivePanel({ sprintId, isOpen, onClose }: RetrospectivePanelProps) {
  const [retro, setRetro] = useState<Retrospective | null>(null);
  const [whatWent, setWhatWent] = useState('');
  const [whatFailed, setWhatFailed] = useState('');
  const [improvements, setImprovements] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getRetrospective(sprintId);
        setRetro(res.retro);
        if (res.retro) {
          setWhatWent(res.retro.whatWent ?? '');
          setWhatFailed(res.retro.whatFailed ?? '');
          setImprovements(res.retro.improvements ?? '');
        }
      } catch (err) {
        setError('Не удалось загрузить ретроспективу');
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
      const res = await submitRetrospective(sprintId, whatWent, whatFailed, improvements);
      setRetro(res.retro);
      setWhatWent(res.retro.whatWent ?? '');
      setWhatFailed(res.retro.whatFailed ?? '');
      setImprovements(res.retro.improvements ?? '');
    } catch (err) {
      setError('Не удалось сохранить ретроспективу');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl ring-1 ring-slate-700 overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between">
          <h2 className="text-xl font-semibold text-slate-100">🔍 Ретроспектива спринта</h2>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">✅ Что прошло хорошо?</label>
                <textarea
                  value={whatWent}
                  onChange={(e) => setWhatWent(e.target.value)}
                  placeholder="Опишите, что получилось хорошо, какие успехи..."
                  className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none h-24 resize-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">❌ Что не прошло?</label>
                <textarea
                  value={whatFailed}
                  onChange={(e) => setWhatFailed(e.target.value)}
                  placeholder="Описание сложностей, проблем, блокировок..."
                  className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none h-24 resize-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">📈 На что улучшить?</label>
                <textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="Конкретные предложения по улучшению процесса..."
                  className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-3 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none h-24 resize-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить'}
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

          {retro && (
            <div className="mt-6 space-y-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400">Сохранённая ретроспектива:</div>

              {retro.whatWent && (
                <div className="bg-slate-900 p-3 rounded">
                  <div className="text-sm font-medium text-emerald-400 mb-1">✅ Что прошло хорошо</div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{retro.whatWent}</p>
                </div>
              )}

              {retro.whatFailed && (
                <div className="bg-slate-900 p-3 rounded">
                  <div className="text-sm font-medium text-orange-400 mb-1">❌ Что не прошло</div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{retro.whatFailed}</p>
                </div>
              )}

              {retro.improvements && (
                <div className="bg-slate-900 p-3 rounded">
                  <div className="text-sm font-medium text-cyan-400 mb-1">📈 Улучшения</div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{retro.improvements}</p>
                </div>
              )}

              <div className="text-xs text-slate-500 mt-2">
                <Link
                  to={`/app/profile/${retro.creator?.id}`}
                  className="text-emerald-400 hover:text-emerald-300 transition"
                >
                  {retro.creator?.name}
                </Link>
                {' '} • {new Date(retro.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
