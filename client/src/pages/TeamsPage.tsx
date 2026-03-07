import { useEffect, useMemo, useState } from 'react';
import { createTeam, listTeams, type Team } from '../api/endpoints';
import { getStoredUser } from '../lib/auth';

export function TeamsPage() {
  const user = getStoredUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  const canCreateTeam = user?.role === 'TEACHER';

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listTeams();
      setTeams(res.teams);
    } catch {
      setError('Не удалось загрузить команды.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const mySummary = useMemo(() => {
    const count = teams.length;
    const members = teams.reduce((sum, t) => sum + t.members.length, 0);
    return { count, members };
  }, [teams]);

  async function onCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName('');
      await refresh();
    } catch {
      setError('Не удалось создать команду (создавать может только преподаватель).');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Команды</div>
          <div className="mt-1 text-sm text-slate-400">
            Мои команды: {mySummary.count} • участников суммарно: {mySummary.members}
          </div>
        </div>

        {canCreateTeam ? (
          <form onSubmit={onCreateTeam} className="flex gap-2">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="w-64 rounded-xl bg-slate-900 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
              placeholder="Название команды"
            />
            <button
              disabled={creating}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              Создать
            </button>
          </form>
        ) : null}
      </div>

      {error ? <div className="rounded-2xl bg-rose-900/30 p-4 text-sm text-rose-200">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">Загрузка…</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <div key={t.id} className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{t.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{t.members.length} участников</div>
                </div>
                <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-emerald-300">team</div>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-wide text-slate-500">Участники</div>
                <div className="mt-3 space-y-2 text-sm">
                  {t.members.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="text-slate-200">{m.user.name}</span>
                      <span className="text-xs text-slate-400">{m.teamRole}</span>
                    </div>
                  ))}
                  {t.members.length > 5 ? (
                    <div className="text-xs text-slate-500">…и ещё {t.members.length - 5}</div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

