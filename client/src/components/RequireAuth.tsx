import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { me } from '../api/endpoints';
import { clearAuth, getToken, getStoredUser, setStoredUser } from '../lib/auth';

export function RequireAuth(props: { children: React.ReactNode }) {
  const token = getToken();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(Boolean(token));

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!token) {
        mounted && setReady(true);
        mounted && setOk(false);
        return;
      }

      // If user is already in localStorage, we still ping /me to validate token.
      try {
        if (!getStoredUser()) {
          const res = await me();
          setStoredUser(res.user);
        } else {
          await me();
        }
        mounted && setOk(true);
      } catch {
        clearAuth();
        mounted && setOk(false);
      } finally {
        mounted && setReady(true);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl bg-slate-900 px-6 py-4 text-sm">Загрузка…</div>
      </div>
    );
  }

  if (!ok) return <Navigate to="/login" replace />;
  return <>{props.children}</>;
}

