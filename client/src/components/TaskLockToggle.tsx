import { useState } from 'react';
import { lockTask, deleteTask } from '../api/endpoints';

interface TaskLockToggleProps {
  taskId: string;
  isLocked?: boolean;
  isTeacher?: boolean;
  onLockChange?: (isLocked: boolean) => void;
  onDelete?: () => void;
}

export function TaskLockToggle({
  taskId,
  isLocked = false,
  isTeacher = false,
  onLockChange,
  onDelete,
}: TaskLockToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isTeacher) return null;

  const handleLockToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      await lockTask(taskId, !isLocked);
      onLockChange?.(!isLocked);
    } catch (err) {
      setError('Не удалось изменить статус блокировки.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;

    setLoading(true);
    setError(null);

    try {
      await deleteTask(taskId);
      onDelete?.();
    } catch (err) {
      setError('Не удалось удалить задачу.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLockToggle}
        disabled={loading}
        className={`rounded px-3 py-1 text-sm transition ${
          isLocked
            ? 'bg-red-700 text-white hover:bg-red-600'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        } disabled:opacity-50`}
      >
        {isLocked ? '🔒 Заблокирована' : '🔓 Разблокирована'}
      </button>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded px-3 py-1 text-sm bg-slate-700 text-red-400 hover:bg-slate-600 transition disabled:opacity-50"
      >
        🗑 Удалить
      </button>

      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
