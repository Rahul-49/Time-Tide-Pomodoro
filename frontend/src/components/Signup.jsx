import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../services/api';
import { isValidEmail, isValidUsername, isStrongPassword, getPasswordIssues } from '../utils/validators';

const Signup = ({ setUser, theme, toggleTheme }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const derivedUsername = useMemo(() => {
    // Prefer email local part, fallback to first+last, then random suffix
    const emailLocal = formData.email?.split('@')[0] || '';
    const nameCombo = `${formData.firstName}${formData.lastName}`.replace(/\s+/g, '');
    const base = (emailLocal || nameCombo || 'user').toLowerCase().slice(0, 20);
    return base || 'user';
  }, [formData.email, formData.firstName, formData.lastName]);

  const emailEntered = (formData.email || '').length > 0;
  const emailValid = isValidEmail(formData.email);
  const usernameValid = isValidUsername(derivedUsername);
  const isPasswordStrong = isStrongPassword(formData.password);
  const passwordEntered = formData.password.length > 0;
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const confirmEntered = formData.confirmPassword.length > 0;
  const canSubmit = isPasswordStrong && passwordsMatch && emailValid && usernameValid && formData.firstName && formData.agree;

  const strength = useMemo(() => {
    const pwd = formData.password || '';
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const percent = Math.min(100, (score / 5) * 100);
    let variant = 'bg-danger';
    let label = 'Weak';
    if (score >= 4) { variant = 'bg-success'; label = 'Strong'; }
    else if (score === 3) { variant = 'bg-warning'; label = 'Medium'; }
    return { score, percent, variant, label };
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailValid) {
      showAlert('Please enter a valid email address.', 'warning');
      return;
    }
    if (!usernameValid) {
      showAlert('Generated username is invalid. Please adjust your name/email.', 'warning');
      return;
    }
    if (!isPasswordStrong) {
      const issues = getPasswordIssues(formData.password).join(', ');
      showAlert(`Use a stronger password. Missing: ${issues}.`, 'warning');
      return;
    }
    if (!passwordsMatch) {
      showAlert('Passwords do not match.', 'warning');
      return;
    }
    if (!formData.agree) {
      showAlert('Please agree to the Terms of Service and Privacy Policy.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // Backend expects username, email, password. Send first/last as extras (ignored if unsupported)
      const response = await signup(derivedUsername, formData.email, formData.password);
      setUser(response.user);
      showAlert('Account created successfully! Redirecting...', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (error) {
      showAlert(error.response?.data?.message || 'Registration failed', 'danger');
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
                <h2 className="fw-bold mb-2"><span className="text-gradient">Create Account</span></h2>
                <p className="text-muted mb-0">Join TimeTide to manage your time effectively</p>
              </div>

              {/* Social auth */}
              <div className="d-grid gap-2 mb-3">
                <button type="button" className="btn btn-social text-start">
                  <i className="bi bi-google"></i> Sign up with Google
                </button>
                <button type="button" className="btn btn-social text-start">
                  <i className="bi bi-github"></i> Sign up with GitHub
                </button>
              </div>

              <div className="divider my-4">
                <span>Or create with email</span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                  <div className="col">
                    <label className="form-label text-white">First Name</label>
                    <div className="input-group">
                      <span className="input-group-text bg-transparent border-secondary">
                        <i className="bi bi-person text-primary"></i>
                      </span>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control bg-transparent border-secondary text-white"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        placeholder="First Name"
                        maxLength="30"
                      />
                    </div>
                  </div>
                  <div className="col">
                    <label className="form-label text-white">Last Name</label>
                    <div className="input-group">
                      <span className="input-group-text bg-transparent border-secondary">
                        <i className="bi bi-person text-primary"></i>
                      </span>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control bg-transparent border-secondary text-white"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Last Name"
                        maxLength="30"
                      />
                    </div>
                  </div>
                </div>

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

                <div className="mb-3">
                  <label className="form-label text-white">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-secondary">
                      <i className="bi bi-lock text-primary"></i>
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`form-control bg-transparent border-secondary text-white ${passwordEntered && !isPasswordStrong ? 'is-invalid' : ''} ${isPasswordStrong ? 'is-valid' : ''}`}
                      value={formData.password}
                      onChange={handleChange}
                      required 
                      placeholder="Create a password"
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
                  <div className="form-text text-muted">Use 8+ characters with upper, lower, number & symbol</div>
                  {passwordEntered && (
                    <div className="mt-2" aria-live="polite">
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className={`progress-bar ${strength.variant}`}
                          role="progressbar"
                          style={{ width: `${strength.percent}%` }}
                          aria-valuenow={strength.percent}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <small className="d-block mt-1 text-muted">Strength: <span className="fw-semibold text-white">{strength.label}</span></small>
                    </div>
                  )}
                  {passwordEntered && !isPasswordStrong && (
                    <div className="invalid-feedback d-block">Password must include upper, lower, number and special character.</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label text-white">Confirm Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-secondary">
                      <i className="bi bi-shield-lock text-primary"></i>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      className={`form-control bg-transparent border-secondary text-white ${confirmEntered && !passwordsMatch ? 'is-invalid' : ''} ${confirmEntered && passwordsMatch ? 'is-valid' : ''}`}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                      minLength="8"
                    />
                  </div>
                  {confirmEntered && !passwordsMatch && (
                    <div className="invalid-feedback d-block">Passwords do not match.</div>
                  )}
                  {confirmEntered && passwordsMatch && (
                    <div className="valid-feedback d-block" aria-live="polite">Passwords match.</div>
                  )}
                </div>

                <div className="form-check mb-3 small auth-links">
                  <input
                    className={`form-check-input ${!formData.agree ? 'is-invalid' : ''}`}
                    type="checkbox"
                    id="agree"
                    name="agree"
                    checked={formData.agree}
                    onChange={handleChange}
                    required
                  />
                  <label className="form-check-label" htmlFor="agree">
                    I agree to the <Link to="#">Terms of Service</Link> and <Link to="#">Privacy Policy</Link>
                  </label>
                  {!formData.agree && (
                    <div className="invalid-feedback d-block">You must agree before creating an account.</div>
                  )}
                </div>

                <div className="d-grid mb-3">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !canSubmit}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>Creating Account...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2"></i>Create Account
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center auth-links small">
                  <div className="text-muted mb-2">
                    <span className={`badge ${passwordsMatch ? 'bg-success' : 'bg-secondary'} me-2`}>Match</span>
                    <span className={`badge ${isPasswordStrong ? 'bg-success' : 'bg-secondary'}`}>8+ chars</span>
                  </div>
                  <p className="text-muted mb-0">
                    Already have an account? <Link to="/login">Sign in</Link>
                  </p>
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

export default Signup;