import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeamAuditLogs, type AuditLog } from '../api/endpoints';

interface AuditLogPanelProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
}

const actionLabels: Record<string, string> = {
  TASK_CREATE: '✅ Создана задача',
  TASK_UPDATE: '✏️ Обновлена задача',
  TASK_DELETE: '🗑 Удалена задача',
  TASK_LOCK: '🔒 Задача заблокирована',
  TASK_UNLOCK: '🔓 Задача разблокирована',
  SPRINT_CREATE: '✅ Создан спринт',
  SPRINT_UPDATE: '✏️ Обновлен спринт',
  SPRINT_CLOSE: '✔ Спринт закрыт',
  SPRINT_LOCK: '🔒 Спринт заблокирован',
  SPRINT_UNLOCK: '🔓 Спринт разблокирован',
  MESSAGE_CREATE: '💬 Новое сообщение',
  MESSAGE_DELETE: '🗑 Сообщение удалено',
  FILE_UPLOAD: '📁 Файл загружен',
  FILE_DELETE: '🗑 Файл удален',
  MEMBER_ADD: '👤 Участник добавлен',
  MEMBER_REMOVE: '👤 Участник удален',
  TEAM_CREATE: '👥 Создана команда',
  TEAM_UPDATE: '✏️ Обновлена команда',
};

export function AuditLogPanel({ teamId, isOpen, onClose }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getTeamAuditLogs(teamId);
        setLogs(res.auditLogs);
      } catch (err) {
        setError('Не удалось загрузить логи.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [teamId, isOpen]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="h-96 max-h-screen w-full max-w-2xl overflow-auto rounded-lg bg-slate-900 ring-1 ring-slate-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <h2 className="text-lg font-semibold">История активности команды</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>

        {loading && <div className="p-6 text-center text-slate-400">Загрузка...</div>}
        {error && <div className="p-6 text-center text-red-400">{error}</div>}

        {!loading && !error && logs.length === 0 && (
          <div className="p-6 text-center text-slate-400">История пуста</div>
        )}

        {!loading && !error && (
          <div className="divide-y divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="border-b border-slate-800 px-6 py-3">
                <div className="flex items-start justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium text-slate-300">
                      {actionLabels[log.action] || log.action}
                    </span>
                    {log.details && (
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {log.details}
                      </div>
                    )}
                    {log.user && (
                      <div className="mt-1 text-xs text-slate-600">
                        Пользователь:{' '}
                        <Link
                          to={`/app/profile/${log.user.id}`}
                          className="text-emerald-400 hover:text-emerald-300 transition"
                        >
                          {log.user.name}
                        </Link>
                        {' '}({log.user.email})
                      </div>
                    )}
                  </div>
                  <div className="ml-2 text-right text-xs text-slate-500">
                    <div>{formatDate(log.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
