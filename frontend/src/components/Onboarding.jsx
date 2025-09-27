import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOnboarding, saveOnboarding } from '../services/api';

const steps = [
  { key: 'knowledgeLevel', title: 'Your experience', desc: 'Pick your current productivity knowledge level' },
  { key: 'goals', title: 'Your goals', desc: 'Choose what you want to achieve with TimeTide' },
  { key: 'preferredSessionMins', title: 'Session length', desc: 'Select the focus session length that suits you' },
];

const Onboarding = ({ user }) => {
  const [current, setCurrent] = useState(0);
  const [form, setForm] = useState({ knowledgeLevel: 'beginner', goals: [], preferredSessionMins: 25 });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getOnboarding();
        if (data.onboardingCompleted) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (data.onboarding) {
          setForm({
            knowledgeLevel: data.onboarding.knowledgeLevel || 'beginner',
            goals: Array.isArray(data.onboarding.goals) ? data.onboarding.goals : [],
            preferredSessionMins: data.onboarding.preferredSessionMins || 25,
          });
        }
      } catch (e) {
        // not logged in, send to login
        navigate('/login');
      }
    };
    init();
  }, [navigate]);

  const handleNext = async () => {
    setLoading(true);
    try {
      const payload = { ...form };
      const isLast = current === steps.length - 1;
      if (isLast) payload.complete = true;
      await saveOnboarding(payload);
      if (isLast) navigate('/dashboard', { replace: true });
      else setCurrent((c) => c + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setCurrent((c) => Math.max(0, c - 1));

  const toggleGoal = (goal) => {
    setForm((f) => {
      const has = f.goals.includes(goal);
      return { ...f, goals: has ? f.goals.filter((g) => g !== goal) : [...f.goals, goal] };
    });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          <div className="auth-card p-4 p-md-5 rounded-4">
            <div className="mb-4">
              <h2 className="fw-bold mb-1"><span className="text-gradient">Get set up</span></h2>
              <p className="text-muted mb-0">Step {current + 1} of {steps.length}: {steps[current].title}</p>
            </div>

            {steps[current].key === 'knowledgeLevel' && (
              <div className="row g-3">
                {[
                  { value: 'beginner', label: 'Beginner', icon: 'bi-stars' },
                  { value: 'intermediate', label: 'Intermediate', icon: 'bi-lightning' },
                  { value: 'advanced', label: 'Advanced', icon: 'bi-rocket' },
                ].map((opt) => (
                  <div className="col-md-4" key={opt.value}>
                    <button
                      type="button"
                      className={`btn w-100 ${form.knowledgeLevel === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setForm({ ...form, knowledgeLevel: opt.value })}
                    >
                      <i className={`bi ${opt.icon} me-2`}></i>{opt.label}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {steps[current].key === 'goals' && (
              <div className="row g-3">
                {['Stay focused', 'Build habit', 'Track time', 'Reduce distractions', 'Improve planning'].map((g) => (
                  <div className="col-md-6" key={g}>
                    <button
                      type="button"
                      className={`btn w-100 ${form.goals.includes(g) ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => toggleGoal(g)}
                    >
                      {g}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {steps[current].key === 'preferredSessionMins' && (
              <div>
                <label className="form-label text-white">Preferred session length (minutes)</label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  className="form-range"
                  value={form.preferredSessionMins}
                  onChange={(e) => setForm({ ...form, preferredSessionMins: Number(e.target.value) })}
                />
                <div className="text-white">{form.preferredSessionMins} minutes</div>
              </div>
            )}

            <div className="d-flex justify-content-between mt-4">
              <button className="btn btn-outline-secondary" onClick={handleBack} disabled={current === 0 || loading}>Back</button>
              <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                {current === steps.length - 1 ? 'Finish' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;


