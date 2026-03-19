import { getToken } from '../lib/auth';
// Upload avatar (file)
export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(
    (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api') + '/auth/avatar',
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    const parsed = text ? safeJson(text) : null;
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
        ? parsed.error
        : 'Ошибка загрузки аватара';
    throw new Error(message);
  }
  return res.json();
}
import type { AuthUser } from '../lib/auth';
import { request } from './http';

export type LoginResponse = { token: string; user: AuthUser };

export function login(email: string, password: string) {
  return request<LoginResponse>('POST', '/auth/login', { email, password });
}

export function register(payload: {
  email: string;
  name: string;
  password: string;
  role?: 'STUDENT' | 'TEACHER';
  inviteCode?: string;
}) {
  return request<LoginResponse>('POST', '/auth/register', payload);
}

export function me() {
  return request<{ user: AuthUser }>('GET', '/auth/me');
}

export type Team = {
  id: string;
  name: string;
  createdAt: string;
  members: { id: string; teamRole: 'MEMBER' | 'LEAD'; user: AuthUser }[];
};

export function listTeams() {
  return request<{ teams: Team[] }>('GET', '/teams');
}

export function createTeam(name: string) {
  return request<{ team: Team }>('POST', '/teams', { name });
}

export function addTeamMember(teamId: string, email: string, teamRole?: 'MEMBER' | 'LEAD') {
  return request('POST', `/teams/${teamId}/members`, { email, teamRole });
}

export function updateTeam(teamId: string, name: string) {
  return request<{ team: Team }>('PATCH', `/teams/${teamId}`, { name });
}

export function deleteTeam(teamId: string) {
  return request<{ success: boolean }>('DELETE', `/teams/${teamId}`);
}

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type Task = {
  id: string;
  teamId: string;
  sprintId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  points?: number | null;
  deadline?: string | null;
  assigneeId?: string | null;
  assignee?: { id: string; name?: string; email: string } | null;
  order: number;
  isLocked?: boolean;
  attachments?: TaskAttachment[];
};

export function listTasks(teamId: string, sprintId?: string) {
  const query = sprintId ? `?sprintId=${encodeURIComponent(sprintId)}` : '';
  return request<{ tasks: Task[] }>('GET', `/tasks/team/${teamId}${query}`);
}

export function createTask(payload: {
  teamId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  points?: number;
  deadline?: string;
  assigneeId?: string | null;
}) {
  return request<{ task: Task }>('POST', '/tasks', payload);
}

export function updateTask(taskId: string, patch: Partial<Task>) {
  return request<{ task: Task }>('PATCH', `/tasks/${taskId}`, patch);
}

export type Sprint = {
  id: string;
  teamId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isClosed: boolean;
  isLocked?: boolean;
};

export function listSprints(teamId: string) {
  return request<{ sprints: Sprint[] }>('GET', `/sprints/team/${teamId}`);
}

export function createSprint(teamId: string, payload: { name?: string; startsAt?: string; durationDays?: number }) {
  return request<{ sprint: Sprint }>('POST', `/sprints/team/${teamId}`, payload);
}

export type TeamAnalytics = {
  totals: {
    total: number;
    byStatus: Partial<Record<TaskStatus, number>>;
  };
  velocity: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    isClosed: boolean;
    donePoints: number;
  }[];
  topMembers: {
    userId: string;
    name: string;
    email: string;
    tasksDone: number;
    pointsDone: number;
  }[];
};

export function teamAnalytics(teamId: string) {
  return request<TeamAnalytics>('GET', `/analytics/team?teamId=${encodeURIComponent(teamId)}`);
}

export type ChatMessage = {
  id: string;
  teamId: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; role: 'STUDENT' | 'TEACHER' };
};

export function listMessages(teamId: string) {
  return request<{ messages: ChatMessage[] }>('GET', `/chat/team/${teamId}`);
}

export function sendMessage(teamId: string, text: string) {
  return request<{ message: ChatMessage }>('POST', `/chat/team/${teamId}`, { text });
}

export type TaskComment = {
  id: string;
  taskId: string;
  text: string;
  createdAt: string;
  user: AuthUser;
};

export function listComments(taskId: string) {
  return request<{ comments: TaskComment[] }>('GET', `/comments/task/${taskId}`);
}

export function addComment(taskId: string, text: string) {
  return request<{ comment: TaskComment }>('POST', `/comments/task/${taskId}`, { text });
}

export type SprintRating = {
  id: string;
  sprintId: string;
  userId: string;
  points: number;
  feedback?: string | null;
  ratedBy: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; role: 'STUDENT' | 'TEACHER' };
  sprint?: { id: string; name: string; teamId: string };
};

export type UserRating = {
  user: { id: string; name: string; email: string; role: 'STUDENT' | 'TEACHER'; rating: number; totalPoints: number };
  ratings: SprintRating[];
};

