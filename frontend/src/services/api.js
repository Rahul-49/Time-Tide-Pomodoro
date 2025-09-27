import axios from 'axios';

// In development, Vite proxies '/api' to the backend. In production, set VITE_API_BASE
// to your backend URL (e.g., https://your-backend.onrender.com/api)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not hard-redirect here to avoid refresh loops on Login/Signup pages.
      // Let route guards (e.g., ProtectedRoute) handle navigation.
      console.warn('Unauthorized (401). Handling via app routing.');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signup = async (username, email, password) => {
  const response = await api.post('/auth/signup', { username, email, password });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const checkAuth = async () => {
  const response = await api.get('/auth/check');
  return response.data;
};

// Session API
export const createSession = async (sessionData) => {
  const response = await api.post('/sessions', sessionData);
  return response.data;
};

export const completeSession = async (sessionId, payload) => {
  // payload can be a number (minutes) for backward compatibility or an object
  let body = {};
  if (typeof payload === 'number') {
    body = { duration: payload };
  } else if (payload && typeof payload === 'object') {
    body = payload;
  }
  const response = await api.put(`/sessions/${sessionId}/complete`, body);
  return response.data;
};

export const getSessions = async () => {
  const response = await api.get('/sessions');
  // Backend returns an array of sessions directly
  return response.data;
};

export const getAnalytics = async () => {
  const response = await api.get('/sessions/analytics');
  return response.data;
};

// Weather API
export const getWeather = async (lat, lon) => {
  const response = await api.get(`/weather?lat=${lat}&lon=${lon}`);
  return response.data;
};

// Onboarding API
export const getOnboarding = async () => {
  const response = await api.get('/onboarding');
  return response.data;
};

export const saveOnboarding = async (payload) => {
  const response = await api.put('/onboarding', payload);
  return response.data;
};

// Leaderboard API
export const getLeaderboard = async () => {
  const response = await api.get('/leaderboard');
  return response.data;
};

// Progress API (achievements/challenges)
export const getProgress = async () => {
  const response = await api.get('/progress');
  return response.data;
};

export const syncProgress = async () => {
  const response = await api.post('/progress/sync');
  return response.data;
};

// Streak API
export const getStreak = async () => {
  // Expected to return an object like { currentStreak: number }
  const response = await api.get('/streak');
  return response.data;
};