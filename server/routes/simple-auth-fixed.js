const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Simple in-memory user storage
const users = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Add a test user
users.set('test@example.com', {
  id: '1',
  email: 'test@example.com',
  password: 'password',
  name: 'Test User',
  plan: 'free',
  videosToday: 0,
  lastVideoDate: new Date().toISOString(),
  createdAt: new Date().toISOString()
});

router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields required' });
    }
    
    if (users.has(email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this
      name,
      plan: 'free',
      videosToday: 0,
      lastVideoDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    users.set(email, user);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({
      user: {
        id: user.id,
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

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password });
    
    const user = users.get(email);
    console.log('User found:', !!user);
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    
    res.json({
      user: {
        id: user.id,
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = Array.from(users.values()).find(u => u.id === decoded.userId);
    
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    res.json({
      id: user.id,
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