import { useEffect, useState } from 'react';
import {
  deleteTaskAttachment,
  uploadTaskAttachment,
  type TaskAttachment,
} from '../api/endpoints';

interface TaskAttachmentsProps {
  taskId: string;
  isLocked?: boolean;
  isTeacher?: boolean;
  attachments?: TaskAttachment[];
  onAttachmentsChange?: (attachments: TaskAttachment[]) => void;
}

export function TaskAttachments({
  taskId,
  isLocked,
  isTeacher,
  attachments = [],
  onAttachmentsChange,
}: TaskAttachmentsProps) {
  const [files, setFiles] = useState<TaskAttachment[]>(attachments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = !isLocked || isTeacher;

  useEffect(() => {
    setFiles(attachments);
  }, [attachments]);

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

      const attachment = await uploadTaskAttachment(taskId, file.name, dataUrl);

      setFiles((prev) => [...prev, attachment.attachment]);
      onAttachmentsChange?.([...files, attachment.attachment]);
    } catch (err) {
      setError('Не удалось загрузить файл.');
      console.error(err);
    } finally {
      setLoading(false);
    }

    // Reset input
    e.target.value = '';
  };

  const handleDelete = async (attachmentId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteTaskAttachment(taskId, attachmentId);
      const updated = files.filter((f) => f.id !== attachmentId);
      setFiles(updated);
      onAttachmentsChange?.(updated);
    } catch (err) {
      setError('Не удалось удалить файл.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      {!isLocked || isTeacher ? (
        <label className="flex items-center gap-1 rounded border border-dashed border-slate-600 px-2 py-1 text-xs hover:border-slate-400 cursor-pointer transition">
          <input
            type="file"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />
          <span className="text-slate-400">📎 Прикрепить</span>
        </label>
      ) : (
        <div className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-500">
          📒 Заблокирована
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-1 rounded bg-slate-800 px-2 py-1 text-xs">
              <span className="flex items-center gap-1 text-slate-300 flex-1 truncate">
                📄 {file.label}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={file.url}
                  download={file.label}
                  className="text-cyan-400 hover:text-cyan-300 transition px-1 py-0.5 rounded hover:bg-slate-700"
                  title="Скачать"
                >
                  ⬇️
                </a>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={loading}
                    className="text-slate-500 hover:text-red-400 disabled:text-slate-600 px-1 py-0.5 rounded hover:bg-slate-700 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
