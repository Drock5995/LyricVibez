const path = require('path');

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>'\"&]/g, (char) => {
    const entities = { '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#x27;', '&': '&amp;' };
    return entities[char];
  });
};

const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  if (req.file.size > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large' });
  }
  
  next();
};

const validatePath = (filePath, allowedDir) => {
  const resolved = path.resolve(filePath);
  const allowed = path.resolve(allowedDir);
  return resolved.startsWith(allowed);
};

module.exports = { sanitizeInput, validateFileUpload, validatePath };