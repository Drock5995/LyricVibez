const express = require('express');
const router = express.Router();

// Simple in-memory user storage for testing
const users = new Map();
let userIdCounter = 1;

// Export users for sharing with other modules
module.exports.users = users;

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (users.has(email)) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = {
    id: userIdCounter++,
    email,
    name,
    plan: 'free',
    videosToday: 0,
    lastVideoDate: new Date().toDateString(),
    createdAt: new Date().toISOString()
  };
  
  users.set(email, { ...user, password });
  
  res.json({
    user,
    token: `token_${user.id}`
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const userData = users.get(email);
  if (!userData || userData.password !== password) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const { password: _, ...user } = userData;
  
  res.json({
    user,
    token: `token_${user.id}`
  });
});

router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !token.startsWith('token_')) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const userId = parseInt(token.replace('token_', ''));
  const userData = Array.from(users.values()).find(u => u.id === userId);
  
  if (!userData) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { password: _, ...user } = userData;
  res.json(user);
});

module.exports = router;
module.exports.users = users;