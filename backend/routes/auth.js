// routes/auth.js

const express = require('express');
const User = require('../models/User'); // Ensure this path is correct
const router = express.Router();

// ## POST /api/auth/signup ##
// Handles new user registration.
router.post('/signup', async (req, res) => {
  try {
    // Support either { firstName, lastName, email, password } or { username, email, password }
    let { firstName, lastName, username, email, password } = req.body;

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Determine username: use provided username if present; else derive from email
    if (username && typeof username === 'string') {
      username = username.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
    if (!username || username.length < 3) {
      let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (baseUsername.length < 3) baseUsername = 'user';
      let candidate = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: candidate }) || candidate.length < 3) {
        candidate = `${baseUsername}${counter}`;
        counter++;
      }
      username = candidate;
    } else {
      // ensure provided username is unique; append counter if needed
      let candidate = username;
      let counter = 1;
      while (await User.findOne({ username: candidate })) {
        candidate = `${username}${counter}`;
        counter++;
      }
      username = candidate;
    }

    // Create a new user instance
    const user = new User({ 
      firstName: firstName || '',
      lastName: lastName || '',
      username,
      email: email.toLowerCase(),
      password,
    });

    await user.save(); // Password will be hashed by the pre-save hook in User.js

    // Automatically log the user in by creating a session
    req.session.userId = user._id;

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        email: user.email,
        level: user.level,
        points: user.points,
        onboardingCompleted: user.onboardingCompleted,
        onboarding: user.onboarding
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.username) {
        return res.status(409).json({ message: 'Username already exists. Please try again.' });
      } else if (error.keyPattern && error.keyPattern.email) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ## POST /api/auth/login ##
// Handles user login.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password using the method from User.js
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create a session for the user
    req.session.userId = user._id;

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        email: user.email,
        level: user.level,
        points: user.points,
        badges: user.badges,
        onboardingCompleted: user.onboardingCompleted,
        onboarding: user.onboarding
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ## POST /api/auth/logout ##
// Destroys the user's session.
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.clearCookie('connect.sid'); // Clears the session cookie
    res.json({ message: 'Logout successful' });
  });
});

// ## GET /api/auth/check ##
// Checks if a user is currently authenticated.
router.get('/check', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId).select('-password'); // Exclude password from the response
    if (!user) {
      // If user was deleted but session persists
      req.session.destroy();
      res.clearCookie('connect.sid');
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        email: user.email,
        level: user.level,
        points: user.points,
        badges: user.badges,
        onboardingCompleted: user.onboardingCompleted,
        onboarding: user.onboarding
      }
    });
  } catch (error)
    {
    console.error('Auth check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;