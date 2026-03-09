import { useState } from 'react';
import {
  deleteMessageAttachment,
  uploadMessageAttachment,
  deleteMessage,
  type MessageAttachment,
} from '../api/endpoints';

interface ChatMessageAttachmentsProps {
  messageId: string;
  teamId: string;
  attachments?: MessageAttachment[];
  canDelete?: boolean;
  onAttachmentsChange?: (attachments: MessageAttachment[]) => void;
  onDelete?: () => void;
}

export function ChatMessageAttachments({
  messageId,
  teamId,
  attachments = [],
  canDelete = false,
  onAttachmentsChange,
  onDelete,
}: ChatMessageAttachmentsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Convert file to data URL (base64)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const attachment = await uploadMessageAttachment(messageId, file.name, dataUrl);

      onAttachmentsChange?.([...attachments, attachment.attachment]);
    } catch (err) {
      setError('Не удалось загрузить файл.');
      console.error(err);
    } finally {
      setLoading(false);
    }

    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteMessageAttachment(attachmentId);
      onAttachmentsChange?.(attachments.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError('Не удалось удалить файл.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!confirm('Удалить сообщение?')) return;

    setLoading(true);
    setError(null);

    try {
      await deleteMessage(teamId, messageId);
      onDelete?.();
    } catch (err) {
      setError('Не удалось удалить сообщение.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between gap-2 rounded bg-slate-700 px-2 py-1 text-xs">
              <span className="text-slate-300 flex-1">📎 {att.label}</span>
              <div className="flex items-center gap-1">
                <a
                  href={att.url}
                  download={att.label}
                  className="text-cyan-400 hover:text-cyan-300 transition"
                  title="Скачать"
                >
                  ⬇️
                </a>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    disabled={loading}
                    className="text-slate-500 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canDelete && (
        <div className="flex gap-1">
          <label className="flex-1 rounded border border-dashed border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-400 cursor-pointer transition">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />
            📎 Прикрепить
          </label>
          <button
            onClick={handleDeleteMessage}
            disabled={loading}
            className="rounded border border-slate-600 px-2 py-1 text-xs text-red-400 hover:border-red-600 hover:bg-red-950"
          >
            🗑
          </button>
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}
