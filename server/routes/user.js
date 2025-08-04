const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/increment-video', auth, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date().toDateString();

    if (user.lastVideoDate !== today) {
      user.videosToday = 0;
      user.lastVideoDate = today;
    }

    user.videosToday++;
    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      videosToday: user.videosToday,
      lastVideoDate: user.lastVideoDate,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upgrade', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user;

    user.plan = plan;
    user.videosToday = 0;
    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      videosToday: user.videosToday,
      lastVideoDate: user.lastVideoDate,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;