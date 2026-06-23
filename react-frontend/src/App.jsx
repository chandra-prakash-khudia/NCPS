import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import CommandPalette from './components/CommandPalette';
import OnboardingTour from './components/OnboardingTour';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { getAuthToken } from './services/api';
import { toast } from 'react-toastify';

// Lazy load every page — each becomes its own JS chunk
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const CreateNewsPage = lazy(() => import('./pages/CreateNewsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ObservabilityPage = lazy(() => import('./pages/ObservabilityPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <CircularProgress size={36} />
  </Box>
);

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return <LoadingSpinner fullScreen text="Restoring secure session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return <LoadingSpinner fullScreen text="Checking session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const token = getAuthToken();
    if (!token || typeof EventSource === 'undefined') return undefined;

    const stream = new EventSource(`/api/alerts/stream?token=${encodeURIComponent(token)}`);
    stream.addEventListener('alert', (event) => {
      try {
        const alert = JSON.parse(event.data);
        toast.info(alert.title ? `${alert.title}: ${alert.message}` : 'New NCPS alert');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          navigator.serviceWorker?.ready
            ?.then((registration) => registration.showNotification(alert.title || 'NCPS Alert', {
              body: alert.message,
              data: { url: `/post/${alert.post_id}` },
            }))
            .catch(() => {});
        }
      } catch {
        // Ignore malformed event payloads.
      }
    });
    return () => stream.close();
  }, [isAuthenticated]);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {isAuthenticated && <Navbar />}
      {isAuthenticated && <CommandPalette />}
      {isAuthenticated && <OnboardingTour />}
      <main className={isAuthenticated ? 'main-content' : undefined}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route
                path="/welcome"
                element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>}
              />
              <Route
                path="/login"
                element={<PublicOnlyRoute><AuthPage mode="login" /></PublicOnlyRoute>}
              />
              <Route
                path="/register"
                element={<PublicOnlyRoute><AuthPage mode="register" /></PublicOnlyRoute>}
              />
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
              <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/observability" element={<ProtectedRoute><ObservabilityPage /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateNewsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/post/:postId" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </Box>
  );
}

export default App;
