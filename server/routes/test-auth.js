const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simple test auth without database
router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const user = {
      id: Date.now().toString(),
      email,
      name,
      plan: 'free',
      videosToday: 0,
      lastVideoDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // For testing - accept any credentials
    const user = {
      id: '1',
      email,
      name: 'Test User',
      plan: 'free',
      videosToday: 0,
      lastVideoDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = {
      id: decoded.userId,
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free',
      videosToday: 0,
      lastVideoDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;