const crypto = require('crypto');

const tokens = new Map();

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const csrfProtection = (req, res, next) => {
  if (req.method === 'GET') {
    const token = generateCSRFToken();
    tokens.set(token, Date.now());
    res.cookie('csrf-token', token, { httpOnly: false, secure: false, sameSite: 'lax' });
    return next();
  }

  // Skip CSRF for auth routes initially
  if (req.path.includes('/auth/')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  if (!token || !tokens.has(token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  tokens.delete(token);
  next();
};

module.exports = { csrfProtection };