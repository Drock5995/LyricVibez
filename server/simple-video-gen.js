// Simple video generation without Canvas - uses FFmpeg text overlays
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

function generateVideo(audioPath, lyrics, outputFile, aspectRatio = '16:9') {
    return new Promise((resolve, reject) => {
        const width = aspectRatio === '9:16' ? 720 : 1280;
        const height = aspectRatio === '9:16' ? 1280 : 720;
        
        // Create black background video
        let command = ffmpeg()
            .input(`color=black:size=${width}x${height}:duration=300`)
            .inputFormat('lavfi')
            .input(audioPath);
        
        // Add text overlays for each lyric
        let filterComplex = '';
        let overlayInputs = '[0:v]';
        
        lyrics.forEach((lyric, index) => {
            const text = lyric.line.replace(/'/g, "\\'").replace(/"/g, '\\"');
            const startTime = lyric.startTime;
            const endTime = lyric.endTime;
            
            filterComplex += `${overlayInputs}drawtext=text='${text}':fontcolor=white:fontsize=${Math.floor(width/20)}:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${startTime},${endTime})'[v${index}];`;
            overlayInputs = `[v${index}]`;
        });
        
        // Remove the last semicolon
        filterComplex = filterComplex.slice(0, -1);
        
        command
            .complexFilter(filterComplex)
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-c:a aac',
                '-shortest',
                '-map', '[v' + (lyrics.length - 1) + ']',
                '-map', '1:a'
            ])
            .output(outputFile)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

module.exports = { generateVideo };