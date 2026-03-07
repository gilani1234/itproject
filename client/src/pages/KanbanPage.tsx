import { useEffect, useMemo, useState } from 'react';
import {
  createSprint,
  createTask,
  listSprints,
  listTasks,
  listTeams,
  updateTask,
  type Sprint,
  type Task,
  type TaskStatus,
  type Team,
} from '../api/endpoints';

const columns: { id: TaskStatus; title: string }[] = [
  { id: 'BACKLOG', title: 'Backlog' },
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' },
];

export function KanbanPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingSprint, setCreatingSprint] = useState(false);

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const res = await listTeams();
        setTeams(res.teams);
        const first = res.teams[0]?.id ?? '';
        setTeamId(first);
      } catch {
        setError('Не удалось загрузить команды.');
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  async function refreshTasks(selectedTeamId: string) {
    if (!selectedTeamId) {
      setTasks([]);
      return;
    }
    setError(null);
    try {
      const res = await listTasks(selectedTeamId, sprintId || undefined);
      setTasks(res.tasks);
    } catch {
      setError('Не удалось загрузить задачи. Проверь доступ к команде и API.');
    }
  }

  useEffect(() => {
    refreshTasks(teamId);
  }, [teamId, sprintId]);

  async function refreshSprints(selectedTeamId: string) {
    if (!selectedTeamId) {
      setSprints([]);
      setSprintId('');
      return;
    }
    try {
      const res = await listSprints(selectedTeamId);
      setSprints(res.sprints);
      const active = res.sprints.find((s) => !s.isClosed);
      setSprintId((prev) => (prev && res.sprints.some((s) => s.id === prev) ? prev : active?.id ?? ''));
    } catch {
      // ignore for now
    }
  }

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData('text/taskId', taskId);
  }

  async function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/taskId');
    if (!taskId) return;

    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status === status) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await updateTask(taskId, { status });
    } catch {
      // rollback
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: current.status } : t)));
      setError('Не удалось переместить задачу.');
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createTask({ teamId, title: newTitle.trim(), status: 'BACKLOG' });
      setNewTitle('');
      await refreshTasks(teamId);
    } catch {
      setError('Не удалось создать задачу.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">Загрузка…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Kanban-доска</div>
          <div className="mt-1 text-sm text-slate-400">Backlog → Done • drag & drop</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="" disabled>
              Выбери команду
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {teamId ? (
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm ring-1 ring-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Все спринты</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}

          <form onSubmit={onCreate} className="flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-72 rounded-xl bg-slate-900 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
              placeholder="Новая задача…"
            />
            <button
              disabled={creating}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              Добавить
            </button>
          </form>

          {teamId ? (
            <button
              disabled={creatingSprint}
              onClick={async () => {
                setCreatingSprint(true);
                try {
                  await createSprint(teamId, { durationDays: 14 });
                  await refreshSprints(teamId);
                } finally {
                  setCreatingSprint(false);
                }
              }}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800 disabled:opacity-60"
            >
              Новый спринт (14 дней)
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-rose-900/30 p-4 text-sm text-rose-200">{error}</div> : null}

      <div className="flex gap-5 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-80 shrink-0 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="font-medium">{col.title}</div>
              <div className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                {byStatus[col.id].length}
              </div>
            </div>

            <div className="space-y-3">
              {byStatus[col.id].map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, t.id)}
                  className="cursor-grab rounded-xl bg-slate-800 p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10 active:cursor-grabbing"
                >
                  <div className="text-sm font-medium">{t.title}</div>
                  {t.description ? (
                    <div className="mt-2 max-h-10 overflow-hidden text-ellipsis text-xs text-slate-400">{t.description}</div>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{t.points ? `${t.points} pts` : '—'}</span>
                    <span className="text-emerald-300">#{t.id.slice(0, 6)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

