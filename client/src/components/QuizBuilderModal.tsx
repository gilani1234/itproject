import { useEffect, useState } from 'react';
import { createQuiz, addQuizQuestion, getQuiz, deleteQuizQuestion, updateQuiz } from '../api/endpoints';
import type { Quiz } from '../api/endpoints';

interface QuizBuilderModalProps {
  lessonId: string;
  quizId?: string; // For editing existing quiz
  onClose: () => void;
  onQuizCreated: () => void;
}

interface QuestionFormState {
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
  options: Array<{ text: string; isCorrect: boolean }>;
}

export function QuizBuilderModal({ lessonId, quizId, onClose, onQuizCreated }: QuizBuilderModalProps) {
  const isEditMode = !!quizId;
  const [step, setStep] = useState<'quiz-info' | 'questions' | 'review'>(isEditMode ? 'questions' : 'quiz-info');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Load existing quiz if in edit mode
  useEffect(() => {
    if (isEditMode && quizId) {
      loadQuiz();
    }
  }, [quizId, isEditMode]);

  const loadQuiz = async () => {
    if (!quizId) return;
    try {
      setLoading(true);
      const res = await getQuiz(quizId);
      setQuiz(res.quiz);
      setQuizTitle(res.quiz.title);
      setQuizDescription(res.quiz.description || '');
      setPassingScore(String(res.quiz.passingScore));
      setMaxAttempts(String(res.quiz.maxAttempts));
    } catch (err) {
      setError('Не удалось загрузить тест');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Quiz Info Form
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [passingScore, setPassingScore] = useState('70');
  const [maxAttempts, setMaxAttempts] = useState('1');

  // Question Form
  const [questionForm, setQuestionForm] = useState<QuestionFormState>({
    text: '',
    type: 'SINGLE_CHOICE',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  });
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Create or Update Quiz
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      if (isEditMode && quiz) {
        // Update existing quiz
        const res = await updateQuiz(quiz.id, quizTitle, quizDescription || undefined, parseInt(passingScore), parseInt(maxAttempts));
        setQuiz(res.quiz);
      } else {
        // Create new quiz
        const res = await createQuiz(lessonId, quizTitle, quizDescription || undefined, parseInt(passingScore), parseInt(maxAttempts));
        setQuiz(res.quiz);
      }
      setStep('questions');
    } catch (err) {
      setError('Не удалось сохранить тест');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !questionForm.text.trim()) return;

    // Валидация
    if (questionForm.type !== 'TEXT') {
      if (questionForm.options.length < 2) {
        setError('Нужно минимум 2 варианта ответа');
        return;
      }
      if (!questionForm.options.some((opt) => opt.isCorrect)) {
        setError('Выберите правильный ответ');
        return;
      }
      if (questionForm.options.some((opt) => !opt.text.trim())) {
        setError('Все варианты должны быть заполнены');
        return;
      }
    }

    try {
      setSubmittingQuestion(true);
      setError(null);
      await addQuizQuestion(quiz.id, questionForm.text, questionForm.type, questionForm.options);

      // Перезагрузить квиз, чтобы показать новый вопрос
      const updatedQuiz = await getQuiz(quiz.id);
      setQuiz(updatedQuiz.quiz);

      // Очистить форму
      setQuestionForm({
        text: '',
        type: 'SINGLE_CHOICE',
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ],
      });
    } catch (err) {
      setError('Не удалось добавить вопрос');
      console.error(err);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Удалить вопрос?')) return;

    try {
      await deleteQuizQuestion(questionId);
      if (quiz) {
        const updatedQuiz = await getQuiz(quiz.id);
        setQuiz(updatedQuiz.quiz);
      }
    } catch (err) {
      setError('Не удалось удалить вопрос');
    }
  };

  // Add Option
  const addOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { text: '', isCorrect: false }],
    });
  };

  // Remove Option
  const removeOption = (idx: number) => {
    if (questionForm.options.length <= 2) return;
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== idx),
    });
  };

  // Update Option
  const updateOption = (idx: number, field: 'text' | 'isCorrect', value: any) => {
    const newOptions = [...questionForm.options];
    if (field === 'text') {
      newOptions[idx].text = value;
    } else {
      if (questionForm.type === 'SINGLE_CHOICE') {
        // Для single choice только один правильный ответ
        newOptions.forEach((opt) => (opt.isCorrect = false));
      }
      newOptions[idx].isCorrect = value;
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">
            {!quiz ? (isEditMode ? '✏️ Редактировать тест' : '➕ Создать тест') : `✏️ ${quiz.title}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="text-center text-slate-400">Загружаем...</div>
          )}

          {error && <div className="p-3 bg-red-900/30 text-red-300 rounded-lg text-sm">{error}</div>}

          {/* Step 1: Quiz Info */}
          {step === 'quiz-info' && !quiz && !loading && (
            <form onSubmit={handleCreateQuiz} className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Название теста</label>
                <input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Например: Quiz - Основы программирования"
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Описание (опционально)</label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Введите описание теста..."
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Проходной балл (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Максимум попыток</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              <button
                disabled={loading || !quizTitle.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Сохраняем...' : isEditMode ? 'Сохранить и перейти к вопросам' : 'Создать тест и добавить вопросы'}
              </button>
            </form>
          )}

          {/* Edit Quiz Info Button */}
          {quiz && isEditMode && (
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <button
                onClick={() => setStep('quiz-info')}
                className="w-full text-left text-slate-300 hover:text-slate-100 font-medium py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded transition"
              >
                ✏️ Редактировать информацию о тесте
              </button>
            </div>
          )}

          {step === 'quiz-info' && quiz && isEditMode && (
            <form onSubmit={handleCreateQuiz} className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Название теста</label>
                <input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Например: Quiz - Основы программирования"
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Описание (опционально)</label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Введите описание теста..."
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Проходной балл (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Максимум попыток</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  disabled={loading || !quizTitle.trim()}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-lg transition"
                >
                  {loading ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('questions')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-3 rounded-lg transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Add Questions */}
          {quiz && (
            <>
              {/* Existing Questions */}
              {quiz.questions && quiz.questions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">📋 Вопросы ({quiz.questions.length})</h3>
                  <div className="space-y-3">
                    {quiz.questions.map((question, qIdx) => (
                      <div key={question.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-slate-100 font-medium text-sm">
                            {qIdx + 1}. {question.text}
                          </h4>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-slate-400 text-xs mb-2">
                          Тип:{' '}
                          {question.type === 'SINGLE_CHOICE'
                            ? 'Один ответ'
                            : question.type === 'MULTIPLE_CHOICE'
                              ? 'Несколько ответов'
                              : 'Текстовый'}
                        </p>

                        {question.options && question.options.length > 0 && (
                          <div className="text-xs text-slate-400 space-y-1">
                            {question.options.map((opt) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <span className={opt.isCorrect ? 'text-emerald-400' : ''}>
                                  {opt.isCorrect ? '✓' : '○'} {opt.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Question Form */}
              <form onSubmit={handleAddQuestion} className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">➕ Добавить вопрос</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Текст вопроса</label>
                  <input
                    value={questionForm.text}
                    onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                    placeholder="Введите вопрос..."
                    className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Тип вопроса</label>
                  <select
                    value={questionForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
                      if (newType === 'TEXT') {
                        setQuestionForm({ ...questionForm, type: newType, options: [] });
                      } else {
                        setQuestionForm({
                          ...questionForm,
                          type: newType,
                          options: [
                            { text: '', isCorrect: true },
                            { text: '', isCorrect: false },
                          ],
                        });
                      }
                    }}
                    className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none"
                  >
                    <option value="SINGLE_CHOICE">Один правильный ответ</option>
                    <option value="MULTIPLE_CHOICE">Несколько правильных ответов</option>
                    <option value="TEXT">Текстовый ответ (требует проверки)</option>
                  </select>
                </div>

                {/* Options */}
                {questionForm.type !== 'TEXT' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">Варианты ответов</label>
                    {questionForm.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type={questionForm.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                          name={`correct-${idx}`}
                          checked={option.isCorrect}
                          onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <input
                          value={option.text}
                          onChange={(e) => updateOption(idx, 'text', e.target.value)}
                          placeholder={`Вариант ${idx + 1}`}
                          className="flex-1 bg-slate-950 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                        />
                        {questionForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    {questionForm.options.length > 0 && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                      >
                        + Добавить вариант
                      </button>
                    )}
                  </div>
                )}

                <button
                  disabled={submittingQuestion || !questionForm.text.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-lg transition"
                >
                  {submittingQuestion ? 'Добавляем...' : 'Добавить вопрос'}
                </button>
              </form>

              {/* Complete Button */}
              {quiz.questions && quiz.questions.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onQuizCreated();
                      onClose();
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 rounded-lg transition"
                  >
                    ✓ Тест готов
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
