import { useState } from 'react';
import { type Task } from '../api/endpoints';
import { TaskHistoryPanel } from './TaskHistoryPanel';
import { TaskAttachments } from './TaskAttachments';
import { TaskComments } from './TaskComments';
import { TaskLockToggle } from './TaskLockToggle';

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  isTeacher: boolean;
  onTaskDeleted?: (taskId: string) => void;
  onTaskLocked?: (taskId: string, locked: boolean) => void;
}

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  isTeacher,
  onTaskDeleted,
  onTaskLocked,
}: TaskDetailsModalProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [isTaskLocked, setIsTaskLocked] = useState(task?.isLocked ?? false);

  if (!isOpen || !task) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl ring-1 ring-slate-700 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-slate-100">{task.title}</h2>
                {isTaskLocked && <span className="text-red-400 text-lg">🔒</span>}
              </div>
              {task.points && (
                <div className="text-sm text-slate-400">{task.points} points</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Описание</h3>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            {/* Assignee */}
            {task.assignee && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Назначена</h3>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold">
                    {task.assignee.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-slate-100">{task.assignee.name}</div>
                    <div className="text-xs text-slate-400">{task.assignee.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Файлы</h3>
              <TaskAttachments
                taskId={task.id}
                isLocked={isTaskLocked}
                isTeacher={isTeacher}
                attachments={task.attachments || []}
              />
            </div>

            {/* Comments */}
            <TaskComments
              taskId={task.id}
              isLocked={isTaskLocked}
              isTeacher={isTeacher}
            />

            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition ring-1 ring-slate-700"
            >
              📋 История изменений
            </button>

            {/* Teacher Controls */}
            {isTeacher && (
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Управление</h3>
                <TaskLockToggle
                  taskId={task.id}
                  isLocked={isTaskLocked}
                  isTeacher={isTeacher}
                  onLockChange={(locked) => {
                    setIsTaskLocked(locked);
                    onTaskLocked?.(task.id, locked);
                  }}
                  onDelete={() => {
                    onTaskDeleted?.(task.id);
                    onClose();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Panel */}
      {task && (
        <TaskHistoryPanel
          taskId={task.id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