export function getUserRating(userId: string) {
  return request<UserRating>('GET', `/ratings/user/${userId}`);
}

export function getSprintRatings(sprintId: string) {
  return request<{ ratings: SprintRating[] }>('GET', `/ratings/sprint/${sprintId}`);
}

export function addSprintRating(sprintId: string, userId: string, points: number, feedback?: string) {
  return request<{ rating: SprintRating }>('POST', '/ratings', { sprintId, userId, points, feedback });
}

export function deleteSprintRating(ratingId: string) {
  return request('DELETE', `/ratings/${ratingId}`);
}

// Task History & Attachments
export type TaskAttachment = {
  id: string;
  taskId: string;
  label: string;
  url: string;
  createdAt: string;
};

export type TaskHistoryRecord = {
  id: string;
  taskId: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  user?: AuthUser;
};

export type AuditLog = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | null;
  changedBy?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
};

export function getTaskHistory(taskId: string) {
  return request<{ history: TaskHistoryRecord[]; auditLogs: AuditLog[] }>('GET', `/tasks/${taskId}/history`);
}

export function uploadTaskAttachment(taskId: string, label: string, url: string) {
  return request<{ attachment: TaskAttachment }>('POST', `/tasks/${taskId}/attachments`, { label, url });
}

export function deleteTaskAttachment(taskId: string, attachmentId: string) {
  return request<{ success: boolean }>('DELETE', `/tasks/${taskId}/attachments/${attachmentId}`);
}

export function lockTask(taskId: string, isLocked: boolean) {
  return request<{ success: boolean }>('PATCH', `/tasks/${taskId}/lock`, { isLocked });
}

export function deleteTask(taskId: string) {
  return request<{ success: boolean }>('DELETE', `/tasks/${taskId}`);
}

// Sprint Lock
export function lockSprint(sprintId: string, isLocked: boolean) {
  return request<{ success: boolean }>('PATCH', `/sprints/${sprintId}/lock`, { isLocked });
}

export function getSprintAuditLogs(sprintId: string) {
  return request<{ auditLogs: AuditLog[] }>('GET', `/sprints/${sprintId}/audit`);
}

// Message Attachments
export type MessageAttachment = {
  id: string;
  messageId: string;
  label: string;
  url: string;
  createdAt: string;
};

export type ChatMessageWithAttachments = ChatMessage & {
  attachments?: MessageAttachment[];
};

export function uploadMessageAttachment(messageId: string, label: string, url: string) {
  return request<{ attachment: MessageAttachment }>('POST', '/chat/attachments', { messageId, label, url });
}

export function deleteMessageAttachment(attachmentId: string) {
  return request<{ success: boolean }>('DELETE', `/chat/attachments/${attachmentId}`);
}

// ====== NEW FEATURES ======

// Peer Review
export type PeerReview = {
  id: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

export function submitPeerReview(toUserId: string, rating: number, comment?: string) {
  return request<{ review: PeerReview }>('POST', '/features/peer-reviews', { toUserId, rating, comment });
}

export function getPeerReviewsForUser(userId: string) {
  return request<{ reviews: PeerReview[]; avgRating: number; totalReviews: number }>('GET', `/features/peer-reviews/user/${userId}`);
}

// Individual Tasks
export type IndividualTask = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  points: number;
  createdAt: string;
  updatedAt: string;
};

export function getIndividualTasks() {
  return request<{ tasks: IndividualTask[] }>('GET', '/features/individual-tasks');
}

export function createIndividualTask(title: string, description?: string, points?: number, dueDate?: string) {
  return request<{ task: IndividualTask }>('POST', '/features/individual-tasks', { title, description, points, dueDate });
}

export function updateIndividualTask(taskId: string, completed: boolean) {
  return request<{ task: IndividualTask }>('PATCH', `/features/individual-tasks/${taskId}`, { completed });
}

export function deleteIndividualTask(taskId: string) {
  return request<{ success: boolean }>('DELETE', `/features/individual-tasks/${taskId}`);
}

// Sprint Planning
export type SprintPlanning = {
  id: string;
  sprintId: string;
  teamId: string;
  content: string;
  createdBy: string;
  creator?: { id: string; name: string; email: string };
  createdAt: string;
};

export function getSprintPlanning(sprintId: string) {
  return request<{ planning: SprintPlanning | null }>('GET', `/sprints/${sprintId}/planning`);
}

export function submitSprintPlanning(sprintId: string, content: string) {
  return request<{ planning: SprintPlanning }>('POST', `/sprints/${sprintId}/planning`, { content });
}

// Sprint Review
export type SprintReview = {
  id: string;
  sprintId: string;
  teamId: string;
  summary: string;
  completed: number;
  notCompleted: number;
  createdBy: string;
  creator?: { id: string; name: string; email: string };
  createdAt: string;
};

