# Server Setup for Video Generation

## Prerequisites

1. **Install FFmpeg**:
   - Windows: Download from https://ffmpeg.org/download.html or use `winget install FFmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

2. **Install Node.js dependencies**:
   ```bash
   cd server
   npm install
   ```

## Running the Server

```bash
npm start
```

The server will now support:
- `/generate-video` - Server-side MP4 generation
- All existing proxy functionality

## How it Works

1. Client uploads audio file and video data
2. Server generates PNG frames using Canvas
3. FFmpeg combines frames + audio into MP4
4. Client downloads the final MP4 video

This produces higher quality, properly encoded MP4 files instead of browser screen recordings.