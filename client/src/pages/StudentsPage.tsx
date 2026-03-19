import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addSprintRating,
  getPeerReviewsForUser,
  getStudentProfile,
  getTeacherStudentPerformance,
  listAllStudents,
  removeStudentFromTeacherTeams,
  submitPeerReview,
  type PublicStudentProfile,
  type StudentProfileDetail,
  type TeacherStudentPerformance,
} from '../api/endpoints';
import { useAuth, getAvatarUrl } from '../lib/auth';

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<PublicStudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileDetail | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherStudentPerformance | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [projectPoints, setProjectPoints] = useState(80);
  const [projectFeedback, setProjectFeedback] = useState('');
  const [savingTeacherGrade, setSavingTeacherGrade] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await listAllStudents();
      setStudents(res.users);
      setLoading(false);
    })();
  }, []);

  const reloadStudents = async () => {
    const res = await listAllStudents();
    setStudents(res.users);
  };

  const handleSelectStudent = async (student: PublicStudentProfile) => {
    const profile = await getStudentProfile(student.id);
    setSelectedStudent(profile.user);

    const reviewsRes = await getPeerReviewsForUser(student.id);
    setReviews(reviewsRes.reviews);
    setAvgRating(reviewsRes.avgRating);
    setMyRating(0);
    setReviewComment('');

    if (user?.role === 'TEACHER') {
      try {
        setTeacherLoading(true);
        setTeacherError(null);
        const perf = await getTeacherStudentPerformance(student.id);
        setTeacherPerformance(perf);
        setSelectedSprintId(perf.sprints[0]?.id ?? '');
      } catch (err) {
        setTeacherPerformance(null);
        setTeacherError(err instanceof Error ? err.message : 'Failed to load teacher data');
      } finally {
        setTeacherLoading(false);
      }
    } else {
      setTeacherPerformance(null);
      setTeacherError(null);
      setSelectedSprintId('');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedStudent || myRating < 1 || myRating > 5) return;

    await submitPeerReview(selectedStudent.id, myRating, reviewComment);
    setMyRating(0);
    setReviewComment('');

    // Refresh reviews
    const reviewsRes = await getPeerReviewsForUser(selectedStudent.id);
    setReviews(reviewsRes.reviews);
    setAvgRating(reviewsRes.avgRating);
  };

  const handleTeacherGradeSubmit = async () => {
    if (!selectedStudent || !selectedSprintId) return;

    try {
      setSavingTeacherGrade(true);
      setTeacherError(null);
      await addSprintRating(selectedSprintId, selectedStudent.id, projectPoints, projectFeedback || undefined);
      const perf = await getTeacherStudentPerformance(selectedStudent.id);
      setTeacherPerformance(perf);
      setProjectFeedback('');
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Failed to save teacher grade');
    } finally {
      setSavingTeacherGrade(false);
    }
  };

  const handleRemoveStudent = async (student: PublicStudentProfile) => {
    if (!confirm(`Убрать ${student.name} из ваших команд?`)) return;

    try {
      setRemovingStudentId(student.id);
      await removeStudentFromTeacherTeams(student.id);
      await reloadStudents();

      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
        setTeacherPerformance(null);
      }
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Failed to remove student');
    } finally {
      setRemovingStudentId(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Загрузка студентов...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Профили студентов</h2>
        <p className="text-sm text-slate-400">Смотри профили коллег и оценивай их</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-1">
          <div className="space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                className={`rounded-xl ring-1 transition ${
                  selectedStudent?.id === student.id
                    ? 'bg-slate-800 ring-emerald-500'
                    : 'bg-slate-900 ring-slate-800 hover:ring-emerald-500'
                }`}
              >
                {user?.role === 'TEACHER' && (
                  <div className="flex justify-end px-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(student)}
                      disabled={removingStudentId === student.id}
                      title="Убрать студента"
                      className="h-6 w-6 rounded-full text-slate-400 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-50 transition"
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleSelectStudent(student)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-center gap-3">
                    {student.avatar ? (
                      <img
                        src={getAvatarUrl(student.avatar)}
                        alt={student.name}
                        className="w-8 h-8 rounded-full object-cover bg-emerald-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold">
                        {student.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span className="font-medium">{student.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{student.email}</div>
                  <div className="text-sm text-emerald-400 font-semibold mt-2">⭐ {student.rating}</div>
                </button>
                <div className="px-4 pb-3">
                  <Link
                    to={`/app/profile/${student.id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Посмотреть полный профиль →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Detail */}
        {selectedStudent && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 rounded-xl p-6 ring-1 ring-slate-800">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center text-3xl overflow-hidden">
                    {selectedStudent.avatar ? (
                      <img
                        src={getAvatarUrl(selectedStudent.avatar)}
                        alt={selectedStudent.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      selectedStudent.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedStudent.name}</h3>
                    <p className="text-slate-400">{selectedStudent.email}</p>
                    <p className="text-emerald-400 font-semibold mt-1">⭐ Рейтинг: {selectedStudent.rating}</p>
                  </div>
                </div>
                <Link
                  to={`/app/profile/${selectedStudent.id}`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition"
                >
                  Открыть профиль →
                </Link>
              </div>

              {/* Ratings History */}
              {selectedStudent.ratings && selectedStudent.ratings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 text-sm">История оценок</h4>
                  <div className="space-y-2">
                    {selectedStudent.ratings.map((r, idx) => (
                      <div key={idx} className="bg-slate-800 p-2 rounded text-xs text-slate-300">
                        <span className="text-emerald-400 font-semibold">{r.points} pts</span> — {r.sprint?.name || 'Оценка'} ({new Date(r.createdAt).toLocaleDateString('ru')})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {selectedStudent.achievements && selectedStudent.achievements.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-3 text-sm">Достижения</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.achievements.map((a) => (
                      <div key={a.id} className="bg-emerald-900/30 px-3 py-1 rounded-lg text-xs text-emerald-300">
                        🏆 {a.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user?.role === 'TEACHER' && (
              <div className="bg-slate-900 rounded-xl p-6 ring-1 ring-slate-800 space-y-4">
                <h4 className="font-medium text-lg">Teacher Review</h4>

                {teacherLoading && <p className="text-sm text-slate-400">Loading student performance...</p>}
                {teacherError && <p className="text-sm text-red-300">{teacherError}</p>}

                {teacherPerformance && !teacherLoading && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400">Quiz Average</div>
                        <div className="text-2xl font-semibold text-cyan-300">{teacherPerformance.summary.quizAverageScore}</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400">Quiz Attempts</div>
                        <div className="text-2xl font-semibold text-cyan-300">{teacherPerformance.summary.quizAttempts}</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400">Project Scale</div>
                        <div className="text-2xl font-semibold text-amber-300">{teacherPerformance.summary.projectAverageScore}</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400">Project Grades</div>
                        <div className="text-2xl font-semibold text-amber-300">{teacherPerformance.summary.projectGrades}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="text-sm text-slate-300">Sprint</label>
                        <select
                          value={selectedSprintId}
                          onChange={(e) => setSelectedSprintId(e.target.value)}
                          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                        >
                          <option value="">Select sprint...</option>
                          {teacherPerformance.sprints.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-300">Project Points (0-100)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={projectPoints}
                          onChange={(e) => setProjectPoints(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={handleTeacherGradeSubmit}
                        disabled={!selectedSprintId || savingTeacherGrade}
                        className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
                      >
                        {savingTeacherGrade ? 'Saving...' : 'Save Project Grade'}
                      </button>
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">Teacher feedback (optional)</label>
                      <textarea
                        value={projectFeedback}
                        onChange={(e) => setProjectFeedback(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm resize-none"
                        placeholder="Comment on student project work..."
                      />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium mb-2">Quiz Scores</h5>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {teacherPerformance.quizSubmissions.length === 0 && (
                            <div className="text-xs text-slate-400">No quiz attempts yet.</div>
                          )}
                          {teacherPerformance.quizSubmissions.map((q) => (
                            <div key={q.id} className="bg-slate-800 rounded p-2 text-xs">
                              <div className="font-medium">{q.quiz.title}</div>
                              <div className="text-slate-400">{q.quiz.lesson.title}</div>
                              <div className="mt-1">
                                <span className="text-cyan-300 font-semibold">
                                  {q.score}/{q.maxScore}
                                </span>{' '}
                                <span className={q.passed ? 'text-emerald-400' : 'text-red-400'}>
                                  {q.passed ? 'Passed' : 'Not passed'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium mb-2">Project Grades</h5>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {teacherPerformance.projectRatings.length === 0 && (
                            <div className="text-xs text-slate-400">No project grades yet.</div>
                          )}
                          {teacherPerformance.projectRatings.map((r) => (
                            <div key={r.id} className="bg-slate-800 rounded p-2 text-xs">
                              <div className="font-medium">{r.sprint.name}</div>
                              <div className="text-amber-300 font-semibold mt-1">{r.points}/100</div>
                              {r.feedback && <div className="text-slate-300 mt-1">{r.feedback}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Peer Reviews Section */}
            {user?.id !== selectedStudent.id && (
              <div className="bg-slate-900 rounded-xl p-6 ring-1 ring-slate-800">
                <h4 className="font-medium mb-4">Peer Review (оценка от коллег)</h4>

                {/* Average Rating */}
                <div className="mb-4 p-4 bg-slate-800 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">Средняя оценка от других</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {avgRating}/5 <span className="text-lg">⭐</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Всего оценок: {reviews.length}</div>
                </div>

                {/* My Review */}
                <div className="space-y-3 border-t border-slate-700 pt-4">
                  <div>
                    <label className="text-sm font-medium">Твоя оценка</label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setMyRating(star)}
                          className={`text-2xl transition ${
                            myRating === star
                              ? 'scale-125'
                              : 'opacity-50 hover:opacity-100'
                          }`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Комментарий (опционально)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Напиши свой отзыв..."
                      className="w-full mt-2 bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    disabled={myRating < 1}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition"
                  >
                    Отправить оценку
                  </button>
                </div>

                {/* All Reviews */}
                {reviews.length > 0 && (
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    <h5 className="text-sm font-medium mb-3">Отзывы</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {reviews.map((r) => (
                        <div key={r.id} className="bg-slate-800 p-3 rounded text-xs">
                          <div className="font-medium mb-1">
                            {r.fromUser?.name} <span className="text-emerald-400">{'⭐'.repeat(r.rating)}</span>
                          </div>
                          {r.comment && <div className="text-slate-300">{r.comment}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
