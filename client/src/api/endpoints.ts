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
  order: number;
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