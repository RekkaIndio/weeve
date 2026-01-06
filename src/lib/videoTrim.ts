import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Load or return the cached FFmpeg instance
 */
async function getFFmpeg(): Promise<FFmpeg> {
    if (ffmpegInstance) {
        return ffmpegInstance;
    }

    if (loadPromise) {
        return loadPromise;
    }

    isLoading = true;
    loadPromise = (async () => {
        const ffmpeg = new FFmpeg();
        
        ffmpeg.on('log', ({ message }) => {
            // Suppress verbose logs in production
            if (process.env.NODE_ENV === 'development') {
                console.log('[FFmpeg]', message);
            }
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        ffmpegInstance = ffmpeg;
        isLoading = false;
        return ffmpeg;
    })();

    return loadPromise;
}

export interface TrimVideoOptions {
    file: File;
    startTime: number; // seconds
    endTime: number;   // seconds
    onProgress?: (progress: number) => void;
}

/**
 * Trim a video file to the specified start and end times
 * Uses FFmpeg WASM to process the video client-side
 */
export async function trimVideo(options: TrimVideoOptions): Promise<File> {
    const { file, startTime, endTime, onProgress } = options;

    // If no trimming needed (full video), return original
    if (startTime <= 0 && endTime <= 0) {
        return file;
    }

    const duration = endTime - startTime;
    if (duration <= 0) {
        console.warn('[trimVideo] Invalid trim range, returning original file');
        return file;
    }

    console.log(`[trimVideo] Trimming video from ${startTime}s to ${endTime}s (duration: ${duration}s)`);

    try {
        const ffmpeg = await getFFmpeg();

        // Set up progress handler
        if (onProgress) {
            ffmpeg.on('progress', (ev: { progress?: number; ratio?: number }) => {
                const p = ev.progress ?? ev.ratio ?? 0;
                onProgress(Math.min(Math.max(p * 100, 0), 99));
            });
        }

        // Write input file to FFmpeg filesystem
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';
        
        const fileData = await fetchFile(file);
        await ffmpeg.writeFile(inputName, fileData);

        // Execute FFmpeg trim command
        // -ss: seek to start time (before -i for faster seeking)
        // -t: duration to extract
        // -c copy: use stream copy for speed (no re-encoding)
        // If copy fails, fall back to re-encoding
        try {
            await ffmpeg.exec([
                '-ss', startTime.toString(),
                '-i', inputName,
                '-t', duration.toString(),
                '-c', 'copy',
                '-avoid_negative_ts', 'make_zero',
                '-y',
                outputName
            ]);
        } catch (copyError) {
            console.warn('[trimVideo] Copy mode failed, falling back to re-encode:', copyError);
            // Fall back to re-encoding
            await ffmpeg.exec([
                '-ss', startTime.toString(),
                '-i', inputName,
                '-t', duration.toString(),
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'aac',
                '-avoid_negative_ts', 'make_zero',
                '-y',
                outputName
            ]);
        }

        // Read the output file
        const data = await ffmpeg.readFile(outputName);
        
        // Cleanup
        try {
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
        } catch (e) {
            console.warn('[trimVideo] Cleanup failed:', e);
        }

        // Create a new File from the trimmed data
        // Handle both Uint8Array and string types returned by FFmpeg
        let blobData: BlobPart;
        if (data instanceof Uint8Array) {
            // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
            const buffer = new ArrayBuffer(data.byteLength);
            new Uint8Array(buffer).set(data);
            blobData = buffer;
        } else {
            blobData = new TextEncoder().encode(data as string);
        }
        const trimmedBlob = new Blob([blobData], { type: 'video/mp4' });
        const trimmedFile = new File(
            [trimmedBlob], 
            `trimmed_${file.name}`, 
            { type: 'video/mp4', lastModified: Date.now() }
        );

        if (onProgress) {
            onProgress(100);
        }

        console.log(`[trimVideo] Successfully trimmed video: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(trimmedFile.size / 1024 / 1024).toFixed(2)}MB`);
        
        return trimmedFile;
    } catch (error) {
        console.error('[trimVideo] Failed to trim video:', error);
        throw error;
    }
}

/**
 * Check if video needs trimming based on mediaDraft values
 */
export function needsTrimming(trimStart?: number, trimEnd?: number, videoDuration?: number): boolean {
    if (trimStart === undefined || trimEnd === undefined) {
        return false;
    }
    
    // If both are 0, no trimming set yet
    if (trimStart === 0 && trimEnd === 0) {
        return false;
    }

    // If trimming from start or before end of video
    if (trimStart > 0.1) {
        return true;
    }

    // If we have video duration and trim end is before the end
    if (videoDuration && trimEnd < videoDuration - 0.1) {
        return true;
    }

    return false;
}
