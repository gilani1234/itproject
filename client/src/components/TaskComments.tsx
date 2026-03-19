import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listComments, addComment, type TaskComment } from '../api/endpoints';

interface TaskCommentsProps {
  taskId: string;
  isLocked: boolean;
  isTeacher: boolean;
}

export function TaskComments({ taskId, isLocked, isTeacher }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listComments(taskId);
      setComments(res.comments);
    } catch (err) {
      setError('Не удалось загрузить комментарии');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await addComment(taskId, newComment);
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
    } catch (err) {
      setError('Не удалось добавить комментарий');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="border-t border-slate-800 pt-4">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Комментарии ({comments.length})</h3>

      {error && <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">{error}</div>}

      {/* Comments list */}
      <div className="mb-4 space-y-3 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="text-center text-slate-400 text-sm py-4">Загрузка...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-4">Комментариев нет</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-800 rounded-lg p-3 hover:bg-slate-750 transition">
              <div className="flex items-start justify-between mb-2">
                <Link
                  to={`/app/profile/${comment.userId}`}
                  className="flex items-center gap-2 hover:opacity-80 transition"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-xs">
                    {comment.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-400">{comment.user?.name}</div>
                    <div className="text-xs text-slate-500">{formatDate(comment.createdAt)}</div>
                  </div>
                </Link>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Comment form */}
      {!isLocked || isTeacher ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Добавить комментарий..."
            disabled={submitting}
            className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 resize-none h-20"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition text-sm"
          >
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      ) : (
        <div className="text-center text-slate-500 text-sm py-4">Задача заблокирована</div>
      )}
    </div>
  );
}
