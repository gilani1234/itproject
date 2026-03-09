import { useEffect, useRef, useState } from 'react';
import { listMessages, listTeams, sendMessage, uploadMessageAttachment, type Team } from '../api/endpoints';
import { ChatMessageAttachments } from '../components/ChatMessageAttachments';
import { useAuth } from '../lib/auth';

export function ChatPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [attachedFile, setAttachedFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      
      // If file is attached, upload it
      if (attachedFile && res.message) {
        try {
          await uploadMessageAttachment(res.message.id, attachedFile.name, attachedFile.dataUrl);
          // Update message with attachment
          const updatedMsg = { ...res.message, attachments: [{ id: 'temp', messageId: res.message.id, label: attachedFile.name, url: attachedFile.dataUrl, createdAt: new Date().toISOString() }] };
          setMessages((prev) => [...prev, updatedMsg]);
        } catch (err) {
          console.error('Failed to attach file:', err);
        }
        setAttachedFile(null);
      } else {
        setMessages((prev) => [...prev, res.message]);
      }

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setAttachedFile({ name: file.name, dataUrl });
    } catch (err) {
      setError('Не удалось загрузить файл.');
      console.error(err);
    }

    e.target.value = '';
  };

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
          <div className="text-slate-400">Нет сообщений</div>
        ) : (
          messages.map((m) => {
            const isExpanded = expandedMessages.has(m.id);
            const canDelete = user?.id === m.user.id || user?.role === 'TEACHER';
            
            return (
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
                
                {/* Expanded actions */}
                {isExpanded && (
                  <div className="mt-2 border-t border-slate-700 pt-2 space-y-2">
                    <ChatMessageAttachments
                      messageId={m.id}
                      teamId={teamId}
                      attachments={m.attachments || []}
                      canDelete={canDelete}
                      onAttachmentsChange={(attachments) => {
                        setMessages(prev => prev.map(msg => 
                          msg.id === m.id ? { ...msg, attachments } : msg
                        ));
                      }}
                      onDelete={() => {
                        setMessages(prev => prev.filter(msg => msg.id !== m.id));
                        setExpandedMessages(prev => {
                          const next = new Set(prev);
                          next.delete(m.id);
                          return next;
                        });
                      }}
                    />
                  </div>
                )}

                {/* Attachments (always visible) */}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.attachments.map((att: any) => (
                      <div key={att.id} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-300">📎 {att.label}</span>
                        <a
                          href={att.url}
                          download={att.label}
                          className="text-cyan-400 hover:text-cyan-300 transition"
                          title="Скачать"
                        >
                          ⬇️
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Toggle button */}
                {canDelete && (
                  <button
                    onClick={() => {
                      const next = new Set(expandedMessages);
                      if (isExpanded) {
                        next.delete(m.id);
                      } else {
                        next.add(m.id);
                      }
                      setExpandedMessages(next);
                    }}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    {isExpanded ? '▼ Скрыть опции' : '▶ Показать опции'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={onSend} className="border-t border-slate-800 px-6 py-4 space-y-3">
        {attachedFile && (
          <div className="flex items-center justify-between gap-2 rounded bg-slate-800 px-3 py-2 text-sm">
            <span className="text-slate-300">📎 {attachedFile.name}</span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-slate-500 hover:text-red-400 transition"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-emerald-500"
            placeholder="Напишите сообщение…"
          />
          <label className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 ring-1 ring-slate-700 cursor-pointer transition flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={sending}
              className="hidden"
            />
            📎
          </label>
          <button
            disabled={sending}
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition"
          >
            Отправить
          </button>
        </div>
      </form>
    </div>
  );
}


