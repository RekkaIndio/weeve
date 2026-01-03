'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, X, Check, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
    userAvatar?: string;
    userName: string;
    onRecordingComplete: (audioBlob: Blob, duration: number) => void;
    onCancel: () => void;
    maxDuration?: number; // in seconds, default 60
}

export default function AudioRecorder({
    userAvatar,
    userName,
    onRecordingComplete,
    onCancel,
    maxDuration = 60,
}: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [hasRecording, setHasRecording] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioBlobRef = useRef<Blob | null>(null);
    const startTimeRef = useRef<number>(0);
    const finalDurationRef = useRef<number>(0);

    // Format duration to MM:SS
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Draw waveform visualization
    const drawWaveform = useCallback(() => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw circular waveform around avatar
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const innerRadius = 60; // Avatar radius
        const maxBarHeight = 40;
        const barCount = 64;
        const barWidth = 3;

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

        animationRef.current = requestAnimationFrame(drawWaveform);
    }, []);

    // Start recording
    const startRecording = async () => {
        try {
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                // Try to polyfill for older browsers/WebViews
                const navigatorAny = navigator as any;
                const getUserMedia = navigatorAny.getUserMedia ||
                    navigatorAny.webkitGetUserMedia ||
                    navigatorAny.mozGetUserMedia ||
                    navigatorAny.msGetUserMedia;

                if (getUserMedia) {
                    // Use legacy API with callback
                    await new Promise<MediaStream>((resolve, reject) => {
                        getUserMedia.call(navigator,
                            { audio: true },
                            (stream: MediaStream) => resolve(stream),
                            (err: Error) => reject(err)
                        );
                    }).then(stream => {
                        streamRef.current = stream;
                        setupRecording(stream);
                    });
                    return;
                }

                console.error('getUserMedia not supported in this environment');
                setPermissionDenied(true);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            streamRef.current = stream;
            setupRecording(stream);

        } catch (err: any) {
            console.error('Failed to start recording:', err);
            // Check for specific error types
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                console.error('No microphone found');
                setPermissionDenied(true);
            } else {
                setPermissionDenied(true);
            }
        }
    };

    // Setup recording after getting stream
    const setupRecording = (stream: MediaStream) => {
        // Set up audio context for visualization
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Set up media recorder
        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; // iOS Safari fallback
            } else if (MediaRecorder.isTypeSupported('audio/m4a')) {
                mimeType = 'audio/m4a';
            }
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            audioBlobRef.current = blob;
            setHasRecording(true);
        };

        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        startTimeRef.current = Date.now();
        setIsRecording(true);
        setPermissionDenied(false);

        // Start timer
        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setDuration(elapsed);

            // Auto-stop at max duration
            if (elapsed >= maxDuration) {
                stopRecording();
            }
        }, 1000);

        // Start visualization
        drawWaveform();
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            finalDurationRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
            mediaRecorderRef.current.stop();
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        setIsRecording(false);
    };

    // Cleanup stream
    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
    }, []);

    // Handle confirm
    const handleConfirm = async () => {
        if (audioBlobRef.current) {
            setIsProcessing(true);
            cleanup();
            onRecordingComplete(audioBlobRef.current, finalDurationRef.current || duration);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        cleanup();
        onCancel();
    };

    // Handle re-record
    const handleReRecord = () => {
        audioBlobRef.current = null;
        setHasRecording(false);
        setDuration(0);
        finalDurationRef.current = 0;
        startRecording();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    // Draw static waveform when not recording but has recording
    useEffect(() => {
        if (hasRecording && !isRecording && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw static circular pattern
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const innerRadius = 60;
            const barCount = 64;
            const barWidth = 3;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < barCount; i++) {
                const barHeight = 10 + Math.sin(i * 0.3) * 15;
                const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
                const innerX = centerX + Math.cos(angle) * (innerRadius + 5);
                const innerY = centerY + Math.sin(angle) * (innerRadius + 5);
                const outerX = centerX + Math.cos(angle) * (innerRadius + 5 + barHeight);
                const outerY = centerY + Math.sin(angle) * (innerRadius + 5 + barHeight);

                ctx.beginPath();
                ctx.moveTo(innerX, innerY);
                ctx.lineTo(outerX, outerY);
                ctx.strokeStyle = 'rgba(236, 29, 153, 0.7)';
                ctx.lineWidth = barWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }
    }, [hasRecording, isRecording]);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-black p-6">
            {/* Waveform Visualizer with Avatar */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                <canvas
                    ref={canvasRef}
                    width={256}
                    height={256}
                    className="absolute inset-0"
                />

                {/* User Avatar in Center */}
                <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden ring-4 ring-[#EC1D99] ring-offset-2 ring-offset-black">
                    <img
                        src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`}
                        alt={userName}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Duration Display */}
            <div className="text-4xl font-mono text-white mb-2 tabular-nums">
                {formatDuration(duration)}
            </div>
            <p className="text-gray-400 text-sm mb-8">
                {isRecording ? 'Recording...' : hasRecording ? 'Recording complete' : 'Tap to start recording'}
            </p>

            {/* Permission/API Denied Message */}
            {permissionDenied && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 mb-6 max-w-xs text-center">
                    <p className="text-red-400 text-sm">
                        {typeof window !== 'undefined' && !window.isSecureContext
                            ? 'Audio recording requires a secure connection (HTTPS). Please use the production app or connect via localhost.'
                            : 'Microphone access denied. Please enable microphone permissions in your device settings.'}
                    </p>
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
                {!isRecording && !hasRecording && (
                    <>
                        <button
                            onClick={handleCancel}
                            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={startRecording}
                            disabled={permissionDenied}
                            className="w-20 h-20 rounded-full bg-[#EC1D99] flex items-center justify-center hover:bg-[#d4198a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Mic className="w-10 h-10 text-white" />
                        </button>
                        <div className="w-14 h-14" /> {/* Spacer for balance */}
                    </>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors animate-pulse"
                    >
                        <Square className="w-8 h-8 text-white" fill="white" />
                    </button>
                )}

                {hasRecording && !isRecording && (
                    <>
                        <button
                            onClick={handleCancel}
                            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={handleReRecord}
                            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                        >
                            <Mic className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-10 h-10 text-white animate-spin" />
                            ) : (
                                <Check className="w-10 h-10 text-white" />
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Max duration hint */}
            <p className="text-gray-500 text-xs mt-6">
                Maximum recording: {maxDuration} seconds
            </p>
        </div>
    );
}
