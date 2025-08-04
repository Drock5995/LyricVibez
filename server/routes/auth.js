const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ email, password, name });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        videosToday: user.videosToday,
        lastVideoDate: user.lastVideoDate,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        videosToday: user.videosToday,
        lastVideoDate: user.lastVideoDate,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) return res.status(401).json({ message: 'Invalid token' });

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
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;