export function getSprintReview(sprintId: string) {
  return request<{ review: SprintReview | null }>('GET', `/sprints/${sprintId}/review`);
}

export function submitSprintReview(sprintId: string, summary: string, completed: number, notCompleted: number) {
  return request<{ review: SprintReview }>('POST', `/sprints/${sprintId}/review`, { summary, completed, notCompleted });
}

// Retrospective
export type Retrospective = {
  id: string;
  sprintId: string;
  teamId: string;
  whatWent?: string;
  whatFailed?: string;
  improvements?: string;
  createdBy: string;
  creator?: { id: string; name: string; email: string };
  createdAt: string;
};

export function getRetrospective(sprintId: string) {
  return request<{ retro: Retrospective | null }>('GET', `/sprints/${sprintId}/retro`);
}

export function submitRetrospective(sprintId: string, whatWent?: string, whatFailed?: string, improvements?: string) {
  return request<{ retro: Retrospective }>('POST', `/sprints/${sprintId}/retro`, { whatWent, whatFailed, improvements });
}

// Notifications
export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  relatedId?: string;
  createdAt: string;
};

// ====== LMS: LESSONS ======

export type LessonContent = {
  id: string;
  lessonId: string;
  type: 'FILE_PDF' | 'FILE_WORD' | 'FILE_POWERPOINT' | 'VIDEO_YOUTUBE' | 'TEXT';
  title: string;
  url?: string;
  text?: string;
  order: number;
  createdAt: string;
};

export type Lesson = {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  order: number;
  createdBy: string;
  creator?: { id: string; name: string; email: string };
  contents?: LessonContent[];
  quizzes?: Quiz[];
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
};

export function getLessons(teamId?: string) {
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  return request<{ lessons: Lesson[] }>('GET', `/lms/lessons${query}`);
}

export function getLesson(lessonId: string) {
  return request<{ lesson: Lesson; completed: boolean }>('GET', `/lms/lessons/${lessonId}`);
}

export function createLesson(teamId: string, title: string, description?: string) {
  return request<{ lesson: Lesson }>('POST', '/lms/lessons', { teamId, title, description });
}

export function updateLesson(lessonId: string, title?: string, description?: string, order?: number) {
  return request<{ lesson: Lesson }>('PUT', `/lms/lessons/${lessonId}`, { title, description, order });
}

export function deleteLesson(lessonId: string) {
  return request<{ success: boolean }>('DELETE', `/lms/lessons/${lessonId}`);
}

export function addLessonContent(lessonId: string, type: LessonContent['type'], title: string, url?: string, text?: string) {
  return request<{ content: LessonContent }>('POST', `/lms/lessons/${lessonId}/content`, { lessonId, type, title, url, text });
}

export function uploadLessonFile(lessonId: string, file: File, title: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
  const token = getToken();

  return fetch(`${apiBaseUrl}/lms/lessons/${lessonId}/upload`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      const parsed = text ? safeJson(text) : null;
      const message =
        parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
          ? parsed.error
          : 'Upload failed';
      throw new Error(message);
    }
    return res.json() as Promise<{ content: LessonContent; fileUrl: string }>;
  });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function deleteLessonContent(lessonId: string, contentId: string) {
  return request<{ success: boolean }>('DELETE', `/lms/lessons/${lessonId}/content/${contentId}`);
}

export function completeLessonLesson(lessonId: string) {
  return request<{ completion: any }>('POST', `/lms/lessons/${lessonId}/complete`, {});
}

// ====== LMS: QUIZZES ======

