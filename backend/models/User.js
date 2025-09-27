const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50,
    default: ''
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50,
    default: ''
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  level: {
    type: Number,
    default: 1
  },
  points: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String,
    enum: [
      'First Session',
      'Focus Master',
      'Streak Champion',
      'Early Bird',
      'Night Owl',
      'Zen Master',
      'Lightning Focus',
      'Collector x5',
      'Collector x25',
      'Collector x50',
      'Collector x100',
      'Weekly Streak',
      'Monthly Marathon'
    ]
  }],
  // Onboarding state and answers
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboarding: {
    knowledgeLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    goals: [{
      type: String,
      trim: true,
      maxlength: 100
    }],
    preferredSessionMins: {
      type: Number,
      min: 5,
      max: 180,
      default: 25
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);