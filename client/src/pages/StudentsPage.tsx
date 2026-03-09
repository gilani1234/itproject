import { useEffect, useState } from 'react';
import { listAllStudents, getStudentProfile, submitPeerReview, getPeerReviewsForUser, type PublicStudentProfile, type StudentProfileDetail } from '../api/endpoints';
import { useAuth } from '../lib/auth';

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<PublicStudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfileDetail | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    (async () => {
      const res = await listAllStudents();
      setStudents(res.users);
      setLoading(false);
    })();
  }, []);

  const handleSelectStudent = async (student: PublicStudentProfile) => {
    const profile = await getStudentProfile(student.id);
    setSelectedStudent(profile.user);

    const reviewsRes = await getPeerReviewsForUser(student.id);
    setReviews(reviewsRes.reviews);
    setAvgRating(reviewsRes.avgRating);
    setMyRating(0);
    setReviewComment('');
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
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student)}
                className={`w-full text-left p-4 rounded-xl ring-1 transition ${
                  selectedStudent?.id === student.id
                    ? 'bg-slate-800 ring-emerald-500'
                    : 'bg-slate-900 ring-slate-800 hover:ring-emerald-500'
                }`}
              >
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-slate-400 mt-1">{student.email}</div>
                <div className="text-sm text-emerald-400 font-semibold mt-2">⭐ {student.rating}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Student Detail */}
        {selectedStudent && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 rounded-xl p-6 ring-1 ring-slate-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center text-3xl">
                  {selectedStudent.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedStudent.name}</h3>
                  <p className="text-slate-400">{selectedStudent.email}</p>
                  <p className="text-emerald-400 font-semibold mt-1">⭐ Рейтинг: {selectedStudent.rating}</p>
                </div>
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
