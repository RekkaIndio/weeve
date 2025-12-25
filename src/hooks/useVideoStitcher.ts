import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Story, Contribution, useStore } from '@/lib/store';
import { toast } from 'sonner';
import { createImageFromText, createWatermarkImage } from '@/lib/mediaUtils';

export type StitchingState = 'idle' | 'loading-ffmpeg' | 'downloading-assets' | 'stitching' | 'complete' | 'error';

export function useVideoStitcher() {
    const stories = useStore((state) => state.stories);
    const [state, setState] = useState<StitchingState>('idle');
    const [progress, setProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const messageRef = useRef<string | null>(null);

    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(1);

    const loadFFmpeg = async () => {
        // If instance exists and is already loaded, return it
        if (ffmpegRef.current && (ffmpegRef.current as any).isLoaded && (ffmpegRef.current as any).isLoaded()) {
            return ffmpegRef.current;
        }

        // Create a new instance if missing
        let ffmpeg = ffmpegRef.current || new FFmpeg();

        // Attach lightweight handlers — these will be duplicated if called multiple times but it's safe
        ffmpeg.on('log', ({ message }) => {
            // keep log for debugging, but silence in production later

        });

        // Attach a simple on('progress') handler so we show some feedback during load
        ffmpeg.on('progress', (ev: any) => {
            // Some versions use progress vs ratio
            const ratio = typeof ev.ratio === 'number' ? ev.ratio : (typeof ev.progress === 'number' ? ev.progress : 0);
            const p = typeof ratio === 'number' ? ratio : 0;
            let safeProgress = Number(p) || 0;
            if (safeProgress < 0) safeProgress = 0;
            if (safeProgress > 1) safeProgress = 1;
            // Tentative progress while loading
            setProgress(Math.round(safeProgress * 10));
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        try {
            setState('loading-ffmpeg');
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
    };

    // Use refs for tracking progress context to avoid closure stale state in event listeners
    const stepRef = useRef(0);
    const totalStepsRef = useRef(1);
    const lastProgressTimestampRef = useRef<number>(0);
    const lastProgressValueRef = useRef<number>(0);
    const progressWatchdogRef = useRef<number | null>(null);

    const stitchStory = useCallback(async (story: Story, options?: { highQuality?: boolean }) => {
        if (!story.contributions || story.contributions.length === 0) {
            toast.error('No clips to stitch');
            return;
        }

        try {
            // Reset any previous videoUrl (avoid accidentally reusing old downloads)
            if (videoUrl) {
                try { URL.revokeObjectURL(videoUrl); } catch (e) { }
                setVideoUrl(null);
            }

            setState('loading-ffmpeg');
            // Ensure we create/load a single FFmpeg instance with a progress handler attached
            await loadFFmpeg();
            let ffmpeg = ffmpegRef.current;
            if (!ffmpeg) {
                throw new Error('FFmpeg did not load as expected');
            }

            // Attach a progress handler once (won't attach duplicate as FFmpeg API handles uniqueness or the same instance check)
            // Use a stable ref for step counting to avoid closure issues
            ffmpeg.on('progress', (ev: any) => {
                const progressNumber = typeof ev.progress === 'number' ? ev.progress : (typeof ev.ratio === 'number' ? ev.ratio : 0);
                let p = progressNumber;
                if (p < 0) p = 0;
                if (p > 1) p = 1;

                const completedSteps = stepRef.current;
                const total = totalStepsRef.current;
                // Simple weighted average
                const global = ((completedSteps + p) / total) * 100;
                setProgress(Math.min(Math.round(global), 99)); // Cap at 99 until finished

                // Update watchdog progress refs
                lastProgressValueRef.current = global;
                lastProgressTimestampRef.current = Date.now();
            });

            ffmpeg.on('log', ({ message }) => {
                // Debug logs can be noisy; keep for now

            });

            // Start a watchdog to detect stalls in stitching
            if (progressWatchdogRef.current) {
                window.clearInterval(progressWatchdogRef.current);
            }
            progressWatchdogRef.current = window.setInterval(() => {
                const lastTS = lastProgressTimestampRef.current;
                const now = Date.now();
                const elapsed = lastTS ? (now - lastTS) : Number.POSITIVE_INFINITY;

                // If we're in the middle of processing (some steps remain) and no progress has been made in 60s, mark as error and attempt to recover
                if (stepRef.current < totalStepsRef.current && elapsed > 60000) {
                    console.error('FFmpeg seems stalled; last progress at', lastProgressValueRef.current, '%', 'elapsed ms=', elapsed);
                    toast.error('Stitching stalled. Attempting to abort and clean up.');
                    try {
                        if (ffmpegRef.current) {
                            ffmpegRef.current.terminate();
                            ffmpegRef.current = null;
                        }
                    } catch (terminateError) {
                        console.warn('Failed to terminate FFmpeg gracefully:', terminateError);
                    }
                    setState('error');
                    setProgress(0);
                    if (progressWatchdogRef.current) {
                        window.clearInterval(progressWatchdogRef.current);
                        progressWatchdogRef.current = null;
                    }
                }
            }, 5000);

            setState('downloading-assets');
            setProgress(0);
            
            // Sort contributions
            const sorted = [...story.contributions].sort((a, b) => a.timestamp - b.timestamp);
            const intermediateFiles: string[] = [];
            const cleanupFiles: string[] = [];

            // Reset progress tracking
            stepRef.current = 0;
            // Steps: 1 for each contribution + concat audio + concat video + final merge step
            totalStepsRef.current = sorted.length + 3;

            // PERFORMANCE: 720p (720x1280) strikes balance between quality and mobile WASM stability
            const INTERMEDIATE_WIDTH = 720;
            const INTERMEDIATE_HEIGHT = 1280;
            const INTERMEDIATE_VIDEO_FILTER = `scale=${INTERMEDIATE_WIDTH}:${INTERMEDIATE_HEIGHT}:force_original_aspect_ratio=decrease,pad=${INTERMEDIATE_WIDTH}:${INTERMEDIATE_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
            // Final target same as intermediate to allow copy-concat
            const FINAL_TARGET_WIDTH = 720;
            const FINAL_TARGET_HEIGHT = 1280;
            const FINAL_SCALE_FILTER = `scale=${FINAL_TARGET_WIDTH}:${FINAL_TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${FINAL_TARGET_WIDTH}:${FINAL_TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

            


            const intermediateVideoFiles: string[] = [];
            const intermediateAudioFiles: string[] = [];

            // Helper to execute ffmpeg commands with one retry on critical failures
            const execWithRetry = async (args: string[], retry = 1) => {
                let attempt = 0;
                while (true) {
                    try {
                        attempt += 1;
                        return await ffmpeg!.exec(args);
                    } catch (err: any) {
                        console.error('FFmpeg exec failed:', args, { attempt, err });

                        // If ffmpeg indicates it is not loaded or the WASM instance died, try to reload and retry
                        const msg = String(err?.message || err);
                        const isCritical = msg.includes('ffmpeg is not loaded') || msg.includes('WASM') || msg.includes('killed');
                        if (attempt <= retry && isCritical) {
                            console.warn('Attempting to reload FFmpeg and retry...');
                            try {
                                if (ffmpegRef.current) {
                                    ffmpegRef.current.terminate();
                                    ffmpegRef.current = null;
                                }
                            } catch (e) {
                                console.warn('Error terminating FFmpeg before retry:', e);
                            }
                            await loadFFmpeg();
                            ffmpeg = ffmpegRef.current!;
                            continue;
                        }

                        throw err;
                    }
                }
            };

            for (let i = 0; i < sorted.length; i++) {
                const c = sorted[i];

                const inputFilename = `raw_input_${i}`;
                const outputVideoName = `part_${i}_v.mp4`;
                const outputAudioName = `part_${i}_a.m4a`;
                
                let rawFile = '';
                let isVideoInput = false;

                try {
                    // 1. Prepare Input File
                    // Infer type robustly: fall back to URL extension if mediaType is missing
                    const url = c.mediaUrl || '';
                    const isUrlVideo = !!url.match(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i);
                    const isUrlImage = !!url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i);
                    const isText = c.mediaType === 'text' || (!c.mediaUrl && c.content);

                    if ((c.mediaType === 'video' || isUrlVideo) && c.mediaUrl) {
                        const blob = await fetchFile(c.mediaUrl);
                        rawFile = `${inputFilename}.mp4`;
                        await ffmpeg.writeFile(rawFile, blob);
                        isVideoInput = true;
                    }
                    else if ((c.mediaType === 'image' || c.mediaType === 'drawing' || isUrlImage) && c.mediaUrl) {
                        const blob = await fetchFile(c.mediaUrl);
                        // Preserve file extension where possible for better decoding
                        const ext = (url.split('.').pop() || 'jpg').split('?')[0];
                        rawFile = `${inputFilename}.${ext}`;
                        await ffmpeg.writeFile(rawFile, blob);
                    }
                    else if (isText) {
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
                        console.warn('Skipping contribution - unsupported type or missing URL/content:', { id: c.id, mediaType: c.mediaType, mediaUrl: c.mediaUrl });
                        stepRef.current += 1;
                        continue;
                    }

                    setState('stitching');

                    // 2a. Process VIDEO Track (Silent) -> part_i_v.mp4
                    // Normalize resolution, framerate, but STRIP audio (-an)
                    // Added -threads 1 to prevent WASM crashes
                    const videoFlags = [
                        '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0',
                        '-preset', 'ultrafast',
                        '-b:v', options?.highQuality ? '5M' : '1.5M',
                        '-r', '30',
                        '-g', '30',
                        '-an', // No Audio
                        '-threads', '1', 
                        outputVideoName
                    ];

                    if (isVideoInput) {
                        // For videos, preserve full duration but use INTERMEDIATE filter to reduce memory

                        await execWithRetry(['-i', rawFile, '-vf', INTERMEDIATE_VIDEO_FILTER, '-pix_fmt', 'yuv420p', ...videoFlags], 1);
                    } else {
                        // For images/text, use 4 seconds to match FeedItem timing
                        const ext = c.mediaType === 'text' ? 'png' : 'jpg';

                        await execWithRetry(['-loop', '1', '-i', rawFile, '-vf', INTERMEDIATE_VIDEO_FILTER, '-t', '4', '-pix_fmt', 'yuv420p', ...videoFlags], 1);
                    }

                    // Validate intermediate file exists
                    try {
                        const files = await ffmpeg.listDir('/');
                        const exists = files.some((f: any) => f.name === outputVideoName);

                        if (!exists) {
                            console.warn(`Processing succeeded but output ${outputVideoName} not found; listing FS:`, files);
                        }
                    } catch (err) {
                        console.warn('Could not list FS after processing; continuing', err);
                    }

                    intermediateVideoFiles.push(outputVideoName);
                    cleanupFiles.push(outputVideoName);

                    // 2b. Process AUDIO Track -> part_i_a.m4a
                    // Normalize to AAC 44100Hz Stereo
                    const audioFlags = ['-vn', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', outputAudioName];
                    
                    if (isVideoInput) {
                        try {
                            // Try extracting audio with better error handling (preserve full duration)
                            await execWithRetry(['-i', rawFile, '-vn', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', '-y', outputAudioName], 1);
                        } catch (e) {
                            console.warn(`Failed to extract audio from video ${i}, generating silence. Error:`, e);
                            // Fallback to silence - use 4 seconds for images/text
                            await execWithRetry(['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', '-y', outputAudioName], 1);
                        }
                    } else {
                        // Generate silence for Images/Text (4s to match video duration)
                        await execWithRetry(['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-threads', '1', '-y', outputAudioName], 1);
                    }
                    intermediateAudioFiles.push(outputAudioName);
                    cleanupFiles.push(outputAudioName);

                    // Clean raw input
                    try { await ffmpeg.deleteFile(rawFile); } catch (e) {}
                    
                    stepRef.current += 1;

                } catch (e) {
                    console.error(`Failed to process contribution ${c.id}:`, e);
                    stepRef.current += 1; 
                }
            }

            if (intermediateVideoFiles.length === 0) {
                console.error('No valid intermediate video parts were produced. Contribution list:', sorted.map((c) => ({ id: c.id, mediaType: c.mediaType, mediaUrl: c.mediaUrl })));
                // Try fallback to create a short video from the story cover image
                if (story.coverImage) {
                    try {
                        const blob = await fetchFile(story.coverImage);
                        await ffmpeg.writeFile('fallback_cover.jpg', blob);
                        await ffmpeg!.exec(['-loop', '1', '-i', 'fallback_cover.jpg', '-vf', INTERMEDIATE_VIDEO_FILTER, '-t', '4', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', 'part_0_v.mp4']);
                        const audioFallbackFlags = ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '4', '-c:a', 'aac', 'fallback_a.m4a'];
                        await ffmpeg!.exec([...audioFallbackFlags]);
                        intermediateVideoFiles.push('part_0_v.mp4');
                        intermediateAudioFiles.push('fallback_a.m4a');
                        cleanupFiles.push('part_0_v.mp4', 'fallback_a.m4a', 'fallback_cover.jpg');

                    } catch (e) {
                        console.error('Failed to generate fallback video from coverImage:', e);
                        toast.error('No valid clips generated');
                        setState('idle');
                        return;
                    }
                } else {
                    toast.error('No valid clips generated');
                    setState('idle');
                    return;
                }
            }

            // 3. Concat AUDIO (First)
            // We do audio first so it's ready for the merge

            const concatListA = intermediateAudioFiles.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile('concat_a.txt', concatListA);
            cleanupFiles.push('concat_a.txt');
            try {
               // Added -threads 1
               await execWithRetry(['-f', 'concat', '-safe', '0', '-i', 'concat_a.txt', '-c', 'copy', '-threads', '1', 'final_a.m4a'], 1);
            } catch (e) { console.error('Audio concat failed and could not be recovered:', e); throw e; }
            cleanupFiles.push('final_a.m4a');

            stepRef.current += 1;

            // 4. Concat VIDEO
            // Generate watermark with creator's username
            try {
                const creator = story.participants.find(p => p.id === story.creatorId);
                const creatorName = creator ? (creator.name || creator.inviteCode || 'Weeve') : 'Weeve';

                
                // fallback to simpler name if too long?
                // For now, trust the helper
                
                // If this is a forked story, try to find the original creator
                let originalCreatorName: string | undefined;
                if (story.forkedFromStoryId) {
                    const originalStory = stories.find(s => s.id === story.forkedFromStoryId);
                    if (originalStory) {
                        // Ideally we'd look up the participant, but we might only have the story metadata
                        // Depending on how stories are loaded, we might need to rely on what's available.
                        // For now let's try to find the creator in the participants list of the original story
                        const originalCreator = originalStory.participants?.find(p => p.id === originalStory.creatorId);
                        
                        // If we can't find the participant object (maybe minimal data loaded), we might need to fetch it or skip
                        // But usually feed stories have participants loaded.
                        if (originalCreator) {
                             originalCreatorName = originalCreator.name || originalCreator.inviteCode;
                        } else {
                            // Fallback: if we can't find the user object, we can't get the name easily without looking up profiles.
                            // However, in many cases feed items have sufficient data. 
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
                console.warn('Unable to create or write watermark.png:', e);
                // Fallback: try to just use logo if watermark generation failed
                 try {
                    const logoBlob = await fetchFile('/weeve-logo.png');
                    await ffmpeg.writeFile('watermark.png', logoBlob);
                    cleanupFiles.push('watermark.png');
                } catch (e2) {
                     console.warn('Fallback logo also failed:', e2);
                }
            }

            const concatListV = intermediateVideoFiles.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile('concat_v.txt', concatListV);
            cleanupFiles.push('concat_v.txt');
            try {
                // Concat video files using COPY (fastest) since all parts are already normalized to 540x960 baseline profile
                await execWithRetry(['-f', 'concat', '-safe', '0', '-i', 'concat_v.txt', '-c', 'copy', '-threads', '1', 'final_v.mp4'], 1);
            } catch (e) { console.error('Video concat failed and could not be recovered:', e); throw e; }
            cleanupFiles.push('final_v.mp4');
            stepRef.current += 1;
            
            try {
                // Re-encoding audio here (-c:a aac) and overlaying logo if available
                // Create 720p final output with watermark and mapped audio
                // Overlay Logic:
                // Use 'watermark.png' which is already sized by canvas
                // Overlay bottom-right with 20px padding (main_w-overlay_w-20:main_h-overlay_h-20)
                // We typically don't need to scale the canvas generated image, but let's ensure it's not huge.
                // It shouldn't be given the font size of 24px (~40px height).
                const filter = `[0:v][2:v]overlay=main_w-overlay_w-20:main_h-overlay_h-20[vout]`;
                try {
                    await execWithRetry([
                        '-loglevel', 'error',
                        '-i', 'final_v.mp4',
                        '-i', 'final_a.m4a',
                        '-i', 'watermark.png',
                        '-filter_complex', filter,
                        '-map', '[vout]',
                        '-map', '1:a',
                        '-movflags', '+faststart',
                        '-c:v', 'libx264',
                        '-preset', options?.highQuality ? 'medium' : 'ultrafast',
                        '-crf', options?.highQuality ? '18' : '23',
                        '-c:a', 'aac',
                        '-b:a', '128k',
                        '-max_muxing_queue_size', '1024',
                        '-threads', '1',
                        '-y',
                        'output.mp4'
                    ], 1);
                } catch (overlayErr) {
                    console.warn('Overlay merge failed, attempting merge without watermark:', overlayErr);
                    try {
                        await execWithRetry([
                            '-loglevel', 'error', 
                            '-i', 'final_v.mp4',
                            '-i', 'final_a.m4a',
                            '-movflags', '+faststart',
                            '-c:v', 'libx264',
                            '-preset', options?.highQuality ? 'medium' : 'ultrafast',
                            '-crf', options?.highQuality ? '18' : '23',
                            '-c:a', 'aac', 
                            '-b:a', '128k',
                            '-max_muxing_queue_size', '1024',
                            '-threads', '1',
                            '-y',
                            'output.mp4'
                        ], 1);
                    } catch (fallbackErr) {
                        console.error('Both overlay and fallback merge failed:', fallbackErr);
                        throw fallbackErr;
                    }
                }
            } catch (e) {
                console.error('Merge step failed and could not be recovered:', e);
                // Bubble up - outer catch will set state('error') and cleanup
                throw e;
            }

            // Final merge step is complete
            stepRef.current += 1;
            


            try {
                const files = await ffmpeg.listDir('/');

            } catch (e) {
                console.error('Failed to list FS after concat:', e);
            }
            
            // DEBUG: Check if file system is alive
            try {
                // listDir returns generic object depending on implementation, usually an array of items
                const files = await ffmpeg.listDir('/');

                
                // Check if output.mp4 is in the list
                // @ts-ignore
                const exists = files.some(f => f.name === 'output.mp4');
                if (!exists) console.error('CRITICAL: output.mp4 MISSING from FS');

            } catch (e) {
                console.error('FS Check Failed - WASM Instance likely crashed/dead:', e);
            }

            let data;
            try {
                 data = await ffmpeg.readFile('output.mp4');

            } catch (e) {
                console.error('ReadFile FAILED:', e);
                // Try reading the video-only file as fallback
                console.warn('Attempting fallback: read final_v.mp4 if available');
                try {
                    const fallback = await ffmpeg.readFile('final_v.mp4');
                    if (fallback && (fallback as any).length) {

                        data = fallback;
                        toast.warning('Output video was read without audio (fallback).');
                    } else {
                        throw e;
                    }
                } catch (e2) {
                    console.error('Final fallback failed:', e2);
                    throw new Error('Could not read output file (Crash killed FS)');
                }
            }

            // Finished
            setProgress(100);
            setState('complete'); // or 'ready'
            
            // Validate output
            if (!data || data.length === 0) {
                throw new Error('Generated video file is empty');
            }

            const sizeMb = (data.length / (1024 * 1024)).toFixed(2);
            
            // Create download link
            const blob = new Blob([data as any], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            

            setVideoUrl(url);


            // Show success message with clear instructions
            toast.success(`Video ready (${sizeMb} MB)! Tap the PINK SAVE button below.`, {
                duration: 6000,
            });
            
            // Cleanup in background
            for (const f of cleanupFiles) {
                try { await ffmpeg.deleteFile(f); } catch (e) {}
            }
            try { await ffmpeg.deleteFile('output.mp4'); } catch (e) {}

            // Ensure watchdog cleanup
            if (progressWatchdogRef.current) {
                window.clearInterval(progressWatchdogRef.current);
                progressWatchdogRef.current = null;
            }
            
        } catch (error) {
            console.error('Stitching failed:', error);
            const msg = error instanceof Error ? error.message : String(error);
            toast.error(`Stitch failed: ${msg}`);
            setState('error');
        }
    }, [state]);

    const reset = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        
        // Terminate ffmpeg to stop logs/processing
        try {
            if (ffmpegRef.current) {
                ffmpegRef.current.terminate();
                ffmpegRef.current = null;
            }
        } catch (e) {
            console.error('Failed to terminate FFmpeg:', e);
        }
        
        setState('idle');
        setProgress(0);
    }, [videoUrl]);

    return {
        stitchStory,
        stitchingState: state,
        progress,
        videoUrl,
        reset
    };
}
