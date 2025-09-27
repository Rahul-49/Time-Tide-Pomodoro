import React, { useState, useEffect, useRef } from 'react';
import { createSession, completeSession } from '../services/api';
import soundManager from '../utils/soundUtils';

function Timer({ user, onSessionComplete, sessions, variant = 'two-column' }) {
  // Countdown settings
  const [durationMinutes, setDurationMinutes] = useState(25); // default Pomodoro
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const initialSecondsRef = useRef(0);
  const endTimeRef = useRef(null); // wall-clock end time for persistence
  
  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(soundManager.getEnabled());
  const [soundVolume, setSoundVolume] = useState(soundManager.getVolume());

  // Persistence helpers to survive theme toggle remounts
  const saveTimerState = (patch = {}) => {
    try {
      const payload = {
        durationMinutes,
        remainingSeconds,
        isRunning,
        sessionName,
        currentSessionId,
        initialSeconds: initialSecondsRef.current,
        endTime: endTimeRef.current,
        ...patch,
      };
      localStorage.setItem('timerState', JSON.stringify(payload));
    } catch {}
  };

  const clearTimerState = () => {
    try { localStorage.removeItem('timerState'); } catch {}
  };

  // Restore on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('timerState');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved) return;
      setSessionName(saved.sessionName || '');
      setCurrentSessionId(saved.currentSessionId || null);
      initialSecondsRef.current = saved.initialSeconds || 0;
      // Recalculate remaining based on endTime
      let remaining = parseInt(saved.remainingSeconds || 0, 10);
      if (saved.endTime) {
        const now = Date.now();
        remaining = Math.max(0, Math.floor((saved.endTime - now) / 1000));
      }
      setRemainingSeconds(remaining);
      endTimeRef.current = saved.endTime || (remaining ? (Date.now() + remaining * 1000) : null);
      setDurationMinutes(saved.durationMinutes || 25);
      if (saved.isRunning && remaining > 0) {
        setIsRunning(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    soundManager.requestNotificationPermission();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setRemainingSeconds(prev => {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(interval);
            // Auto-complete when timer hits zero
            void autoComplete();
            return 0;
          }
          // Persist on tick (lightweight)
          try {
            saveTimerState({ remainingSeconds: next });
          } catch {}
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = async () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name');
      return;
    }

    try {
      // Warm up audio on a definite user gesture to satisfy autoplay policies
      await soundManager.warmUp();
      const sessionData = {
        type: 'work',
        task: sessionName,
        duration: 0, // minutes
      };
      const response = await createSession(sessionData);
      setCurrentSessionId(response._id);
      const totalSecs = Math.max(1, durationMinutes * 60);
      initialSecondsRef.current = totalSecs;
      setRemainingSeconds(totalSecs);
      setIsRunning(true);
      endTimeRef.current = Date.now() + totalSecs * 1000;
      saveTimerState({ isRunning: true, remainingSeconds: totalSecs, currentSessionId: response._id, endTime: endTimeRef.current });
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session');
    }
  };

  const stopTimer = async () => {
    if (!currentSessionId) return;

    try {
      const elapsedSeconds = Math.max(1, (initialSecondsRef.current || 0) - (remainingSeconds || 0));
      await completeSession(currentSessionId, { durationSeconds: elapsedSeconds });
      setIsRunning(false);
      setRemainingSeconds(0);
      setSessionName('');
      setCurrentSessionId(null);
      endTimeRef.current = null;
      clearTimerState();
      // Open assistant to ask for reason and provide tips
      try {
        window.dispatchEvent(new CustomEvent('assistant:open', { detail: { reasonPrompt: 'You stopped the timer. What was the reason? (Interrupted, tired, lost focus, done early, other?)' } }));
      } catch {}
      onSessionComplete();
    } catch (error) {
      console.error('Failed to complete session:', error);
      alert('Failed to complete session');
    }
  };

  const autoComplete = async () => {
    if (!currentSessionId) return;
    try {
      const elapsedSeconds = Math.max(1, initialSecondsRef.current);
      // Play completion sound first to reduce perceived delay
      if (soundEnabled) {
        await soundManager.playTimerComplete();
      }
      // Then complete the session with the server
      await completeSession(currentSessionId, { durationSeconds: elapsedSeconds });
      
      setIsRunning(false);
      setRemainingSeconds(0);
      setSessionName('');
      setCurrentSessionId(null);
      endTimeRef.current = null;
      clearTimerState();
      onSessionComplete();
    } catch (error) {
      console.error('Auto-complete failed:', error);
    }
  };


  const pauseTimer = () => {
    setIsRunning(false);
    saveTimerState({ isRunning: false });
  };

  const resumeTimer = () => {
    // Warm up audio again on user gesture
    void soundManager.warmUp();
    setIsRunning(true);
    // Recompute end time on resume
    endTimeRef.current = Date.now() + Math.max(0, (remainingSeconds || 0)) * 1000;
    saveTimerState({ isRunning: true, endTime: endTimeRef.current });
  };

  const resetTimer = () => {
    setRemainingSeconds(0);
    setIsRunning(false);
    setCurrentSessionId(null);
    endTimeRef.current = null;
    clearTimerState();
  };

  // Add extra time to current session (running or paused)
  const addExtraTime = (minutes) => {
    if (!currentSessionId) return;
    const extra = Math.max(1, Math.floor(minutes * 60));
    setRemainingSeconds((s) => (s || 0) + extra);
    initialSecondsRef.current = (initialSecondsRef.current || 0) + extra;
    // Extend end time accordingly
    endTimeRef.current = (endTimeRef.current || Date.now()) + extra * 1000;
    saveTimerState({ remainingSeconds: (remainingSeconds || 0) + extra, endTime: endTimeRef.current, initialSeconds: initialSecondsRef.current });
  };

  // Sound settings handlers
  const toggleSound = async () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
    if (newEnabled) {
      await soundManager.warmUp();
    }
    // Persist user preference alongside timer state for convenience
    saveTimerState();
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSoundVolume(newVolume);
    soundManager.setVolume(newVolume);
    saveTimerState();
  };

  const testSound = async () => {
    if (soundEnabled) {
      await soundManager.warmUp();
      await soundManager.playTimerComplete();
    }
  };

  const renderTimerCard = () => (
    <div className="card">
      <div className="card-body text-center">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="card-title m-0 d-flex align-items-center gap-2">
            <i className="bi bi-hourglass-split text-primary"></i>
            Focus Timer
          </h2>
          <span className="badge bg-primary-subtle text-light border">
            {durationMinutes} min
          </span>
        </div>
        
        <div className="mb-4 d-flex justify-content-center">
          {(() => {
            // Establish total and remaining seconds for progress calc
            const total = (initialSecondsRef.current && initialSecondsRef.current > 0)
              ? initialSecondsRef.current
              : durationMinutes * 60;
            const remaining = (remainingSeconds && remainingSeconds > 0)
              ? remainingSeconds
              : total;
            const elapsed = Math.max(0, total - remaining);
            const pct = Math.min(1, Math.max(0, elapsed / Math.max(1, total)));

            // SVG ring dimensions (enlarged)
            const size = 280; // px
            const stroke = 14; // px
            const radius = (size - stroke) / 2;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - pct);

            // Theme-aware track color for visibility
            const theme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'dark';
            const trackStroke = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';

            return (
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                {/* Background ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={trackStroke}
                  strokeWidth={stroke}
                  fill="none"
                />
                {/* Progress ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="url(#timerGradient)"
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                {/* Time text */}
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="timer-display"
                  style={{ fill: 'var(--text)', fontSize: '2rem' }}
                >
                  {formatTime(remaining)}
                </text>
                <text
                  x="50%"
                  y="63%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  style={{ fill: 'var(--muted)', fontSize: '.9rem' }}
                >
                  {isRunning ? 'Running' : (currentSessionId ? 'Paused' : 'Ready')}
                </text>
              </svg>
            );
          })()}
        </div>

        <div className="d-flex justify-content-center gap-3 mt-2 small text-muted">
          <span>
            <i className="bi bi-flag me-1"></i>
            Elapsed: {(() => { const e = Math.max(0, (initialSecondsRef.current || 0) - (remainingSeconds || 0)); const m = Math.round(e/60); return `${m} min`; })()}
          </span>
          <span>
            <i className="bi bi-hourglass-bottom me-1"></i>
            Remaining: {(() => { const r = (remainingSeconds || (durationMinutes*60)); const m = Math.max(0, Math.round(r/60)); return `${m} min`; })()}
          </span>
        </div>

        <div className="row g-3 mb-4 justify-content-center">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-hourglass-split"></i></span>
              <select
                className="form-select"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                disabled={isRunning || !!currentSessionId}
              >
                <option value={1}>1 min (Quick)</option>
                <option value={25}>25 min (Pomodoro)</option>
                <option value={50}>50 min</option>
                <option value={5}>5 min (Short break)</option>
                <option value={15}>15 min (Break)</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            className="form-control form-control-lg text-center"
            placeholder="What are you working on?"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            disabled={isRunning}
            style={{ maxWidth: '400px', margin: '0 auto' }}
          />
        </div>

        {/* Sound Settings UI removed per user request; functionality unchanged */}

        <div className="d-flex justify-content-center flex-wrap gap-3">
          {!isRunning && !currentSessionId && (
            <button 
              className="btn btn-primary btn-lg"
              onClick={startTimer}
              disabled={!sessionName.trim()}
            >
              <i className="bi bi-play-fill me-2"></i>
              Start
            </button>
          )}
          
          {isRunning && (
            <>
              <button 
                className="btn btn-warning btn-lg"
                onClick={pauseTimer}
              >
                <i className="bi bi-pause-fill me-2"></i>
                Pause
              </button>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-lg" onClick={() => addExtraTime(5)}>
                  +5m
                </button>
                <button className="btn btn-outline-secondary btn-lg" onClick={() => addExtraTime(10)}>
                  +10m
                </button>
              </div>
              <button 
                className="btn btn-danger btn-lg"
                onClick={stopTimer}
              >
                <i className="bi bi-stop-fill me-2"></i>
                Stop
              </button>
            </>
          )}
          
          {!isRunning && currentSessionId && remainingSeconds > 0 && (
            <>
              <button 
                className="btn btn-success btn-lg"
                onClick={resumeTimer}
              >
                <i className="bi bi-play-fill me-2"></i>
                Resume
              </button>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-lg" onClick={() => addExtraTime(5)}>
                  +5m
                </button>
                <button className="btn btn-outline-secondary btn-lg" onClick={() => addExtraTime(10)}>
                  +10m
                </button>
              </div>
              <button 
                className="btn btn-danger btn-lg"
                onClick={stopTimer}
              >
                <i className="bi bi-stop-fill me-2"></i>
                Complete
              </button>
              <button 
                className="btn btn-secondary btn-lg"
                onClick={resetTimer}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Reset
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );

  if (variant === 'single') {
    return (
      <div>
        {renderTimerCard()}
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-lg-8">{renderTimerCard()}</div>

      <div className="col-lg-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Recent Sessions</h5>
          </div>
          <div className="card-body">
            {sessions.length === 0 ? (
              <p className="text-muted">No sessions yet. Start your first focus session!</p>
            ) : (
              <div className="list-group list-group-flush">
                {sessions.slice(0, 5).map((session, index) => (
                  <div key={session._id || index} className="list-group-item px-0">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{session.task || 'Session'}</h6>
                        <small className="text-muted">
                          {new Date(session.startTime).toLocaleDateString()}
                        </small>
                      </div>
                      <span className="badge bg-primary rounded-pill">
                        {(() => {
                          const minutes = session.duration || 0;
                          const hours = Math.floor(minutes / 60);
                          const mins = minutes % 60;
                          return `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timer;