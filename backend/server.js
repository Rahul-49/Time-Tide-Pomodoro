const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const onboardingRoutes = require('./routes/onboarding');
const leaderboardRoutes = require('./routes/leaderboard');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN; // e.g., https://your-frontend.vercel.app

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI in environment. Please set it in your .env file.');
}

// Optional TLS/connection flags for troubleshooting (use only if needed)
const mongoOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Timeouts to fail fast and provide clearer errors
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '15000', 10),
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || '45000', 10),
};

// Allow toggling TLS looseness via env ONLY for debugging. Do not enable in production.
if (process.env.MONGO_TLS_ALLOW_INVALID_CERT === 'true') {
  mongoOpts.tlsAllowInvalidCertificates = true;
}
if (process.env.MONGO_TLS_ALLOW_INVALID_HOSTNAME === 'true') {
  mongoOpts.tlsAllowInvalidHostnames = true;
}

mongoose.connect(MONGO_URI, mongoOpts);

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ MongoDB connection error:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy (required for secure cookies when behind a proxy like Render)
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CORS: allow the Vercel frontend to call this API with credentials
if (NODE_ENV === 'production') {
  const corsOptions = {
    origin: FRONTEND_ORIGIN ? FRONTEND_ORIGIN.split(',').map(v => v.trim()) : false,
    credentials: true,
  };
  app.use(cors(corsOptions));
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'timetide-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    mongoOptions: mongoOpts,
  }),
  cookie: {
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/progress', progressRoutes);

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Weather API key not configured. Set OPENWEATHER_API_KEY in environment.' });
    }
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TimeTide API is running',
    timestamp: new Date().toISOString()
  });
});

  app.get('*', (req, res) => {
    res.status(404).json({ 
      error: 'Route not found', 
      message: 'This is the API server. React app should be running on port 3001.' 
    });
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 TimeTide API Server running on http://localhost:${PORT}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`📱 App available at http://localhost:${PORT}`);
  } else {
    console.log(`📱 React app should be running on http://localhost:3001`);
    console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💡 Visit http://localhost:${PORT} to see available API endpoints`);
  }
});
