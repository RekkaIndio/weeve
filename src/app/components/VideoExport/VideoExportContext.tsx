"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Story, useStore } from '@/lib/store';
import { createImageFromText, createWatermarkImage, createGroupWatermarkImage } from '@/lib/mediaUtils';

export type ExportState = 'idle' | 'loading-ffmpeg' | 'downloading-assets' | 'stitching' | 'complete' | 'error';

export interface ExportOptions {
    highQuality?: boolean;
    groupAvatarUrl?: string;
    groupName?: string;
}

interface VideoExportContextValue {
    // Current export state
    exportState: ExportState;
    progress: number;
    videoUrl: string | null;
    currentStory: Story | null;

    // Actions
    startExport: (story: Story, options?: ExportOptions) => void;
    saveToDevice: () => Promise<void>;
    shareVideo: (platform?: string) => Promise<void>;
    reset: () => void;

    // Derived
    isExporting: boolean;
    isComplete: boolean;
}

const VideoExportContext = createContext<VideoExportContextValue | null>(null);

export function useVideoExport() {
    const context = useContext(VideoExportContext);
    if (!context) {
        throw new Error('useVideoExport must be used within a VideoExportProvider');
    }
    return context;
}

// Optional hook that doesn't throw if used outside provider (for components that may or may not have access)
export function useVideoExportOptional() {
    return useContext(VideoExportContext);
}

