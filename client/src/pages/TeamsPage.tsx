import { useEffect, useMemo, useState } from 'react';
import {
  addSprintRating,
  addTeamMember,
  createTeam,
  deleteTeam,
  getSprintRatings,
  listSprints,
  listTeams,
  updateTeam,
  type Sprint,
  type SprintRating,
  type Team,
} from '../api/endpoints';
import { HttpError } from '../api/http';
import { getStoredUser } from '../lib/auth';

export function TeamsPage() {
  const user = getStoredUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [ratings, setRatings] = useState<SprintRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [ratingModal, setRatingModal] = useState<{ userId: string; userName: string } | null>(null);
  const [ratingPoints, setRatingPoints] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const canCreateTeam = user?.role === 'TEACHER';
  const isTeacher = user?.role === 'TEACHER';

  const mySummary = useMemo(() => {
    const count = teams.length;
    const members = teams.reduce((sum, t) => sum + t.members.length, 0);
    return { count, members };
  }, [teams]);

  async function loadTeams() {
    setLoading(true);
    setError(null);
    try {
      const res = await listTeams();
      setTeams(res.teams);
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

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadSprints(teamId: string) {
    try {
      const res = await listSprints(teamId);
      setSprints(res.sprints);
    } catch {
      setSprints([]);
    }
  }

  async function loadRatings(sprintId: string) {
    try {
      const res = await getSprintRatings(sprintId);
      setRatings(res.ratings);
    } catch {
      setRatings([]);
    }
  }

  function selectTeam(team: Team) {
    setSelectedTeam(team);
    setSelectedSprint(null);
    setRatings([]);
    loadSprints(team.id);
  }

  function selectSprint(sprint: Sprint) {
    setSelectedSprint(sprint);
    loadRatings(sprint.id);
  }

  async function onCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName('');
      await loadTeams();
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось создать команду.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function onAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !newMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      await addTeamMember(selectedTeam.id, newMemberEmail.trim());
      setNewMemberEmail('');
      await loadTeams();
      const updated = teams.find((t) => t.id === selectedTeam.id);
      if (updated) selectTeam(updated);
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось добавить участника.');
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function onSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSprint || !ratingModal) return;
    setSubmittingRating(true);
    try {
      await addSprintRating(selectedSprint.id, ratingModal.userId, ratingPoints, ratingFeedback || undefined);
      await loadRatings(selectedSprint.id);
      setRatingModal(null);
      setRatingPoints(0);
      setRatingFeedback('');
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось сохранить оценку.');
      }
    } finally {
      setSubmittingRating(false);
    }
  }

  async function onUpdateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeamId || !editingTeamName.trim()) return;
    setUpdatingTeam(true);
    try {
      await updateTeam(editingTeamId, editingTeamName.trim());
      setEditingTeamId(null);
      setEditingTeamName('');
      await loadTeams();
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось обновить команду.');
      }
    } finally {
      setUpdatingTeam(false);
    }
  }

  async function onDeleteTeam(teamId: string) {
    if (!confirm('Вы уверены? Она удалится со всеми данными')) return;
    setDeletingTeamId(teamId);
    try {
      await deleteTeam(teamId);
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
        setSprints([]);
        setRatings([]);
      }
      await loadTeams();
    } catch (e) {
      if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        setError(String((e.body as any).error));
      } else {
        setError('Не удалось удалить команду.');
      }
    } finally {
      setDeletingTeamId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Команды</h2>
          <p className="mt-1 text-sm text-slate-400">
            Всего команд: {mySummary.count} • Участников: {mySummary.members}
          </p>
        </div>

        {canCreateTeam && (
          <form onSubmit={onCreateTeam} className="flex gap-2">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Название команды"
              className="w-64 rounded-xl bg-slate-900 px-4 py-3 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              disabled={creating}
              type="submit"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              Создать
            </button>
          </form>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-800">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Teams List */}
        <div className="lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold">Мои команды</h3>
          {loading ? (
            <div className="text-slate-400">Загрузка…</div>
          ) : teams.length === 0 ? (
            <div className="text-sm text-slate-400">Команд нет</div>
          ) : (
            <div className="space-y-3">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="flex gap-2 items-center group"
                >
                  <button
                    onClick={() => selectTeam(t)}
                    className={`flex-1 rounded-lg px-4 py-2 text-left text-sm transition ${
                      selectedTeam?.id === t.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs opacity-75">{t.members.length} участников</div>
                  </button>
                  {isTeacher && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setEditingTeamId(t.id);
                          setEditingTeamName(t.name);
                        }}
                        className="rounded-lg bg-slate-800 px-2 py-2 text-xs text-slate-300 hover:bg-slate-700"
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteTeam(t.id)}
                        disabled={deletingTeamId === t.id}
                        className="rounded-lg bg-red-900 px-2 py-2 text-xs text-red-300 hover:bg-red-800 disabled:opacity-50"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Team Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTeam ? (
            <>
              {/* Team Info */}
              <div className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800">
                <h3 className="mb-4 text-lg font-semibold">{selectedTeam.name}</h3>

                <div className="mb-6">
                  <p className="text-sm text-slate-400 mb-3">Участники</p>
                  <div className="space-y-2">
                    {selectedTeam.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{m.user.name}</p>
                          <p className="text-xs text-slate-500">{m.user.email}</p>
                        </div>
                        <span className="text-xs text-emerald-300">{m.teamRole}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isTeacher && (
                  <form onSubmit={onAddMember} className="flex gap-2 border-t border-slate-800 pt-4">
                    <input
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      type="email"
                      placeholder="Email участника…"
                      className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      disabled={addingMember}
                      type="submit"
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                    >
                      Добавить
                    </button>
                  </form>
                )}
              </div>

              {/* Sprints & Ratings */}
              {sprints.length > 0 && (
                <div className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800">
                  <h4 className="mb-4 text-lg font-semibold">Спринты и оценки</h4>
                  <div className="space-y-4">
                    {sprints.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => selectSprint(s)}
                        className={`w-full rounded-lg px-4 py-2 text-left text-sm transition ${
                          selectedSprint?.id === s.id
                            ? 'bg-emerald-600/20 ring-1 ring-emerald-600'
                            : 'bg-slate-950 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(s.startsAt).toLocaleDateString('ru-RU')} – {new Date(s.endsAt).toLocaleDateString('ru-RU')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sprint Ratings */}
              {selectedSprint && isTeacher && (
                <div className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800">
                  <h4 className="mb-4 text-lg font-semibold">Оценить участников</h4>
                  <div className="space-y-3">
                    {selectedTeam.members.map((m) => {
                      const existing = ratings.find((r) => r.userId === m.userId);
                      return (
                        <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{m.user.name}</p>
                            {existing ? (
                              <p className="text-xs text-emerald-300 mt-1">✓ {existing.points} балл(ов)</p>
                            ) : (
                              <p className="text-xs text-slate-500 mt-1">Не оценен</p>
                            )}
                          </div>
                          <button
                            onClick={() => setRatingModal({ userId: m.userId, userName: m.user.name })}
                            className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
                          >
                            Оценить
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-slate-900 p-6 text-center text-slate-400 ring-1 ring-slate-800">
              Выбери команду для просмотра деталей
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
            <h4 className="mb-4 text-lg font-semibold">Оценить {ratingModal.userName}</h4>
            <form onSubmit={onSubmitRating} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Баллы (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ratingPoints}
                  onChange={(e) => setRatingPoints(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Комментарий (опционально)</label>
                <textarea
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Отзыв о работе…"
                  className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRatingModal(null)}
                  className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Отменить
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeamId && (
        <div className="fixed inset-0 bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
            <h4 className="mb-4 text-lg font-semibold">Редактировать команду</h4>
            <form onSubmit={onUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Название</label>
                <input
                  type="text"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
                  placeholder="Новое название…"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeamId(null)}
                  className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Отменить
                </button>
                <button
                  type="submit"
                  disabled={updatingTeam}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

