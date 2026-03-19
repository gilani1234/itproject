import { useState, useEffect } from 'react';
import { getLesson, addLessonContent, deleteLessonContent, uploadLessonFile, deleteQuiz } from '../api/endpoints';
import type { Lesson } from '../api/endpoints';
import { QuizBuilderModal } from './QuizBuilderModal';
import { getAvatarUrl } from '../lib/auth';

interface LessonEditorProps {
  lessonId: string;
  onClose: () => void;
  isTeacher: boolean;
}

export function LessonEditorModal({ lessonId, onClose, isTeacher }: LessonEditorProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contentType, setContentType] = useState<'FILE_PDF' | 'FILE_WORD' | 'FILE_POWERPOINT' | 'VIDEO_YOUTUBE' | 'TEXT'>('TEXT');
  const [contentTitle, setContentTitle] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const res = await getLesson(lessonId);
      setLesson(res.lesson);
    } catch (err) {
      setError('Не удалось загрузить лекцию');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      if (contentType.includes('FILE') && selectedFile) {
        // Upload file
        await uploadLessonFile(lessonId, selectedFile, contentTitle);
      } else {
        // Add content via URL or text
        await addLessonContent(lessonId, contentType, contentTitle, contentUrl || undefined, contentText || undefined);
      }

      await loadLesson();
      setContentTitle('');
      setContentUrl('');
      setContentText('');
      setSelectedFile(null);
      setContentType('TEXT');
    } catch (err) {
      setError('Не удалось добавить контент');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Удалить материал?')) return;
    try {
      await deleteLessonContent(lessonId, contentId);
      await loadLesson();
    } catch (err) {
      setError('Не удалось удалить материал');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Удалить тест? Это действие нельзя отменить.')) return;
    try {
      await deleteQuiz(quizId);
      await loadLesson();
    } catch (err) {
      setError('Не удалось удалить тест');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-slate-900 rounded-2xl p-8 text-slate-100">загружаем...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-slate-900 rounded-2xl p-8 text-slate-100">Лекция не найдена</div>
      </div>
    );
  }

  if (showQuizBuilder) {
    return (
      <QuizBuilderModal
        lessonId={lessonId}
        quizId={editingQuizId || undefined}
        onClose={() => {
          setShowQuizBuilder(false);
          setEditingQuizId(null);
        }}
        onQuizCreated={() => {
          loadLesson();
          setShowQuizBuilder(false);
          setEditingQuizId(null);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">{lesson.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-900/30 text-red-300 rounded-lg text-sm">{error}</div>}

          {/* Existing Content */}
          <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">📚 Материалы лекции</h3>
            {lesson.contents && lesson.contents.length > 0 ? (
              <div className="space-y-2">
                {lesson.contents.map((content) => (
                  <div key={content.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium">{content.title}</p>
                      <p className="text-slate-400 text-sm">
                        {content.type === 'FILE_PDF' && '📄 PDF'}
                        {content.type === 'FILE_WORD' && '📝 Word'}
                        {content.type === 'FILE_POWERPOINT' && '🎬 PowerPoint'}
                        {content.type === 'VIDEO_YOUTUBE' && '▶️ YouTube видео'}
                        {content.type === 'TEXT' && '📌 Текст'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {content.url && (
                        <a
                          href={getAvatarUrl(content.url) ?? content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 text-sm px-2"
                        >
                          скачать
                        </a>
                      )}
                      {isTeacher && (
                        <button
                          onClick={() => handleDeleteContent(content.id)}
                          className="text-red-400 hover:text-red-300 px-2 py-1 text-sm"
                        >
                          удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Нет материалов</p>
            )}
          </div>

          {/* Add Content Form (Teacher Only) */}
          {isTeacher && (
            <form onSubmit={handleAddContent} className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">➕ Добавить материал</h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Тип контента</label>
                <select
                  value={contentType}
                  onChange={(e) => {
                    setContentType(e.target.value as 'FILE_PDF' | 'FILE_WORD' | 'FILE_POWERPOINT' | 'VIDEO_YOUTUBE' | 'TEXT');
                    setContentUrl('');
                    setSelectedFile(null);
                  }}
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-2 border border-slate-700 focus:border-emerald-500 outline-none"
                >
                  <option value="TEXT">Текстовый материал</option>
                  <option value="FILE_PDF">PDF документ</option>
                  <option value="FILE_WORD">Word документ</option>
                  <option value="FILE_POWERPOINT">PowerPoint презентация</option>
                  <option value="VIDEO_YOUTUBE">YouTube видео</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Название</label>
                <input
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder="Например: 'Основные концепции'"
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-2 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              {contentType.includes('FILE') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Выбрать файл</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      className="flex-1 bg-slate-950 text-slate-100 rounded-lg px-4 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                    />
                    {selectedFile && <span className="text-slate-400 text-sm">{selectedFile.name}</span>}
                  </div>
                </div>
              )}

              {contentType === 'VIDEO_YOUTUBE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ссылка на YouTube видео</label>
                  <input
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-2 border border-slate-700 focus:border-emerald-500 outline-none"
                  />
                </div>
              )}

              {contentType === 'TEXT' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Содержание</label>
                  <textarea
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder="Введите текстовое содержание..."
                    className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-2 border border-slate-700 focus:border-emerald-500 outline-none h-32 resize-none"
                  />
                </div>
              )}

              <button
                disabled={submitting || !contentTitle.trim() || (contentType.includes('FILE') && !selectedFile) || (contentType === 'VIDEO_YOUTUBE' && !contentUrl) || (contentType === 'TEXT' && !contentText)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-2 rounded-lg transition"
              >
                {submitting ? 'Добавляем...' : 'Добавить материал'}
              </button>
            </form>
          )}

          {/* Quizzes Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">❓ Тесты</h3>
              {isTeacher && (
                <button
                  onClick={() => {
                    setEditingQuizId(null);
                    setShowQuizBuilder(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-lg font-semibold text-sm transition"
                >
                  + Создать тест
                </button>
              )}
            </div>

            {lesson.quizzes && lesson.quizzes.length > 0 ? (
              <div className="space-y-2">
                {lesson.quizzes.map((quiz) => (
                  <div key={quiz.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium">{quiz.title}</p>
                      <p className="text-slate-400 text-sm">
                        Вопросов: {quiz.questions?.length || 0} | Проходной балл: {quiz.passingScore}%
                      </p>
                    </div>
                    {isTeacher && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingQuizId(quiz.id);
                            setShowQuizBuilder(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition"
                        >
                          ✏️ Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition"
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Нет тестов</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
