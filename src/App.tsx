import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { AppLayout } from './components/layout/AppLayout';
import { WelcomePage } from './pages/WelcomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { CirclesPage } from './pages/CirclesPage';
import { CircleDetailPage } from './pages/CircleDetailPage';
import { SessionsPage } from './pages/SessionsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ProfilePage } from './pages/ProfilePage';
import { FeedbackPage } from './pages/FeedbackPage';
import { sanitizeInternalRoute } from './utils/routeSanitizer';

// Protected Route Guard with Safe Redirect Preservation
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const fullPath = location.pathname + location.search;
    const safeRedirect = sanitizeInternalRoute(fullPath, '/dashboard');
    return <Navigate to={`/login?redirect=${encodeURIComponent(safeRedirect)}`} replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Application Routes with AppLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/circles" element={<CirclesPage />} />
              <Route path="/circles/:circleId" element={<CircleDetailPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
