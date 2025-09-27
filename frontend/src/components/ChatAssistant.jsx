import React, { useEffect, useRef, useState } from 'react';

// Lightweight, local rule-based suggestions to avoid external API deps
const SUGGESTION_BANK = {
  interruptions: [
    'Silence notifications for 25 minutes and set your phone to Do Not Disturb.',
    'Put a "Focus in progress" note on your door or status to deter interruptions.',
    'Batch replies: note down the interruption and handle it after the session.'
  ],
  tired: [
    'Take a 3–5 minute brisk walk or hydration break, then restart a short 10-minute focus.',
    'Try the 20-20-20 rule for eyes: every 20 min, look at something 20 feet away for 20 seconds.',
    'Lower cognitive load: split the task into a tiny first step and start there.'
  ],
  lost_focus: [
    'Write down the next micro-step ("Open file X"), then start a 10-minute sprint.',
    'Close irrelevant tabs. Keep one reference tab and one work tab only.',
    'Use noise-cancelling or light background instrumental music.'
  ],
  done_early: [
    'Great! Log a quick note about what worked well to replicate it later.',
    'Use remaining time to plan the next session’s single outcome.',
    'Do a small housekeeping task (file cleanup, TODO grooming) for < 5 minutes.'
  ],
  other: [
    'Write down what pulled you away. Make a quick plan to address it after the next session.',
    'Try a shorter 10-minute comeback sprint to regain momentum.',
    'Set a visible goal for the next session: one sentence stating the finish line.'
  ]
};

function ChatAssistant({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', text: 'Hi! How can I help you focus today?' }
  ]);
  const [input, setInput] = useState('');
  const panelRef = useRef(null);
  const chatBodyRef = useRef(null);
  // Track which suggestions have been shown recently per category to avoid repetition
  const usedTipsRef = useRef({});

  // Listen for global event from Timer to open assistant and prompt for reason
  useEffect(() => {
    const handler = (e) => {
      const prompt = e?.detail?.reasonPrompt || 'You stopped the timer. What was the reason?';
      setOpen(true);
      setMessages((prev) => [...prev, { role: 'assistant', text: prompt }]);
    };
    window.addEventListener('assistant:open', handler);
    return () => window.removeEventListener('assistant:open', handler);
  }, []);

  // Auto-scroll to bottom when messages change or panel opens
  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, open]);

  const quickReasons = [
    { key: 'interruptions', label: 'Interrupted' },
    { key: 'tired', label: 'Feeling Tired' },
    { key: 'lost_focus', label: 'Lost Focus' },
    { key: 'done_early', label: 'Done Early' },
    { key: 'other', label: 'Other' }
  ];

  const pickTips = (category, count = 3) => {
    const bank = SUGGESTION_BANK[category] || SUGGESTION_BANK.other;
    const used = new Set(usedTipsRef.current[category] || []);
    // Build an array of indices not used recently
    const candidates = bank.map((_, i) => i).filter(i => !used.has(i));
    // If exhausted, reset the used set
    if (candidates.length < count) {
      used.clear();
      usedTipsRef.current[category] = [];
      for (let i = 0; i < bank.length; i++) candidates[i] = i;
    }
    // Shuffle candidates (Fisher–Yates light)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const chosen = candidates.slice(0, Math.min(count, candidates.length));
    // Record as used
    usedTipsRef.current[category] = [
      ...(usedTipsRef.current[category] || []),
      ...chosen
    ].slice(-bank.length); // cap size
    return chosen.map(i => bank[i]);
  };

  const detectCategory = (text) => {
    const key = (text || '').toLowerCase();
    if (key.includes('interrupt')) return 'interruptions';
    if (key.includes('tired') || key.includes('sleep') || key.includes('fatigue')) return 'tired';
    if (key.includes('focus') || key.includes('distract') || key.includes('procrast')) return 'lost_focus';
    if (key.includes('done') || key.includes('finish') || key.includes('completed')) return 'done_early';
    if (key.includes('meeting') || key.includes('call') || key.includes('chat')) return 'interruptions';
    return 'other';
  };

  const sendMessage = (text, forcedCategory) => {
    if (!text?.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    const category = forcedCategory || detectCategory(text);
    const tips = pickTips(category, 3);
    const heading = (
      category === 'interruptions' ? 'Interruptions happen. Try this:' :
      category === 'tired' ? 'Low energy detected. Try this:' :
      category === 'lost_focus' ? 'Let’s regain focus:' :
      category === 'done_early' ? 'Nice! Wrap it smartly:' :
      'Here are a few focused steps:'
    );

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: heading },
        ...tips.map((t, idx) => ({ role: 'assistant', text: `${idx + 1}. ${t}` })),
        { role: 'assistant', text: 'Reply with what you’ll do next. I can suggest a tiny first step.' }
      ]);
    }, 180);
  };

  const onQuickReason = (key) => {
    const label = quickReasons.find(r => r.key === key)?.label || 'Other';
    sendMessage(label, key);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      {/* Floating open button */}
      {!open && (
        <button
          className="btn btn-primary shadow-lg chat-fab"
          onClick={() => setOpen(true)}
          aria-label="Open Focus Assistant"
          title="Open Focus Assistant"
        >
          <i className="bi bi-robot"></i>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="chat-panel card shadow-lg" ref={panelRef}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-robot"></i>
              <span>Focus Assistant</span>
            </div>
            <button className="btn btn-sm btn-outline-light" onClick={() => setOpen(false)} aria-label="Close">
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="card-body chat-body" ref={chatBodyRef}>
            <div className="chat-messages">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-msg ${m.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
                  {m.text}
                </div>
              ))}
            </div>
          </div>
          <div className="card-footer">
            <div className="d-flex flex-wrap gap-2 mb-2">
              {quickReasons.map(r => (
                <button key={r.key} className="btn btn-outline-primary btn-sm" onClick={() => onQuickReason(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="d-flex gap-2">
              <input
                className="form-control"
                placeholder="Tell me what happened..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatAssistant;
