import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { isValidEmail } from '../utils/validators';

const Login = ({ setUser, theme, toggleTheme }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  // Derived validation states
  const emailEntered = (formData.email || '').length > 0;
  const emailValid = isValidEmail(formData.email);
  const passwordEntered = (formData.password || '').length > 0;
  const passwordBasic = (formData.password || '').length >= 8; // keep login requirement simple

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!emailValid) {
        showAlert('Please enter a valid email address.', 'warning');
        return;
      }
      if (!passwordBasic) {
        showAlert('Password must be at least 8 characters.', 'warning');
        return;
      }
      const response = await login(formData.email, formData.password);
      setUser(response.user);
      showAlert('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      showAlert(error.response?.data?.message || 'Login failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <nav className="navbar navbar-dark bg-transparent">
        <div className="container">
          <Link className="navbar-brand fw-bold fs-3" to="/">
            <i className="bi bi-clock-history text-primary"></i> TimeTide
          </Link>
          <div className="ms-auto d-flex align-items-center gap-2">
            <button
              type="button"
              className={`btn ${theme === 'dark' ? 'btn-light' : 'btn-dark'} btn-toggle-theme`}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`}></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="container pt-5 pt-md-4">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-lg-5 col-md-7">
            <div className="auth-card p-5 rounded-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold mb-2"><span className="text-gradient">Welcome Back</span></h2>
                <p className="text-muted mb-0">Sign in to continue your productivity journey</p>
              </div>

              {/* Social auth */}
              <div className="d-grid gap-2 mb-3">
                <button type="button" className="btn btn-social text-start">
                  <i className="bi bi-google"></i> Continue with Google
                </button>
                <button type="button" className="btn btn-social text-start">
                  <i className="bi bi-github"></i> Continue with GitHub
                </button>
              </div>

              <div className="divider my-4">
                <span>Or continue with email</span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label text-white">Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-secondary">
                      <i className="bi bi-envelope text-primary"></i>
                    </span>
                    <input 
                      type="email" 
                      name="email"
                      className={`form-control bg-transparent border-secondary text-white ${emailEntered && !emailValid ? 'is-invalid' : ''} ${emailEntered && emailValid ? 'is-valid' : ''}`} 
                      value={formData.email}
                      onChange={handleChange}
                      required 
                      placeholder="Enter your email"
                    />
                  </div>
                  {emailEntered && !emailValid && (
                    <div className="invalid-feedback d-block">Please enter a valid email (e.g., name@example.com).</div>
                  )}
                </div>

                <div className="mb-2">
                  <label className="form-label text-white">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-secondary">
                      <i className="bi bi-lock text-primary"></i>
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`form-control bg-transparent border-secondary text-white ${passwordEntered && !passwordBasic ? 'is-invalid' : ''} ${passwordEntered && passwordBasic ? 'is-valid' : ''}`} 
                      value={formData.password}
                      onChange={handleChange}
                      required 
                      placeholder="Enter your password"
                      minLength="8"
                    />
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                  {passwordEntered && !passwordBasic && (
                    <div className="invalid-feedback d-block">Password must be at least 8 characters.</div>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3 small auth-links">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="rememberMe" />
                    <label className="form-check-label" htmlFor="rememberMe">Remember me</label>
                  </div>
                  <Link to="#">Forgot password?</Link>
                </div>

                <div className="d-grid mb-3">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>Signing In...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>Sign In
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center auth-links small">
                  <p className="text-muted mb-1">
                    Don't have an account? <Link to="/signup">Create one</Link>
                  </p>
                  <p className="text-muted mb-0">By continuing you agree to our <Link to="#">Terms</Link> and <Link to="#">Privacy</Link>.</p>
                </div>
              </form>

              {alert && (
                <div className={`alert alert-${alert.type} mt-3`}>
                  {alert.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;