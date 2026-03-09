import { useEffect, useState } from 'react';
import { listTeams, teamAnalytics, type Team, type TeamAnalytics, type AuditLog } from '../api/endpoints';
import { AuditLogPanel } from '../components/AuditLogPanel';

export function AnalyticsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [data, setData] = useState<TeamAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  useEffect(() => {
    async function boot() {
      setError(null);
      try {
        const res = await listTeams();
        setTeams(res.teams);
        const first = res.teams[0]?.id ?? '';
        setTeamId(first);
      } catch {
        setError('Не удалось загрузить команды.');
      } finally {
        // no-op
      }
    }
    boot();
  }, []);

  useEffect(() => {
    async function load() {
      if (!teamId) {
        setData(null);
        return;
      }
      setError(null);
      try {
        const res = await teamAnalytics(teamId);
        setData(res);
      } catch {
        setError('Не удалось загрузить аналитику.');
      }
    }
    load();
  }, [teamId]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Аналитика</div>
          <div className="mt-1 text-sm text-slate-400">Velocity, статус задач и топ участников команды.</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAuditLogs(true)}
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 ring-1 ring-slate-700"
          >
            📋 История активности
          </button>
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
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-rose-900/30 p-4 text-sm text-rose-200">{error}</div> : null}

      {!data ? (
        <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">Выбери команду для просмотра.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-900 p-5 ring-1 ring-slate-800">
              <div className="text-xs text-slate-400">Всего задач</div>
              <div className="mt-2 text-3xl font-bold text-emerald-400">{data.totals.total}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-5 ring-1 ring-slate-800">
              <div className="text-xs text-slate-400">В работе</div>
              <div className="mt-2 text-3xl font-bold text-sky-400">
                {(data.totals.byStatus.IN_PROGRESS ?? 0) + (data.totals.byStatus.REVIEW ?? 0)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-5 ring-1 ring-slate-800">
              <div className="text-xs text-slate-400">Готово</div>
              <div className="mt-2 text-3xl font-bold text-lime-400">{data.totals.byStatus.DONE ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
              <div className="mb-4 text-sm font-medium text-slate-200">Velocity по спринтам (сумма поинтов DONE)</div>
              <div className="space-y-2 text-sm">
                {data.velocity.length === 0 ? (
                  <div className="text-slate-500">Спринтов пока нет.</div>
                ) : (
                  data.velocity.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{v.name}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(v.startsAt).toLocaleDateString('ru-RU')} –{' '}
                          {new Date(v.endsAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-emerald-400">{v.donePoints}</div>
                        <div className="text-xs text-slate-500">поинты</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
              <div className="mb-4 text-sm font-medium text-slate-200">Топ участников</div>
              <div className="space-y-2 text-sm">
                {data.topMembers.length === 0 ? (
                  <div className="text-slate-500">Пока нет выполненных задач.</div>
                ) : (
                  data.topMembers.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.email}</div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div className="font-semibold text-emerald-300">{m.pointsDone} pts</div>
                        <div>{m.tasksDone} задач</div>
                      </div>

      {/* Audit Log Panel */}
      {teamId && (
        <AuditLogPanel
          teamId={teamId}
          isOpen={showAuditLogs}
          onClose={() => setShowAuditLogs(false)}
        />
      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


