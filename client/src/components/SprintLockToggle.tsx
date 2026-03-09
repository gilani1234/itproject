import { useState } from 'react';
import { lockSprint, getSprintAuditLogs, type AuditLog } from '../api/endpoints';

interface SprintLockToggleProps {
  sprintId: string;
  isLocked?: boolean;
  isTeacher?: boolean;
  onLockChange?: (isLocked: boolean) => void;
  onShowAuditLogs?: (logs: AuditLog[]) => void;
}

export function SprintLockToggle({
  sprintId,
  isLocked = false,
  isTeacher = false,
  onLockChange,
  onShowAuditLogs,
}: SprintLockToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLockToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      await lockSprint(sprintId, !isLocked);
      onLockChange?.(!isLocked);
    } catch (err) {
      setError('Не удалось изменить статус блокировки.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getSprintAuditLogs(sprintId);
      onShowAuditLogs?.(res.auditLogs);
    } catch (err) {
      setError('Не удалось загрузить логи.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isTeacher && (
        <>
          <button
            onClick={handleLockToggle}
            disabled={loading}
            className={`rounded px-2 py-1 text-xs transition ${
              isLocked
                ? 'bg-red-700 text-white hover:bg-red-600'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-50`}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
          <button
            onClick={handleShowLogs}
            disabled={loading}
            className="rounded px-2 py-1 text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition disabled:opacity-50"
          >
            📋
          </button>
        </>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
