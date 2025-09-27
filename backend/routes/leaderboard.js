const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// GET /api/leaderboard
// Returns top users by points (XP). Optionally include current user's rank.
router.get('/', requireAuth, async (req, res) => {
  try {
    // Top 10 by points
    let top = await User.find({}, 'firstName username email level points')
      .sort({ points: -1, createdAt: 1 })
      .limit(10)
      .lean();

    // Compute current user's global rank
    const my = await User.findById(req.session.userId, 'firstName username email level points').lean();
    const aheadCount = await User.countDocuments({ points: { $gt: my.points } });
    const myRank = aheadCount + 1;

    // Ensure current user is present in the top list for display purposes
    const inTop = top.some(u => String(u._id) === String(my._id));
    if (!inTop) {
      top = [my, ...top].slice(0, 10);
    }

    // Optional: include recent activity summary (sessions count + minutes)
    const pipeline = [
      { $match: { completed: true } },
      { $group: { _id: '$userId', sessions: { $sum: 1 }, minutes: { $sum: '$duration' } } },
    ];
    const aggregates = await Session.aggregate(pipeline);
    const aggMap = new Map(aggregates.map(a => [String(a._id), a]));

    const formatName = (u) => u.firstName || u.username || (u.email ? u.email.split('@')[0] : 'User');

    const leaderboard = top.map(u => ({
      name: formatName(u),
      level: u.level || 1,
      xp: u.points || 0,
      sessions: aggMap.get(String(u._id))?.sessions || 0,
      minutes: aggMap.get(String(u._id))?.minutes || 0,
    }));

    res.json({
      leaderboard,
      me: { name: formatName(my), level: my.level || 1, xp: my.points || 0, rank: myRank },
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

module.exports = router;
