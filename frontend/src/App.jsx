import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Progress from './components/Progress';
import { checkAuth } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await checkAuth();
        setUser(response.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (!user) return <Navigate to="/login" replace />;
    // Removed onboarding flow: allow direct access when authenticated
    return children;
  };

  return (
    <Routes>
      <Route path="/" element={<Landing user={user} theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/login" element={<Login setUser={setUser} theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/signup" element={<Signup setUser={setUser} theme={theme} toggleTheme={toggleTheme} />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Progress user={user} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;