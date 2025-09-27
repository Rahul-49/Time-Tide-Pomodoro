const express = require('express');
const User = require('../models/User');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('onboarding onboardingCompleted');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ onboarding: user.onboarding, onboardingCompleted: user.onboardingCompleted });
  } catch (err) {
    console.error('Get onboarding error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const { knowledgeLevel, goals, preferredSessionMins, complete } = req.body;

    const update = {};
    if (knowledgeLevel) update['onboarding.knowledgeLevel'] = knowledgeLevel;
    if (Array.isArray(goals)) update['onboarding.goals'] = goals;
    if (typeof preferredSessionMins === 'number') update['onboarding.preferredSessionMins'] = preferredSessionMins;
    if (complete === true) update['onboardingCompleted'] = true;

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: update },
      { new: true, runValidators: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Onboarding saved',
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        email: user.email,
        level: user.level,
        points: user.points,
        badges: user.badges,
        onboardingCompleted: user.onboardingCompleted,
        onboarding: user.onboarding,
      }
    });
  } catch (err) {
    console.error('Save onboarding error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


