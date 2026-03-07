import { useEffect, useRef, useState } from 'react';
import { listMessages, listTeams, sendMessage, type ChatMessage, type Team } from '../api/endpoints';

export function ChatPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

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

  async function refreshMessages(selectedTeamId: string) {
    if (!selectedTeamId) {
      setMessages([]);
      return;
    }
    try {
      const res = await listMessages(selectedTeamId);
      setMessages(res.messages);
      if (listRef.current) {
        queueMicrotask(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        });
      }
    } catch {
      setError('Не удалось загрузить сообщения.');
    }
  }

  useEffect(() => {
    refreshMessages(teamId);
  }, [teamId]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await sendMessage(teamId, text.trim());
      setText('');
      setMessages((prev) => [...prev, res.message]);
      if (listRef.current) {
        queueMicrotask(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        });
      }
    } catch {
      setError('Не удалось отправить сообщение.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[560px] max-w-4xl flex-col rounded-2xl bg-slate-900 ring-1 ring-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="text-lg font-semibold">Командный чат</div>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-xl bg-slate-950 px-3 py-2 text-sm ring-1 ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
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

      {error ? <div className="px-6 pt-3 text-sm text-rose-300">{error}</div> : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-4 text-sm">
        {loading ? (
          <div className="text-slate-400">Загрузка…</div>
        ) : messages.length === 0 ? (
          <div className="text-slate-500">Нет сообщений. Напиши первое!</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-2xl bg-slate-800 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.user.name}</span>
                  <span className="text-xs text-slate-400">{m.user.role === 'TEACHER' ? 'преподаватель' : 'студент'}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="mt-1 text-slate-100">{m.text}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSend} className="flex gap-3 border-t border-slate-800 px-6 py-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
          placeholder="Напишите сообщение…"
        />
        <button
          disabled={sending}
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          Отправить
        </button>
      </form>
    </div>
  );
}


