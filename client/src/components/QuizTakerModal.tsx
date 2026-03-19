import { useState, useEffect } from 'react';
import { getQuiz, submitQuiz } from '../api/endpoints';
import { HttpError } from '../api/http';
import type { Quiz } from '../api/endpoints';

interface QuizTakerModalProps {
  quizId: string;
  onClose: () => void;
}

interface UserAnswer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

interface SubmissionResult {
  score: number;
  maxScore: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    textAnswer?: string;
    selectedOptionId?: string;
  }>;
}

export function QuizTakerModal({ quizId, onClose }: QuizTakerModalProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const res = await getQuiz(quizId);
      setQuiz(res.quiz);
      // Инициализировать пустые ответы
      const emptyAnswers = (res.quiz.questions || []).map((q) => ({
        questionId: q.id,
      }));
      setAnswers(emptyAnswers);
    } catch (err) {
      setError('Не удалось загрузить тест');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers(
      answers.map((a) => (a.questionId === questionId ? { ...a, selectedOptionId: optionId } : a))
    );
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers(answers.map((a) => (a.questionId === questionId ? { ...a, textAnswer: text } : a)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      const res = await submitQuiz(quizId, answers);
      setResult({
        score: res.submission.score,
        maxScore: res.submission.maxScore,
        passed: res.submission.passed,
        answers: res.submission.answers || [],
      });
    } catch (err: any) {
      if (err instanceof HttpError && err.status === 403) {
        const body = err.body as any;
        if (body?.error === 'Attempts exhausted') {
          setError(body?.message || 'Количество попыток исчерпано');
        } else {
          setError('Доступ запрещён');
        }
      } else {
        setError('Не удалось отправить тест');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-slate-900 rounded-2xl p-8 text-slate-100">загружаем тест...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-slate-900 rounded-2xl p-8 text-slate-100">Тест не найден</div>
      </div>
    );
  }

  // Show results after submission
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-100">📊 Результаты теста</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Score */}
            <div
              className={`p-6 rounded-lg border-2 text-center ${
                result.passed
                  ? 'bg-emerald-900/30 border-emerald-500'
                  : 'bg-red-900/30 border-red-500'
              }`}
            >
              <p className="text-5xl font-bold mb-2">
                {result.score}
                <span className="text-2xl text-slate-400">/{result.maxScore}</span>
              </p>
              <p className={`text-lg font-semibold ${result.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.passed ? '✓ Тест пройден!' : '✗ Тест не пройден'}
              </p>
              {quiz.passingScore && (
                <p className="text-sm text-slate-400 mt-2">Проходной балл: {quiz.passingScore}%</p>
              )}
            </div>

            {/* Answers Review */}
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4">📋 Ответы</h3>
              <div className="space-y-4">
                {quiz.questions?.map((question, idx) => {
                  const questionResult = result.answers.find((a) => a.questionId === question.id);
                  const isCorrect = questionResult?.isCorrect;

                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg border ${
                        isCorrect
                          ? 'bg-emerald-900/20 border-emerald-700'
                          : 'bg-red-900/20 border-red-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`text-2xl ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCorrect ? '✓' : '✗'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-100">
                            {idx + 1}. {question.text}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            {question.type === 'SINGLE_CHOICE'
                              ? 'Один ответ'
                              : question.type === 'MULTIPLE_CHOICE'
                                ? 'Несколько ответов'
                                : 'Текстовый ответ'}
                          </p>
                        </div>
                      </div>

                      {question.type !== 'TEXT' && question.options && (
                        <div className="space-y-2 ml-11">
                          {question.options.map((option) => {
                            const isSelected =
                              questionResult?.selectedOptionId === option.id;
                            return (
                              <div
                                key={option.id}
                                className={`p-2 rounded text-sm ${
                                  isSelected
                                    ? 'bg-slate-700 border-l-2 border-emerald-500'
                                    : 'text-slate-400'
                                }`}
                              >
                                <span className={isSelected ? 'text-slate-100 font-medium' : ''}>
                                  {isSelected ? '➤ ' : '○ '}
                                  {option.text}
                                </span>
                                {option.isCorrect && (
                                  <span className="ml-2 text-emerald-400 text-xs">(правильно)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.type === 'TEXT' && (
                        <div className="ml-11">
                          <p className="text-sm text-slate-300 bg-slate-800 p-3 rounded">
                            {questionResult?.textAnswer || '(нет ответа)'}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            ⏱️ Текстовые ответы требуют проверки преподавателем
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 rounded-lg transition"
            >
              ✓ Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz taking interface
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-100">{quiz.title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl">
              ✕
            </button>
          </div>
          {quiz.description && (
            <p className="text-slate-400 text-sm">{quiz.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
            <span>📝 Вопросов: {quiz.questions?.length || 0}</span>
            {quiz.passingScore && <span>🎯 Проходной балл: {quiz.passingScore}%</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-900/30 text-red-300 rounded-lg text-sm">{error}</div>}

          {/* Questions */}
          {quiz.questions?.map((question, qIdx) => {
            const userAnswer = answers.find((a) => a.questionId === question.id);

            return (
              <div key={question.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">
                    {qIdx + 1}. {question.text}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {question.type === 'SINGLE_CHOICE'
                      ? '(выберите один правильный ответ)'
                      : question.type === 'MULTIPLE_CHOICE'
                        ? '(выберите все правильные ответы)'
                        : '(введите текстовый ответ)'}
                  </p>
                </div>

                {question.type === 'SINGLE_CHOICE' && question.options && (
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={userAnswer?.selectedOptionId === option.id}
                          onChange={() => handleSelectOption(question.id, option.id)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1 text-slate-100 group-hover:text-slate-50">{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'MULTIPLE_CHOICE' && question.options && (
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={userAnswer?.selectedOptionId === option.id}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectOption(question.id, option.id);
                            } else {
                              setAnswers(
                                answers.map((a) =>
                                  a.questionId === question.id ? { ...a, selectedOptionId: undefined } : a
                                )
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="flex-1 text-slate-100 group-hover:text-slate-50">{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'TEXT' && (
                  <textarea
                    value={userAnswer?.textAnswer || ''}
                    onChange={(e) => handleTextAnswer(question.id, e.target.value)}
                    placeholder="Напишите ваш ответ здесь..."
                    className="w-full bg-slate-950 text-slate-100 rounded-lg px-4 py-3 border border-slate-700 focus:border-emerald-500 outline-none h-24 resize-none"
                  />
                )}
              </div>
            );
          })}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !quiz.questions || quiz.questions.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-lg transition"
          >
            {submitting ? '⏳ Проверяем...' : '✓ Отправить тест'}
          </button>
        </form>
      </div>
    </div>
  );
}
