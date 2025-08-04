import React, { useRef, useEffect, useState } from 'react';

interface AudioWaveformProps {
    audioUrl: string;
    currentTime: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioUrl, currentTime }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [waveform, setWaveform] = useState<Float32Array | null>(null);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audioContext = new AudioContext();
        fetch(audioUrl)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                setDuration(audioBuffer.duration);
                // Downsample for performance
                const rawData = audioBuffer.getChannelData(0);
                const samples = 500; // Number of bars to draw
                const blockSize = Math.floor(rawData.length / samples);
                const filteredData = [];
                for (let i = 0; i < samples; i++) {
                    let blockStart = blockSize * i;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum = sum + Math.abs(rawData[blockStart + j]);
                    }
                    filteredData.push(sum / blockSize);
                }
                setWaveform(new Float32Array(filteredData));
            })
            .catch(e => console.error("Error loading waveform data:", e));
    }, [audioUrl]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !waveform) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const barWidth = width / waveform.length;
        const maxAmp = Math.max(...waveform) * 1.2;

        ctx.fillStyle = 'rgba(107, 114, 128, 0.5)'; // gray-500
        waveform.forEach((amp, i) => {
            const barHeight = (amp / maxAmp) * height;
            ctx.fillRect(i * barWidth, height / 2 - barHeight / 2, barWidth - 1, barHeight);
        });

        // Draw playhead
        if (duration > 0) {
            const playheadX = (currentTime / duration) * width;
            ctx.fillStyle = '#22d3ee'; // cyan-400
            ctx.fillRect(playheadX, 0, 2, height);
        }

    }, [waveform, currentTime, duration]);

    return <canvas ref={canvasRef} width="800" height="100" className="w-full h-24 rounded-lg bg-gray-900/50"></canvas>;
};