export function VideoExportProvider({ children }: { children: React.ReactNode }) {
    const stories = useStore((state) => state.stories);

    const [exportState, setExportState] = useState<ExportState>('idle');
    const [progress, setProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [currentStory, setCurrentStory] = useState<Story | null>(null);
    const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
    const [exportOptions, setExportOptions] = useState<ExportOptions | undefined>();

    const ffmpegRef = useRef<FFmpeg | null>(null);
    const stepRef = useRef(0);
    const totalStepsRef = useRef(1);
    const lastProgressTimestampRef = useRef<number>(0);
    const lastProgressValueRef = useRef<number>(0);
    const progressWatchdogRef = useRef<number | null>(null);

    const isExporting = exportState !== 'idle' && exportState !== 'complete' && exportState !== 'error';
    const isComplete = exportState === 'complete';

    const loadFFmpeg = useCallback(async () => {
        if (ffmpegRef.current && (ffmpegRef.current as any).isLoaded?.()) {
            return ffmpegRef.current;
        }

        let ffmpeg = ffmpegRef.current || new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            // Debug logging - can be disabled in production
        });

        ffmpeg.on('progress', (ev: any) => {
            const ratio = typeof ev.ratio === 'number' ? ev.ratio : (typeof ev.progress === 'number' ? ev.progress : 0);
            let p = Math.max(0, Math.min(1, ratio));
            setProgress(Math.round(p * 10));
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        try {
            setExportState('loading-ffmpeg');
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            ffmpegRef.current = ffmpeg;
            return ffmpeg;
        } catch (e) {
            console.error('FFmpeg failed to load:', e);
            throw e;
        }
    }, []);

    const reset = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setCurrentStory(null);
        setSavedFilePath(null);
        setExportOptions(undefined);

        try {
            if (ffmpegRef.current) {
                ffmpegRef.current.terminate();
                ffmpegRef.current = null;
            }
        } catch (e) {
            console.error('Failed to terminate FFmpeg:', e);
        }

        setExportState('idle');
        setProgress(0);

        if (progressWatchdogRef.current) {
            window.clearInterval(progressWatchdogRef.current);
            progressWatchdogRef.current = null;
        }
    }, [videoUrl]);

    const saveToDevice = useCallback(async () => {
        if (!videoUrl || !currentStory) return;

        try {
            const { Capacitor } = await import('@capacitor/core');
            const isNative = Capacitor.isNativePlatform();

            const response = await fetch(videoUrl);
            const fileBlob = await response.blob();
            const filename = `${currentStory.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_weeve${exportOptions?.highQuality ? '_HQ' : ''}.mp4`;

            if (isNative) {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Media } = await import('@capacitor-community/media');

                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        resolve(res.split(',')[1]);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(fileBlob);
                });

                const tempFile = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache,
                    recursive: true
                });

                const platform = Capacitor.getPlatform();
                let albumIdentifier: string | undefined;
                try {
                    const albums = await Media.getAlbums();
                    const weeveAlbum = albums.albums.find(a => a.name === 'Weeve');
                    if (weeveAlbum) {
                        albumIdentifier = weeveAlbum.identifier;
                    } else {
                        await Media.createAlbum({ name: 'Weeve' });
                        const updatedAlbums = await Media.getAlbums();
                        const newAlbum = updatedAlbums.albums.find(a => a.name === 'Weeve');
                        albumIdentifier = newAlbum?.identifier;
                    }
                } catch (albumError) {
                    console.warn('Could not get/create Weeve album:', albumError);
                }

                if (platform === 'android' && !albumIdentifier) {
                    throw new Error('Could not create album for saving video on Android');
                }

                await Media.saveVideo({
                    path: tempFile.uri,
                    albumIdentifier: albumIdentifier
                });

                // Don't delete temp file - user may want to save again
                // File will be cleaned up when cache is cleared

                setSavedFilePath(tempFile.uri);
            } else {
                const downloadUrl = window.URL.createObjectURL(fileBlob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
            }
        } catch (error) {
            console.error('Failed to save video:', error);
        }
    }, [videoUrl, currentStory, exportOptions]);

    const shareVideo = useCallback(async (platform?: string) => {
        if (!videoUrl || !currentStory) return;

        try {
            const { Capacitor } = await import('@capacitor/core');
            const isNative = Capacitor.isNativePlatform();

            const response = await fetch(videoUrl);
            const fileBlob = await response.blob();
            const filename = `${currentStory.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_weeve.mp4`;

            if (isNative) {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        resolve(res.split(',')[1]);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(fileBlob);
                });

                const savedFile = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true
                });

                await Share.share({
                    title: currentStory.title,
                    text: `Check out "${currentStory.title}" on Weeve!`,
                    url: savedFile.uri,
                    dialogTitle: 'Share Video'
                });
            } else {
                if (navigator.share && navigator.canShare) {
                    const file = new File([fileBlob], filename, { type: 'video/mp4' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: currentStory.title,
                            text: `Check out "${currentStory.title}" on Weeve!`
                        });
                    }
                }
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
            }
        }
    }, [videoUrl, currentStory]);

    const startExport = useCallback(async (story: Story, options?: ExportOptions) => {
        if (!story.contributions || story.contributions.length === 0) {
            console.error('No clips to stitch');
            return;
        }

        // Reset any previous export
        if (videoUrl) {
            try { URL.revokeObjectURL(videoUrl); } catch (e) { }
            setVideoUrl(null);
        }

        setCurrentStory(story);
        setExportOptions(options);
        setProgress(0);

        // Initialize progress tracking refs
        lastProgressTimestampRef.current = Date.now();
        lastProgressValueRef.current = 0;

        try {
            setExportState('loading-ffmpeg');
            await loadFFmpeg();
            let ffmpeg = ffmpegRef.current;
            if (!ffmpeg) {
                throw new Error('FFmpeg did not load as expected');
            }

            // Attach progress handler
            ffmpeg.on('progress', (ev: any) => {
                const progressNumber = typeof ev.progress === 'number' ? ev.progress : (typeof ev.ratio === 'number' ? ev.ratio : 0);
                let p = Math.max(0, Math.min(1, progressNumber));

                const completedSteps = stepRef.current;
                const total = totalStepsRef.current;
                const global = ((completedSteps + p) / total) * 100;
                setProgress(Math.min(Math.round(global), 99));

                lastProgressValueRef.current = global;
                lastProgressTimestampRef.current = Date.now();
            });

            // Start watchdog - use longer timeout for mobile devices (3 minutes)
            // FFmpeg WASM can be very slow on mobile and may not emit progress events regularly
            if (progressWatchdogRef.current) {
                window.clearInterval(progressWatchdogRef.current);
            }
            const WATCHDOG_TIMEOUT_MS = 180000; // 3 minutes
            progressWatchdogRef.current = window.setInterval(() => {
                const elapsed = lastProgressTimestampRef.current ? (Date.now() - lastProgressTimestampRef.current) : 0;
                // Only trigger stall if we haven't completed AND no progress for a long time
                // Also require that we've actually started processing (progress > 0)
                if (stepRef.current < totalStepsRef.current && elapsed > WATCHDOG_TIMEOUT_MS && lastProgressValueRef.current > 0) {
                    console.error('FFmpeg stalled - no progress for 3 minutes');
                    try {
                        if (ffmpegRef.current) {
                            ffmpegRef.current.terminate();
                            ffmpegRef.current = null;
                        }
                    } catch (e) { }
                    setExportState('error');
                    setProgress(0);
                    if (progressWatchdogRef.current) {
                        window.clearInterval(progressWatchdogRef.current);
                        progressWatchdogRef.current = null;
                    }
                }
            }, 10000); // Check every 10 seconds

            setExportState('downloading-assets');

            // Sort contributions: prefer slotIndex for proper order, fallback to timestamp
            const sorted = [...story.contributions].sort((a, b) => {
                // If both have slotIndex, use that for proper story order
                if (a.slotIndex !== undefined && b.slotIndex !== undefined) {
                    return a.slotIndex - b.slotIndex;
                }
                // If only one has slotIndex, prioritize the one with slotIndex
                if (a.slotIndex !== undefined) return -1;
                if (b.slotIndex !== undefined) return 1;
                // Fallback to timestamp
                return a.timestamp - b.timestamp;
            });
            const cleanupFiles: string[] = [];


            stepRef.current = 0;
            totalStepsRef.current = sorted.length + 3;

            const INTERMEDIATE_WIDTH = 720;
            const INTERMEDIATE_HEIGHT = 1280;
            const INTERMEDIATE_VIDEO_FILTER = `scale=${INTERMEDIATE_WIDTH}:${INTERMEDIATE_HEIGHT}:force_original_aspect_ratio=decrease,pad=${INTERMEDIATE_WIDTH}:${INTERMEDIATE_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

            const intermediateVideoFiles: string[] = [];
            const intermediateAudioFiles: string[] = [];

            const execWithRetry = async (args: string[], retry = 1) => {
                let attempt = 0;
                while (true) {
                    try {
                        attempt += 1;
                        return await ffmpeg!.exec(args);
                    } catch (err: any) {
                        const msg = String(err?.message || err);
                        const isCritical = msg.includes('ffmpeg is not loaded') || msg.includes('WASM') || msg.includes('killed');
                        if (attempt <= retry && isCritical) {
                            try {
                                if (ffmpegRef.current) {
                                    ffmpegRef.current.terminate();
                                    ffmpegRef.current = null;
                                }
                            } catch (e) { }
                            await loadFFmpeg();
                            ffmpeg = ffmpegRef.current!;
                            continue;
                        }
                        throw err;
                    }
                }
            };

            // Process each contribution
            for (let i = 0; i < sorted.length; i++) {
                const c = sorted[i];
                const inputFilename = `raw_input_${i}`;
                const outputVideoName = `part_${i}_v.mp4`;
                const outputAudioName = `part_${i}_a.m4a`;

                let rawFile = '';
                let isVideoInput = false;

                try {
                    const url = c.mediaUrl || '';

                    // More robust URL extension detection - check for extension anywhere in path, not just at end
                    // This handles Supabase's URL format: /storage/v1/object/public/bucket/path/file.mp4
                    const urlPath = url.split('?')[0]; // Remove query params for cleaner matching
                    const isUrlVideo = /\.(mp4|webm|mov|m4v|ogg|3gp|avi)/i.test(urlPath);
                    const isUrlImage = /\.(jpg|jpeg|png|gif|webp|avif|heic|heif)/i.test(urlPath);
                    const isText = c.mediaType === 'text' || (!c.mediaUrl && c.content);



                    if ((c.mediaType === 'video' || isUrlVideo) && c.mediaUrl) {

                        const blob = await fetchFile(c.mediaUrl);
                        rawFile = `${inputFilename}.mp4`;
                        await ffmpeg.writeFile(rawFile, blob);
                        isVideoInput = true;
                    } else if ((c.mediaType === 'image' || c.mediaType === 'drawing' || isUrlImage) && c.mediaUrl) {

                        const blob = await fetchFile(c.mediaUrl);
                        const ext = (url.split('.').pop() || 'jpg').split('?')[0];
                        rawFile = `${inputFilename}.${ext}`;
                        await ffmpeg.writeFile(rawFile, blob);
                    } else if (isText) {

                        const blob = await createImageFromText(c.content, c.textStyle || {
                            fontFamily: 'Inter',
                            fontSize: 28,
                            textColor: '#FFFFFF',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            textAlign: 'center'
                        });
                        const data = await new Response(blob).arrayBuffer();
                        rawFile = `${inputFilename}.png`;
                        await ffmpeg.writeFile(rawFile, new Uint8Array(data));
                    } else {
                        console.warn(`[VideoExport] ${i}: SKIPPING - no matching media type! mediaType=${c.mediaType}, mediaUrl=${c.mediaUrl}, content=${c.content?.substring(0, 20)}`);
                        stepRef.current += 1;
                        continue;
                    }

                    setExportState('stitching');

                    const videoFlags = [
                        '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0',
                        '-preset', 'ultrafast',
                        '-b:v', options?.highQuality ? '5M' : '1.5M',
                        '-r', '30', '-g', '30', '-an', '-threads', '1',
                        outputVideoName
                    ];

                    if (isVideoInput) {
                        await execWithRetry(['-i', rawFile, '-vf', INTERMEDIATE_VIDEO_FILTER, '-pix_fmt', 'yuv420p', ...videoFlags], 1);
                    } else {
                        // Image or text -> 4 second video
                        const imageCommand = ['-loop', '1', '-i', rawFile, '-vf', INTERMEDIATE_VIDEO_FILTER, '-t', '4', '-pix_fmt', 'yuv420p', ...videoFlags];
                        await execWithRetry(imageCommand, 1);
                    }

                    intermediateVideoFiles.push(outputVideoName);
                    cleanupFiles.push(outputVideoName);



                    if (isVideoInput) {
                        try {
                            await execWithRetry(['-i', rawFile, '-vn', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', '-y', outputAudioName], 1);
                        } catch (e) {
                            await execWithRetry(['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', '-y', outputAudioName], 1);
                        }
                    } else {
                        await execWithRetry(['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', '-y', outputAudioName], 1);
                    }
                    intermediateAudioFiles.push(outputAudioName);
                    cleanupFiles.push(outputAudioName);

                    try { await ffmpeg.deleteFile(rawFile); } catch (e) { }
                    stepRef.current += 1;
                } catch (e) {
                    console.error(`Failed to process contribution ${c.id}:`, e);
                    stepRef.current += 1;
                }
            }

            if (intermediateVideoFiles.length === 0) {
                if (story.coverImage) {
                    try {
                        const blob = await fetchFile(story.coverImage);
                        await ffmpeg.writeFile('fallback_cover.jpg', blob);
                        await ffmpeg!.exec(['-loop', '1', '-i', 'fallback_cover.jpg', '-vf', INTERMEDIATE_VIDEO_FILTER, '-t', '4', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', 'part_0_v.mp4']);
                        await ffmpeg!.exec(['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:a', 'aac', 'fallback_a.m4a']);
                        intermediateVideoFiles.push('part_0_v.mp4');
                        intermediateAudioFiles.push('fallback_a.m4a');
                        cleanupFiles.push('part_0_v.mp4', 'fallback_a.m4a', 'fallback_cover.jpg');
                    } catch (e) {
                        setExportState('error');
                        return;
                    }
                } else {
                    setExportState('error');
                    return;
                }
            }

            // Concat audio
            const concatListA = intermediateAudioFiles.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile('concat_a.txt', concatListA);
            cleanupFiles.push('concat_a.txt');
            await execWithRetry(['-f', 'concat', '-safe', '0', '-i', 'concat_a.txt', '-c', 'copy', '-threads', '1', 'final_a.m4a'], 1);
            cleanupFiles.push('final_a.m4a');
            stepRef.current += 1;

            // Create watermarks
            let hasGroupWatermark = false;
            try {
                const creator = story.participants.find(p => p.id === story.creatorId);
                const creatorName = creator ? (creator.name || creator.inviteCode || 'Weeve') : 'Weeve';

                let originalCreatorName: string | undefined;
                if (story.forkedFromStoryId) {
                    const originalStory = stories.find(s => s.id === story.forkedFromStoryId);
                    if (originalStory) {
                        const originalCreator = originalStory.participants?.find(p => p.id === originalStory.creatorId);
                        if (originalCreator) {
                            originalCreatorName = originalCreator.name || originalCreator.inviteCode;
                        }
                    }
                }

                const watermarkBlob = await createWatermarkImage(
                    creatorName,
                    originalCreatorName,
                    creator?.isBrand && creator.avatar ? creator.avatar : undefined
                );
                await ffmpeg.writeFile('watermark.png', new Uint8Array(await watermarkBlob.arrayBuffer()));
                cleanupFiles.push('watermark.png');
            } catch (e) {
                try {
                    const logoBlob = await fetchFile('/weeve-logo.png');
                    await ffmpeg.writeFile('watermark.png', logoBlob);
                    cleanupFiles.push('watermark.png');
                } catch (e2) { }
            }

            if (options?.groupAvatarUrl) {
                try {
                    const groupWatermarkBlob = await createGroupWatermarkImage(
                        options.groupAvatarUrl,
                        options.groupName
                    );
                    await ffmpeg.writeFile('group_watermark.png', new Uint8Array(await groupWatermarkBlob.arrayBuffer()));
                    cleanupFiles.push('group_watermark.png');
                    hasGroupWatermark = true;
                } catch (e) { }
            }

            // Concat video
            const concatListV = intermediateVideoFiles.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile('concat_v.txt', concatListV);
            cleanupFiles.push('concat_v.txt');
            await execWithRetry(['-f', 'concat', '-safe', '0', '-i', 'concat_v.txt', '-c', 'copy', '-threads', '1', 'final_v.mp4'], 1);
            cleanupFiles.push('final_v.mp4');
            stepRef.current += 1;

            // Final merge with watermarks
            try {
                let filter: string;
                let inputs: string[];

                if (hasGroupWatermark) {
                    filter = `[0:v][3:v]overlay=20:20[v1];[v1][2:v]overlay=main_w-overlay_w-20:main_h-overlay_h-20[vout]`;
                    inputs = ['final_v.mp4', 'final_a.m4a', 'watermark.png', 'group_watermark.png'];
                } else {
                    filter = `[0:v][2:v]overlay=main_w-overlay_w-20:main_h-overlay_h-20[vout]`;
                    inputs = ['final_v.mp4', 'final_a.m4a', 'watermark.png'];
                }

                try {
                    const ffmpegArgs = [
                        '-loglevel', 'error',
                        ...inputs.flatMap(f => ['-i', f]),
                        '-filter_complex', filter,
                        '-map', '[vout]', '-map', '1:a',
                        '-movflags', '+faststart',
                        '-c:v', 'libx264',
                        '-preset', options?.highQuality ? 'medium' : 'ultrafast',
                        '-crf', options?.highQuality ? '18' : '23',
                        '-c:a', 'aac', '-b:a', '128k',
                        '-max_muxing_queue_size', '1024',
                        '-threads', '1', '-y', 'output.mp4'
                    ];
                    await execWithRetry(ffmpegArgs, 1);
                } catch (overlayErr) {
                    await execWithRetry([
                        '-loglevel', 'error',
                        '-i', 'final_v.mp4', '-i', 'final_a.m4a',
                        '-movflags', '+faststart',
                        '-c:v', 'libx264',
                        '-preset', options?.highQuality ? 'medium' : 'ultrafast',
                        '-crf', options?.highQuality ? '18' : '23',
                        '-c:a', 'aac', '-b:a', '128k',
                        '-max_muxing_queue_size', '1024',
                        '-threads', '1', '-y', 'output.mp4'
                    ], 1);
                }
            } catch (e) {
                throw e;
            }

            stepRef.current += 1;

            let data;
            try {
                data = await ffmpeg.readFile('output.mp4');
            } catch (e) {
                try {
                    data = await ffmpeg.readFile('final_v.mp4');
                } catch (e2) {
                    throw new Error('Could not read output file');
                }
            }

            setProgress(100);
            setExportState('complete');

            if (!data || data.length === 0) {
                throw new Error('Generated video file is empty');
            }

            const blob = new Blob([data as any], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);

            // Cleanup
            for (const f of cleanupFiles) {
                try { await ffmpeg.deleteFile(f); } catch (e) { }
            }
            try { await ffmpeg.deleteFile('output.mp4'); } catch (e) { }

            if (progressWatchdogRef.current) {
                window.clearInterval(progressWatchdogRef.current);
                progressWatchdogRef.current = null;
            }
        } catch (error) {
            console.error('Stitching failed:', error);
            setExportState('error');
        }
    }, [loadFFmpeg, videoUrl, stories]);

    const value: VideoExportContextValue = {
        exportState,
        progress,
        videoUrl,
        currentStory,
        startExport,
        saveToDevice,
        shareVideo,
        reset,
        isExporting,
        isComplete
    };

    return (
        <VideoExportContext.Provider value={value}>
            {children}
        </VideoExportContext.Provider>
    );
}
