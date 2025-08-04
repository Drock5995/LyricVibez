const express = require('express');
const router = express.Router();

// Import users from auth module
const authModule = require('./simple-auth');
const users = authModule.users;

const getUser = (token) => {
  if (!token || !token.startsWith('token_')) return null;
  const userId = parseInt(token.replace('token_', ''));
  return Array.from(users.values()).find(u => u.id === userId);
};

router.post('/increment-video', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userData = getUser(token);
  
  if (!userData) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const today = new Date().toDateString();
  if (userData.lastVideoDate !== today) {
    userData.videosToday = 0;
    userData.lastVideoDate = today;
  }

  userData.videosToday++;
  
  const { password: _, ...user } = userData;
  res.json(user);
});

router.post('/upgrade', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userData = getUser(token);
  
  if (!userData) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { plan } = req.body;
  userData.plan = plan;
  userData.videosToday = 0;
  
  const { password: _, ...user } = userData;
  res.json(user);
});

module.exports = router;