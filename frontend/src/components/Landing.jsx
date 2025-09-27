import React from 'react';
import { Link } from 'react-router-dom';

const Landing = ({ user, theme, toggleTheme }) => {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    { icon: "bi bi-stopwatch", title: "Pomodoro Timer", desc: "Customizable work and break intervals" },
    { icon: "bi bi-bar-chart", title: "Smart Analytics", desc: "Track productivity patterns and progress" },
    { icon: "bi bi-trophy", title: "Gamification", desc: "Earn points, unlock badges, level up" },
    { icon: "bi bi-cloud-sun", title: "Weather Integration", desc: "Plan sessions around perfect conditions" },
    { icon: "bi bi-phone", title: "Responsive Design", desc: "Access from any device" },
    { icon: "bi bi-shield-check", title: "Secure & Private", desc: "Your data is safe with us" }
  ];

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section">
        <nav className="navbar navbar-expand-lg navbar-dark bg-transparent">
          <div className="container">
            <Link className="navbar-brand fw-bold fs-3" to="/">
              <i className="bi bi-clock-history text-primary"></i> TimeTide
            </Link>
            <div className="navbar-nav ms-auto d-flex flex-row gap-3 align-items-center">
              <button className="nav-link btn btn-link text-white border-0" onClick={scrollToFeatures}>
                Features
              </button>
              <button
                type="button"
                className={`btn ${theme === 'dark' ? 'btn-light' : 'btn-dark'} btn-toggle-theme`}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`}></i>
              </button>
              {user ? (
                <Link className="btn btn-primary" to="/dashboard">Dashboard</Link>
              ) : (
                <>
                  <Link className="nav-link text-white text-decoration-none" to="/login">Login</Link>
                  <Link className="btn btn-primary" to="/signup">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="container text-center text-white">
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-8 mx-auto">
              <h1 className="display-4 fw-bold mb-4">
                Master Your Time with <span className="text-primary">TimeTide</span>
              </h1>
              <p className="lead mb-5">
                Boost productivity with Pomodoro timers, track progress, and level up your focus game.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/signup" className="btn btn-primary btn-lg px-4 py-3">
                  <i className="bi bi-play-circle me-2"></i>Start Focusing
                </Link>
                <button onClick={scrollToFeatures} className="btn btn-outline-light btn-lg px-4 py-3">
                  <i className="bi bi-info-circle me-2"></i>Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-indicator" onClick={scrollToFeatures}>
          <i className="bi bi-chevron-down"></i>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold mb-3">Why Choose TimeTide?</h2>
            <p className="lead text-muted">Transform productivity with our comprehensive solution</p>
          </div>

          <div className="row g-4">
            {features.map((feature, index) => (
              <div key={index} className="col-lg-4 col-md-6">
                <div className="feature-card h-100 p-4 rounded-4">
                  <div className="feature-icon mb-3">
                    <i className={feature.icon}></i>
                  </div>
                  <h4>{feature.title}</h4>
                  <p className="text-muted">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section py-5">
        <div className="container text-center">
          <h2 className="display-5 fw-bold text-white mb-4">Ready to Transform Your Productivity?</h2>
          <p className="lead text-white-50 mb-5">Join thousands who've mastered their time</p>
          <Link to="/signup" className="btn btn-primary btn-lg px-5 py-3">
            <i className="bi bi-rocket me-2"></i>Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-4">
        <div className="container text-center">
          <p className="mb-2">&copy; 2024 TimeTide. All rights reserved.</p>
          <p className="text-muted small">Made with <i className="bi bi-heart-fill text-danger"></i> for productivity</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;