'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    audioUrl: string;
    userAvatar?: string;
    userName: string;
    duration?: number; // Duration in seconds
    compact?: boolean; // Compact mode for thumbnails
}

export default function AudioPlayer({
    audioUrl,
    userAvatar,
    userName,
    duration,
    compact = false,
}: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    // Format duration to MM:SS
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Draw visualization
    const drawVisualization = useCallback(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const innerRadius = compact ? 30 : 60;
        const maxBarHeight = compact ? 20 : 40;
        const barCount = compact ? 32 : 64;
        const barWidth = compact ? 2 : 3;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (analyserRef.current && isPlaying) {
            // Real-time visualization when playing
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            for (let i = 0; i < barCount; i++) {
                const dataIndex = Math.floor((i / barCount) * bufferLength);
                const amplitude = dataArray[dataIndex] / 255;
                const barHeight = amplitude * maxBarHeight + 4;

                const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
                const innerX = centerX + Math.cos(angle) * (innerRadius + 5);
                const innerY = centerY + Math.sin(angle) * (innerRadius + 5);
                const outerX = centerX + Math.cos(angle) * (innerRadius + 5 + barHeight);
                const outerY = centerY + Math.sin(angle) * (innerRadius + 5 + barHeight);

                ctx.beginPath();
                ctx.moveTo(innerX, innerY);
                ctx.lineTo(outerX, outerY);
                ctx.strokeStyle = `rgba(236, 29, 153, ${0.5 + amplitude * 0.5})`;
                ctx.lineWidth = barWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            animationRef.current = requestAnimationFrame(drawVisualization);
        } else {
            // Static visualization when paused
            for (let i = 0; i < barCount; i++) {
                const barHeight = 6 + Math.sin(i * 0.3) * 10;
                const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
                const innerX = centerX + Math.cos(angle) * (innerRadius + 5);
                const innerY = centerY + Math.sin(angle) * (innerRadius + 5);
                const outerX = centerX + Math.cos(angle) * (innerRadius + 5 + barHeight);
                const outerY = centerY + Math.sin(angle) * (innerRadius + 5 + barHeight);

                ctx.beginPath();
                ctx.moveTo(innerX, innerY);
                ctx.lineTo(outerX, outerY);
                ctx.strokeStyle = 'rgba(236, 29, 153, 0.5)';
                ctx.lineWidth = barWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }
    }, [compact, isPlaying]);

    // Initialize audio
    useEffect(() => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
            setTotalDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
        });

        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        });

        return () => {
            audio.pause();
            audio.src = '';
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [audioUrl]);

    // Draw static visualization on mount
    useEffect(() => {
        drawVisualization();
    }, [drawVisualization]);

    // Toggle playback
    const togglePlay = async () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        } else {
            // Set up audio context for visualization if not already done
            if (!audioContextRef.current && audioRef.current) {
                try {
                    const audioContext = new AudioContext();
                    audioContextRef.current = audioContext;

                    const source = audioContext.createMediaElementSource(audioRef.current);
                    const analyser = audioContext.createAnalyser();
                    analyser.fftSize = 256;

                    source.connect(analyser);
                    analyser.connect(audioContext.destination);

                    sourceRef.current = source;
                    analyserRef.current = analyser;
                } catch (err) {
                    console.warn('Could not create audio context for visualization:', err);
                }
            }

            await audioRef.current.play();
            setIsPlaying(true);
            drawVisualization();
        }
    };

    const size = compact ? 100 : 200;
    const avatarSize = compact ? 'w-14 h-14' : 'w-28 h-28';
    const ringSize = compact ? 'ring-2' : 'ring-4';

    return (
        <div className={`flex flex-col items-center justify-center ${compact ? 'p-2' : 'p-6'} bg-black/90 rounded-lg`}>
            {/* Visualization Container */}
            <div
                className="relative flex items-center justify-center cursor-pointer"
                style={{ width: size, height: size }}
                onClick={togglePlay}
            >
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    className="absolute inset-0"
                />

                {/* User Avatar */}
                <div className={`relative z-10 ${avatarSize} rounded-full overflow-hidden ${ringSize} ring-[#EC1D99] ring-offset-2 ring-offset-black`}>
                    <img
                        src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`}
                        alt={userName}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {isPlaying ? (
                            <Pause className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
                        ) : (
                            <Play className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-white ml-0.5`} />
                        )}
                    </div>
                </div>
            </div>

            {/* Duration and Progress */}
            {!compact && (
                <div className="mt-4 text-center">
                    <p className="text-white font-mono text-lg tabular-nums">
                        {formatDuration(currentTime)} / {formatDuration(totalDuration)}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-48 h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div
                            className="h-full bg-[#EC1D99] transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Compact Duration */}
            {compact && (
                <p className="text-white text-xs font-mono mt-1 tabular-nums">
                    {formatDuration(totalDuration)}
                </p>
            )}
        </div>
    );
}
