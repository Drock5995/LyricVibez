/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { generateVideo } = require('./simple-video-gen');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const port = process.env.PORT || 3000;
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;



const staticPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');
const outputPath = path.join(__dirname, 'output');

// Ensure directories exist
[uploadsPath, outputPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Basic middleware
app.use(cookieParser());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.set('trust proxy', 1);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Input sanitization
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"&]/g, (char) => {
        const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
        return entities[char];
    });
};

// Secure logging
const secureLog = (message, data = null) => {
    const sanitizedMessage = sanitizeInput(message);
    if (data) {
        const sanitizedData = typeof data === 'string' ? sanitizeInput(data) : '[object]';
        console.log(`${sanitizedMessage}: ${sanitizedData}`);
    } else {
        console.log(sanitizedMessage);
    }
};

// Path validation
const validatePath = (filePath, allowedDir) => {
    const resolved = path.resolve(filePath);
    const allowed = path.resolve(allowedDir);
    return resolved.startsWith(allowed);
};

// File upload configuration
const upload = multer({
    dest: uploadsPath,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

if (!apiKey) {
    console.error("Warning: GEMINI_API_KEY or API_KEY environment variable is not set!");
} else {
    secureLog("API KEY FOUND");
}

// Rate limiters
const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many auth attempts, please try again later'
});

// Video generation endpoint (must come before api-proxy middleware)
app.post('/generate-video', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }
        
        if (!req.body.data) {
            return res.status(400).json({ error: 'Missing data' });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(req.body.data);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON data' });
        }

        const { lyrics, aspectRatio } = parsedData;
        if (!lyrics || !aspectRatio) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const audioPath = req.file.path;
        if (!validatePath(audioPath, uploadsPath)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        const outputFile = path.join(outputPath, `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`);
        
        secureLog('Generating video with text overlays');
        
        let parsedLyrics;
        try {
            parsedLyrics = JSON.parse(lyrics);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid lyrics format' });
        }

        await generateVideo(audioPath, parsedLyrics, outputFile, aspectRatio);
        
        if (!fs.existsSync(outputFile)) {
            throw new Error('Video generation failed - output file not created');
        }
        
        secureLog('Video generation complete');
        
        res.download(outputFile, 'lyric-video.mp4', (err) => {
            if (err) {
                secureLog('Download error', err.message);
            }
            
            setTimeout(() => {
                try {
                    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                } catch (e) {
                    secureLog('Cleanup error', e.message);
                }
            }, 5000);
        });
            
    } catch (error) {
        secureLog('Video generation error', error.message);
        
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                secureLog('Error cleanup failed', e.message);
            }
        }
        
        if (!res.headersSent) {
            res.status(500).json({ error: 'Video generation failed', details: error.message });
        }
    }
});



// Connect to MongoDB Atlas
mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// API routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);

// Apply rate limiter to api-proxy
app.use('/api-proxy', proxyLimiter);

// Proxy route for Gemini API calls
app.use('/api-proxy', async (req, res, next) => {
    if (!apiKey) {
        return res.status(503).json({ error: 'API key not configured' });
    }

    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next();
    }

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Goog-Api-Key');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.sendStatus(200);
    }

    try {
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
        secureLog('HTTP Proxy: Forwarding request to API');

        const outgoingHeaders = {};
        for (const header in req.headers) {
            if (!['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade'].includes(header.toLowerCase())) {
                outgoingHeaders[header] = req.headers[header];
            }
        }

        outgoingHeaders['X-Goog-Api-Key'] = apiKey;

        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            outgoingHeaders['Content-Type'] = req.headers['content-type'] || 'application/json';
        }

        if (['GET', 'DELETE'].includes(req.method.toUpperCase())) {
            delete outgoingHeaders['Content-Type'];
        }

        if (!outgoingHeaders['accept']) {
            outgoingHeaders['accept'] = '*/*';
        }

        const axiosConfig = {
            method: req.method,
            url: apiUrl,
            headers: outgoingHeaders,
            validateStatus: () => true,
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            axiosConfig.data = req.body;
        }

        const apiResponse = await axios(axiosConfig);

        // Set response headers
        Object.keys(apiResponse.headers).forEach(key => {
            if (key.toLowerCase() !== 'transfer-encoding') {
                res.setHeader(key, apiResponse.headers[key]);
            }
        });
        
        res.status(apiResponse.status);
        res.send(apiResponse.data);

    } catch (error) {
        secureLog('Proxy error', error.message);
        if (!res.headersSent) {
            if (error.response) {
                res.status(error.response.status).json({ error: 'Proxy error from upstream API' });
            } else {
                res.status(500).json({ error: 'Proxy setup error' });
            }
        }
    }
});

// Static file serving
app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

// Fallback route
app.get('*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    
    if (!validatePath(indexPath, staticPath)) {
        return res.status(404).send('Not found');
    }
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('App not found');
    }
});

// Create server
const server = http.createServer(app);

// WebSocket handling
server.on('upgrade', (request, socket, head) => {
    if (!apiKey) {
        socket.destroy();
        return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);
    
    if (url.pathname.startsWith('/api-proxy/')) {
        const wss = new WebSocket.Server({ noServer: true });
        
        wss.handleUpgrade(request, socket, head, (ws) => {
            const targetPath = url.pathname.substring('/api-proxy'.length);
            const targetUrl = `${externalWsBaseUrl}${targetPath}?key=${apiKey}`;
            
            const targetWs = new WebSocket(targetUrl);
            
            const timeout = setTimeout(() => {
                if (targetWs.readyState === WebSocket.CONNECTING) {
                    targetWs.close();
                    ws.close(1008, 'Connection timeout');
                }
            }, 30000);
            
            targetWs.on('open', () => {
                clearTimeout(timeout);
            });
            
            ws.on('message', (data) => {
                if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(data);
                }
            });
            
            targetWs.on('message', (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });
            
            targetWs.on('close', () => {
                clearTimeout(timeout);
                ws.close();
            });
            
            ws.on('close', () => {
                clearTimeout(timeout);
                targetWs.close();
            });
            
            targetWs.on('error', (error) => {
                clearTimeout(timeout);
                secureLog('WebSocket target error', error.message);
                ws.close(1011, 'Upstream error');
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                secureLog('WebSocket client error', error.message);
                targetWs.close();
            });
        });
    } else {
        socket.destroy();
    }
});

server.listen(port, () => {
    secureLog(`Server running on port ${port}`);
});