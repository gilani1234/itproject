import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { KanbanPage } from './pages/KanbanPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { TeamsPage } from './pages/TeamsPage';
import { StudentsPage } from './pages/StudentsPage';
import { LessonsPage } from './pages/LessonsPage';
import { LessonViewerPage } from './pages/LessonViewerPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:userId" element={<PublicProfilePage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="lessons/:lessonId" element={<LessonViewerPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
