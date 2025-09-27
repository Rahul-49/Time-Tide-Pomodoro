const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['work', 'break', 'longbreak'],
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  durationSeconds: {
    type: Number, // in seconds
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  task: {
    type: String,
    trim: true
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate points based on session type and completion
sessionSchema.methods.calculatePoints = function() {
  if (!this.completed) return 0;
  
  // Anti-abuse: duration-based points with minimum thresholds and caps
  const cfg = {
    work: {
      minSeconds: 5 * 60, // minimum 5 minutes to earn any points
      pointsPerMinute: 1 // 1 point per minute of focused work
    },
    break: {
      minSeconds: 3 * 60, // minimum 3 minutes
      pointsPerMinute: 0.2 // light reward
    },
    longbreak: {
      minSeconds: 10 * 60, // minimum 10 minutes
      pointsPerMinute: 0.5
    }
  };

  const type = this.type || 'work';
  const rules = cfg[type];
  if (!rules) return 0;

  const secs = Number(this.durationSeconds || 0);
  const mins = Number(this.duration || (secs > 0 ? Math.round(secs / 60) : 0));

  // Enforce minimum duration threshold to avoid start/stop spamming
  if (secs < rules.minSeconds) return 0;

  // Compute points (no per-session caps)
  const raw = mins * rules.pointsPerMinute;
  return Math.max(0, Math.floor(raw));
};

module.exports = mongoose.model('Session', sessionSchema);