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
import { HttpError } from '../api/http';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { SprintLockToggle } from '../components/SprintLockToggle';
import { useAuth } from '../lib/auth';

const columns: { id: TaskStatus; title: string }[] = [
  { id: 'BACKLOG', title: 'BACKLOG' },
  { id: 'TODO', title: 'TODO' },
  { id: 'IN_PROGRESS', title: 'PROGRESS' },
  { id: 'REVIEW', title: 'REVIEW' },
  { id: 'DONE', title: 'DONE' },
];

export function KanbanPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';
  
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
  const [newSprintName, setNewSprintName] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Task details modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Load teams on mount
  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const res = await listTeams();
        setTeams(res.teams);
        if (res.teams.length > 0) setTeamId(res.teams[0].id);
      } catch (e) {
        if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
          setError(String((e.body as any).error));
        } else {
          setError('Не удалось загрузить команды.');
        }
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  // Load sprints when team changes
  useEffect(() => {
    if (!teamId) {
      setSprints([]);
      setSprintId('');
      return;
    }
    (async () => {
      try {
        const res = await listSprints(teamId);
        setSprints(res.sprints);
        const active = res.sprints.find((s) => !s.isClosed);
        setSprintId(active?.id ?? '');
      } catch (e) {
        setSprints([]);
        if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
          setError(String((e.body as any).error));
        } else {
          setError('Не удалось загрузить спринты.');
        }
      }
    })();
  }, [teamId]);

  // Load tasks when team or sprint changes
  useEffect(() => {
    if (!teamId) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const res = await listTasks(teamId, sprintId || undefined);
        setTasks(res.tasks);
      } catch (e) {
        if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
          setError(String((e.body as any).error));
        } else {
          setError('Не удалось загрузить задачи.');
        }
      }
    })();
  }, [teamId, sprintId]);

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

  function onDragStart(e: React.DragEvent, task: Task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === status) return;

    const oldStatus = draggedTask.status;
    const oldSprintId = draggedTask.sprintId;
    const newSprintId = sprintId || undefined;

    setTasks((prev) => prev.map((t) => (t.id === draggedTask.id ? { ...t, status, sprintId: newSprintId } : t)));
    setDraggedTask(null);

    try {
      await updateTask(draggedTask.id, { status, sprintId: newSprintId });
    } catch (e) {
      // Rollback on error
      setTasks((prev) => prev.map((t) => (t.id === draggedTask.id ? { ...t, status: oldStatus, sprintId: oldSprintId } : t)));
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось переместить задачу.');
      }
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createTask({
        teamId,
        title: newTitle.trim(),
        status: 'BACKLOG',
        sprintId: sprintId || undefined,
      });
      setNewTitle('');
      setTasks((prev) => [...prev, res.task]);
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось создать задачу.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function onCreateSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setCreatingSprint(true);
    setError(null);
    try {
      const res = await createSprint(teamId, {
        name: newSprintName.trim() || `Sprint ${sprints.length + 1}`,
        durationDays: 14,
      });
      setSprints((prev) => [...prev, res.sprint]);
      setNewSprintName('');
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось создать спринт.');
      }
    } finally {
      setCreatingSprint(false);
    }
  }

  if (loading) {
    return <div className="text-slate-400">Загрузка…</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] gap-4">
      <div className="px-6 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Kanban-доска</h2>
            <p className="mt-1 text-sm text-slate-400">Перетаскивай задачи между колонками</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800 mb-4">{error}</div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
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

          {teamId && (
            <>
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

              <form onSubmit={onCreateSprint} className="flex gap-2">
                <input
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  placeholder="Sprint #n"
                  className="w-40 rounded-xl bg-slate-900 px-3 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  disabled={creatingSprint}
                  type="submit"
                  className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                >
                  Спринт
                </button>
              </form>
            </>
          )}
        </div>

        {teamId && (
          <form onSubmit={onCreate} className="flex gap-2 mb-4">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Новая задача…"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              disabled={creating}
              type="submit"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              Добавить
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="flex gap-4 overflow-x-auto h-full">
          {columns.map((col) => (
            <div
              key={col.id}
              className="w-80 flex-shrink-0 min-h-[480px] rounded-xl bg-slate-900/50 p-4 ring-1 ring-slate-800 flex flex-col"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.id)}
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-slate-100 text-sm">{col.title}</h3>
                <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                  {byStatus[col.id].length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1">
                {byStatus[col.id].map((task) => {
                    const isTaskLocked = task.isLocked ?? false;
                    
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, task)}
                        onClick={() => {
                          setSelectedTask(task);
                          setShowModal(true);
                        }}
                        className={`rounded-lg p-4 cursor-grab active:cursor-grabbing transition ${
                          draggedTask?.id === task.id
                            ? 'bg-slate-700 ring-1 ring-emerald-500 opacity-50'
                            : 'bg-slate-800 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="text-sm font-semibold text-slate-100 flex-1">{task.title}</p>
                          {isTaskLocked && <span className="text-lg flex-shrink-0">🔒</span>}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          {task.points && <span>{task.points} pts</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTask(null);
        }}
        isTeacher={isTeacher}
        onTaskDeleted={(taskId) => {
          setTasks(prev => prev.filter(t => t.id !== taskId));
        }}
        onTaskLocked={(taskId, locked) => {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isLocked: locked } : t));
        }}
      />
    </div>
  );
}
