// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per window
  message: 'Too many registration/login attempts, please try again later.',
});

// ────────────────────────────────────────────────
// POST /api/auth/signup
// Create new user with selected role
// ────────────────────────────────────────────────
router.post('/signup', limiter, async (req, res) => {
  const { username, password, role } = req.body;

  // Validate input
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Username, password and role are required' });
  }

  const validRoles = [
    'learner', 'admin', 'lead', 'front_dev', 'back_dev', 'data_dev', 'test_expert'
  ];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role selected' });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    // Create new user
    user = new User({
      username,
      password, // will be hashed by pre-save hook
      role,
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      role: user.role,
    });
  } catch (err) {
    console.error('[POST /signup] Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ────────────────────────────────────────────────
// POST /api/auth/login  (keep existing, just add limiter)
// ────────────────────────────────────────────────
router.post('/login', limiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token, role: user.role });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;