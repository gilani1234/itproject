import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLesson, completeLessonLesson } from '../api/endpoints';
import { getStoredUser, getAvatarUrl } from '../lib/auth';
import { LessonEditorModal } from '../components/LessonEditorModal';
import { QuizTakerModal } from '../components/QuizTakerModal';
import type { Lesson, LessonContent } from '../api/endpoints';

export function LessonViewerPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const user = getStoredUser();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'quiz'>('content');
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    if (!lessonId) return;
    try {
      setLoading(true);
      const res = await getLesson(lessonId);
      setLesson(res.lesson);
      setCompleted(res.completed);
    } catch (err) {
      setError('Не удалось загрузить лекцию');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!lessonId) return;
    try {
      await completeLessonLesson(lessonId);
      setCompleted(true);
    } catch {
      setError('Не удалось отметить как завершённую');
    }
  };

  const isTeacher = user?.role === 'TEACHER';
  const isOwner = isTeacher && lesson?.createdBy === user.id;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">Загружаем лекцию...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">Лекция не найдена</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/app/lessons')}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-200 transition"
        >
          ← Назад к лекциям
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">{lesson.title}</h1>
        {lesson.description && <p className="text-slate-400">{lesson.description}</p>}
        <div className="mt-4 flex items-center gap-4">
          {completed && <div className="inline-block bg-emerald-900/30 text-emerald-300 px-3 py-1 rounded-full text-sm">✅ Лекция пройдена</div>}
          {isOwner && (
            <button
              onClick={() => setShowEditor(true)}
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              ✏️ Учитель: Редактировать
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-900/30 text-red-300 rounded-lg mb-4">{error}</div>}

      <div className="flex gap-4 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-3 px-2 font-medium transition ${
            activeTab === 'content' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📚 Материалы ({lesson.contents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`pb-3 px-2 font-medium transition ${
            activeTab === 'quiz' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ❓ Тесты ({lesson.quizzes?.length || 0})
        </button>
      </div>

      {activeTab === 'content' && (
        <div className="space-y-6">
          {lesson.contents && lesson.contents.length > 0 ? (
            lesson.contents.map((content, idx) => <LessonContentCard key={content.id} content={content} index={idx} />)
          ) : (
            <div className="text-center text-slate-400 py-12">Нет материалов</div>
          )}

          {!completed && (
            <button
              onClick={handleComplete}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 rounded-lg transition mt-8"
            >
              ✅ Завершить лекцию
            </button>
          )}
        </div>
      )}

      {activeTab === 'quiz' && (
        <div>
          {lesson.quizzes && lesson.quizzes.length > 0 ? (
            <div className="space-y-4">
              {lesson.quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-emerald-500 transition">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">{quiz.title}</h3>
                  {quiz.description && <p className="text-slate-400 text-sm mb-4">{quiz.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">❓ Вопросов: {quiz.questions?.length || 0}</span>
                    <button
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg font-medium transition"
                    >
                      Начать тест
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">Нет тестов</div>
          )}
        </div>
      )}

      {showEditor && lessonId && (
        <LessonEditorModal
          lessonId={lessonId}
          onClose={() => {
            setShowEditor(false);
            loadLesson();
          }}
          isTeacher={isTeacher}
        />
      )}

      {selectedQuizId && (
        <QuizTakerModal
          quizId={selectedQuizId}
          onClose={() => {
            setSelectedQuizId(null);
            loadLesson();
          }}
        />
      )}
    </div>
  );
}

interface LessonContentCardProps {
  content: LessonContent;
  index: number;
}

function LessonContentCard({ content, index }: LessonContentCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileUrl = getAvatarUrl(content.url) ?? content.url;

  const getIcon = () => {
    switch (content.type) {
      case 'FILE_PDF':
        return '📄';
      case 'FILE_WORD':
        return '📝';
      case 'FILE_POWERPOINT':
        return '🎬';
      case 'VIDEO_YOUTUBE':
        return '▶️';
      case 'TEXT':
        return '📌';
      default:
        return '📄';
    }
  };

  const getLabel = () => {
    switch (content.type) {
      case 'FILE_PDF':
        return 'PDF документ';
      case 'FILE_WORD':
        return 'Word документ';
      case 'FILE_POWERPOINT':
        return 'PowerPoint презентация';
      case 'VIDEO_YOUTUBE':
        return 'YouTube видео';
      case 'TEXT':
        return 'Текстовый материал';
      default:
        return 'Материал';
    }
  };

  const getOriginalFilename = (url: string, fallbackTitle: string) => {
    try {
      const parsed = new URL(url, window.location.origin);
      const originalName = parsed.searchParams.get('originalName');
      if (originalName && originalName.trim()) {
        return originalName;
      }
    } catch {
      // fallback to content title
    }

    return fallbackTitle.trim() || 'file';
  };

  const handleDownload = async (url: string, title: string) => {
    try {
      setIsDownloading(true);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Empty file');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = getOriginalFilename(url, title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert('Не удалось скачать файл. Попробуйте загрузить его заново.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-slate-700 transition text-left"
      >
        <div className="text-2xl">{getIcon()}</div>
        <div className="flex-1">
          <h3 className="text-slate-100 font-semibold">{content.title}</h3>
          <p className="text-slate-400 text-sm">{getLabel()}</p>
        </div>
        <div className="text-slate-400">{expanded ? '▼' : '▶'}</div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-6 bg-slate-900/50">
          {content.type === 'VIDEO_YOUTUBE' && content.url && (
            <div className="mb-4 aspect-video rounded-lg overflow-hidden">
              <iframe
                src={content.url}
                title={content.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          {content.type === 'TEXT' && content.text && (
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 whitespace-pre-wrap">{content.text}</p>
            </div>
          )}

          {(content.type.includes('FILE') || content.type === 'VIDEO_YOUTUBE') && fileUrl && content.type !== 'VIDEO_YOUTUBE' && content.type !== 'TEXT' && (
            <button
              type="button"
              onClick={() => handleDownload(fileUrl, content.title)}
              disabled={isDownloading}
              className="inline-block bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 px-4 py-2 rounded-lg font-medium transition"
            >
              {isDownloading ? 'Скачиваем...' : '📥 Скачать'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
