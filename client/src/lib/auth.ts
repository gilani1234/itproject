// Универсальная функция для получения src аватара
export function getAvatarUrl(avatar?: string | null): string | undefined {
  if (!avatar) return undefined;
  // Если это внешний url
  if (/^https?:\/\//.test(avatar)) return avatar;
  // Если это локальный путь (начинается с /uploads/)
  if (avatar.startsWith('/uploads/')) {
    const api = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
    // Обрезаем /api если есть
    const base = api.replace(/\/api$/, '');
    return base + avatar;
  }
  return avatar;
}
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER';
  rating?: number;
  totalPoints?: number;
  avatar?: string | null;
  bio?: string | null;
};

const TOKEN_KEY = 'vitco_token';
const USER_KEY = 'vitco_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function useAuth() {
  const user = getStoredUser();
  return { user, isLoggedIn: !!user };
}