export type QuizOption = {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

export type QuizQuestion = {
  id: string;
  quizId: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT';
  order: number;
  options?: QuizOption[];
  createdAt: string;
};

export type Quiz = {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  questions?: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type QuizAnswer = {
  id: string;
  submissionId: string;
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect: boolean;
};

export type QuizSubmission = {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: string;
  answers?: QuizAnswer[];
};

export function createQuiz(lessonId: string, title: string, description?: string, passingScore?: number, maxAttempts?: number) {
  return request<{ quiz: Quiz }>('POST', '/lms/quizzes', { lessonId, title, description, passingScore, maxAttempts });
}

export function getQuiz(quizId: string) {
  return request<{ quiz: Quiz }>('GET', `/lms/quizzes/${quizId}`);
}

export function updateQuiz(quizId: string, title?: string, description?: string, passingScore?: number, maxAttempts?: number) {
  return request<{ quiz: Quiz }>('PUT', `/lms/quizzes/${quizId}`, { title, description, passingScore, maxAttempts });
}

export function deleteQuiz(quizId: string) {
  return request<{ success: boolean }>('DELETE', `/lms/quizzes/${quizId}`);
}

export function addQuizQuestion(quizId: string, text: string, type: QuizQuestion['type'], options?: Array<{ text: string; isCorrect: boolean }>) {
  return request<{ question: QuizQuestion }>('POST', `/lms/quizzes/${quizId}/questions`, { quizId, text, type, options });
}

export function deleteQuizQuestion(questionId: string) {
  return request<{ success: boolean }>('DELETE', `/lms/questions/${questionId}`);
}

export function submitQuiz(quizId: string, answers: Array<{ questionId: string; selectedOptionId?: string; textAnswer?: string }>) {
  return request<{ submission: QuizSubmission; passed: boolean }>('POST', `/lms/quizzes/${quizId}/submit`, { answers });
}

export function getQuizSubmissions(quizId: string) {
  return request<{ submissions: QuizSubmission[] }>('GET', `/lms/quizzes/${quizId}/submissions`);
}

export function getNotifications() {
  return request<{ notifications: Notification[] }>('GET', '/features/notifications');
}

export function markNotificationAsRead(notificationId: string) {
  return request<{ notification: Notification }>('PATCH', `/features/notifications/${notificationId}/read`);
}

// Public Student Profiles
export type PublicStudentProfile = {
  id: string;
  name: string;
  email: string;
  rating: number;
  totalPoints: number;
  avatar?: string | null;
  bio?: string | null;
  createdAt: string;
};

export function listAllStudents() {
  return request<{ users: PublicStudentProfile[] }>('GET', '/features/users');
}

export function removeStudentFromTeacherTeams(userId: string) {
  return request<{ success: boolean; removedFromTeams: number }>('DELETE', `/features/students/${userId}`);
}

export type StudentProfileDetail = PublicStudentProfile & {
  achievements?: Array<{ id: string; type: string; description: string; earnedAt: string }>;
  ratings?: Array<{ points: number; createdAt: string; sprint?: { name: string } }>;
};

export function getStudentProfile(userId: string) {
  return request<{ user: StudentProfileDetail }>('GET', `/features/users/${userId}`);
}

export type TeacherStudentPerformance = {
  student: { id: string; name: string; email: string };
  sharedTeamIds: string[];
  sprints: Array<{
    id: string;
    teamId: string;
    name: string;
    startsAt: string;
    endsAt: string;
    isClosed: boolean;
  }>;
  projectRatings: Array<{
    id: string;
    sprintId: string;
    points: number;
    feedback?: string | null;
    createdAt: string;
    updatedAt: string;
    sprint: { id: string; name: string; teamId: string };
  }>;
  quizSubmissions: Array<{
    id: string;
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    submittedAt: string;
    quiz: { id: string; title: string; lesson: { id: string; title: string; teamId: string } };
  }>;
  summary: {
    quizAverageScore: number;
    projectAverageScore: number;
    quizAttempts: number;
    projectGrades: number;
  };
};

export function getTeacherStudentPerformance(userId: string) {
  return request<TeacherStudentPerformance>('GET', `/features/teacher/students/${userId}/performance`);
}

// Update own profile
export function updateProfile(name?: string, avatar?: string | null, bio?: string | null) {
  return request<{ user: AuthUser }>('PUT', '/auth/me', { name, avatar, bio });
}

// Achievements
export type Achievement = {
  id: string;
  userId: string;
  type: string;
  description: string;
  earnedAt: string;
};

export function getAchievements(userId: string) {
  return request<{ achievements: Achievement[] }>('GET', `/features/achievements/${userId}`);
}

// Control Points (RK1/RK2)
export type ControlPoint = {
  id: string;
  teamId: string;
  type: 'RK1' | 'RK2' | 'EXAM';
  title: string;
  description?: string;
  dueDate?: string;
  maxPoints: number;
  createdBy: string;
  createdAt: string;
  results?: Array<{ score: number; feedback?: string }>;
};

export function getControlPoints(teamId: string) {
  return request<{ controls: ControlPoint[] }>('GET', `/features/teams/${teamId}/controls`);
}

export function createControlPoint(teamId: string, type: 'RK1' | 'RK2' | 'EXAM', title: string, maxPoints?: number, dueDate?: string) {
  return request<{ control: ControlPoint }>('POST', `/features/teams/${teamId}/controls`, { type, title, maxPoints, dueDate });
}

export function submitControlResult(controlId: string, score: number) {
  return request<{ result: { controlPointId: string; userId: string; score: number; submittedAt: string } }>('POST', `/features/controls/${controlId}/submit`, { score });
}

export function deleteMessage(teamId: string, messageId: string) {
  return request<{ success: boolean }>('DELETE', `/chat/team/${teamId}/message/${messageId}`);
}

// Team Audit Logs
export function getTeamAuditLogs(teamId: string) {
  return request<{ auditLogs: AuditLog[] }>('GET', `/analytics/team/audit?teamId=${encodeURIComponent(teamId)}`);
}

