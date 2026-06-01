import axios from 'axios';

const TOKEN_KEY = 'ncps_access_token';
const USER_KEY = 'ncps_auth_user';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthAttempt = /^\/auth\/(login|register|google)/.test(url);
    if (error.response?.status === 401 && !isAuthAttempt) {
      window.dispatchEvent(new Event('ncps-auth-expired'));
    }
    return Promise.reject(error);
  }
);

// -- Auth session --
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Preferences ──
export function getPrefs() {
  const raw = localStorage.getItem('ncps_prefs');
  return raw ? JSON.parse(raw) : {
    location_enabled: false,
    notifications_enabled: false,
    onboarded: false,
  };
}

export function savePrefs(prefs) {
  localStorage.setItem('ncps_prefs', JSON.stringify(prefs));
}

// ── API calls ──
export const registerAccount = (data) =>
  api.post('/auth/register', data);

export const loginAccount = (data) =>
  api.post('/auth/login', data);

export const logoutAccount = () =>
  api.post('/auth/logout');

export const getMe = () =>
  api.get('/auth/me');

export const googleLoginAccount = (credential) =>
  api.post('/auth/google', { credential });

export const fetchFeed = (params = {}) =>
  api.get('/feed', { params });

export const getAnalyticsOverview = () =>
  api.get('/analytics/overview');

export const getCredibilityDistribution = () =>
  api.get('/analytics/credibility-distribution');

export const getPropagationStats = () =>
  api.get('/analytics/propagation-stats');

export const getLeaderboard = (params = {}) =>
  api.get('/analytics/leaderboard', { params });

export const getCityLeaderboard = (params = {}) =>
  api.get('/analytics/city-leaderboard', { params });

export const getObservabilityMetrics = () =>
  api.get('/observability/metrics');

export const getPreferences = () =>
  api.get('/preferences');

export const updatePreferences = (data) =>
  api.put('/preferences', data);

export const createPost = (data) =>
  api.post('/post/create', data);

export const votePost = (data) =>
  api.post('/post/vote', data);

export const getPost = (postId) =>
  api.get(`/post/${postId}`);

export const getPostExplanation = (postId, params = {}) =>
  api.get(`/post/${postId}/explain`, { params });

export const sharePost = (postId) =>
  api.post(`/post/${postId}/share`);

export const bookmarkPost = (postId) =>
  api.post(`/post/${postId}/bookmark`);

export const unbookmarkPost = (postId) =>
  api.delete(`/post/${postId}/bookmark`);

export const reportPost = (postId, data) =>
  api.post(`/post/${postId}/report`, data);

export const fetchAlerts = (params = {}) =>
  api.get('/alerts', { params });

export const markAlertRead = (alertId) =>
  api.patch(`/alerts/${alertId}/read`);

export const markAllAlertsRead = () =>
  api.patch('/alerts/read-all');

export const getNotificationConfig = () =>
  api.get('/notifications/config');

export const savePushSubscription = (data) =>
  api.post('/notifications/subscribe', data);

export const updateLocation = (data) =>
  api.post('/user/location', data);

export const getUserState = (userId) =>
  api.get(`/user/${userId}/state`);

export const getMyUserState = () =>
  api.get('/user/me/state');

export const getMyActivity = () =>
  api.get('/user/me/activity');

export const getMyBookmarks = () =>
  api.get('/user/me/bookmarks');

export const getHealth = () =>
  api.get('/health');

export default api;
