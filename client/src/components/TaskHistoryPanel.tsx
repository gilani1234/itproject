import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTaskHistory, type AuditLog, type TaskHistoryRecord } from '../api/endpoints';

interface TaskHistoryPanelProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskHistoryPanel({ taskId, isOpen, onClose }: TaskHistoryPanelProps) {
  const [history, setHistory] = useState<TaskHistoryRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await getTaskHistory(taskId);
        setHistory(res.history);
        setAuditLogs(res.auditLogs);
      } catch (err) {
        setError('Не удалось загрузить историю.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId, isOpen]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const fieldLabels: Record<string, string> = {
    title: 'Название',
    description: 'Описание',
    status: 'Статус',
    assignee: 'Ответственный',
    points: 'Очки',
    deadline: 'Дедлайн',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="h-96 max-h-screen w-full max-w-2xl overflow-auto rounded-lg bg-slate-900 ring-1 ring-slate-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <h2 className="text-lg font-semibold">История задачи</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>

        {loading && <div className="p-6 text-center text-slate-400">Загрузка...</div>}
        {error && <div className="p-6 text-center text-red-400">{error}</div>}

        {!loading && !error && history.length === 0 && auditLogs.length === 0 && (
          <div className="p-6 text-center text-slate-400">История пуста</div>
        )}

        {!loading && !error && (
          <div className="divide-y divide-slate-800">
            {/* Task changes history */}
            {history.map((record) => (
              <div key={record.id} className="border-b border-slate-800 px-6 py-3">
                <div className="flex items-start justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium text-slate-300">
                      {fieldLabels[record.field] || record.field}
                    </span>
                    <div className="mt-1 space-y-1 text-xs text-slate-400">
                      {record.oldValue && <div>Было: <span className="line-through">{record.oldValue}</span></div>}
                      {record.newValue && <div>Стало: <span className="font-semibold text-cyan-400">{record.newValue}</span></div>}
                    </div>
                  </div>
                  <div className="ml-2 text-right text-xs text-slate-500">
                    {record.user?.name && (
                      <Link
                        to={`/app/profile/${record.user.id}`}
                        className="text-emerald-400 hover:text-emerald-300 transition block"
                      >
                        {record.user.name}
                      </Link>
                    )}
                    <div>{formatDate(record.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Audit logs */}
            {auditLogs.map((log) => (
              <div key={log.id} className="border-b border-slate-800 px-6 py-3">
                <div className="flex items-start justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium text-slate-300">{log.action}</span>
                    {log.details && (
                      <div className="mt-1 text-xs text-slate-500">{log.details}</div>
                    )}
                  </div>
                  <div className="ml-2 text-right text-xs text-slate-500">
                    {log.user?.name && (
                      <Link
                        to={`/app/profile/${log.user.id}`}
                        className="text-emerald-400 hover:text-emerald-300 transition block"
                      >
                        {log.user.name}
                      </Link>
                    )}
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
