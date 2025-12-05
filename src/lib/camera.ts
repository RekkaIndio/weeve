import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

type CaptureInputElement = HTMLInputElement & { capture?: string };

async function ensureNativePermissions() {
    try {
        const status = await Camera.checkPermissions();
        if (status.camera === 'granted' && status.photos === 'granted') {
            return;
        }

        const requested = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        if (requested.camera !== 'granted') {
            throw new Error('Camera permission not granted');
        }
    } catch (permissionError) {
        console.error('[Camera] Permission request failed:', permissionError);
        throw permissionError;
    }
}

function capturePhotoViaFileInput({ useCamera }: { useCamera: boolean }): Promise<File | null> {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') {
            resolve(null);
            return;
        }

        const input = document.createElement('input') as CaptureInputElement;
        input.type = 'file';
        input.accept = 'image/*';
        if (useCamera) {
            input.capture = 'environment';
        }

        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0] ?? null;
            console.log('[Camera] File input returned photo:', file?.name, file?.size);
            if (file && file.size > 25 * 1024 * 1024) {
                console.error('[Camera] Photo file too large:', file.size);
                alert('Photo is too large. Please use an image under 25MB.');
                resolve(null);
            } else {
                resolve(file);
            }
            document.body.removeChild(input);
        };

        input.oncancel = () => {
            console.log('[Camera] File input cancelled');
            document.body.removeChild(input);
            resolve(null);
        };

        input.style.display = 'none';
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * Capture a photo using the device camera or select from gallery
 * Uses Capacitor Camera plugin for native camera access
 */
export type PhotoCaptureMode = 'auto' | 'camera' | 'gallery';

export async function capturePhoto(mode: PhotoCaptureMode = 'auto'): Promise<File | null> {
    const isNative = Capacitor.isNativePlatform();
    console.log('[Camera] capturePhoto called', { mode, isNative });

    const fallbackToInput = (useCamera: boolean) => capturePhotoViaFileInput({ useCamera });

    if (mode === 'gallery') {
        if (!isNative) {
            return fallbackToInput(false);
        }
        return capturePhotoWithPlugin(CameraSource.Photos, false);
    }

    if (mode === 'camera') {
        if (!isNative) {
            return fallbackToInput(true);
        }
        try {
            await ensureNativePermissions();
        } catch (permissionError) {
            console.error('[Camera] Unable to obtain permissions for photo capture:', permissionError);
            return null;
        }
        return capturePhotoWithPlugin(CameraSource.Camera, true);
    }

    // mode === 'auto'
    if (!isNative) {
        return fallbackToInput(false);
    }

    try {
        await ensureNativePermissions();
    } catch (permissionError) {
        console.error('[Camera] Unable to obtain permissions for photo capture:', permissionError);
        return null;
    }

    return capturePhotoWithPlugin(CameraSource.Prompt, true);
}

async function capturePhotoWithPlugin(source: CameraSource, useCameraFallback: boolean): Promise<File | null> {
    const isNative = Capacitor.isNativePlatform();
    try {
        console.log('[Camera] Requesting photo via Capacitor Camera plugin (Base64 mode)', { source });
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source,
            correctOrientation: true,
            saveToGallery: false,
            promptLabelHeader: 'Capture Photo',
            promptLabelPhoto: 'Choose from Gallery',
            promptLabelPicture: 'Take Photo',
            webUseInput: !isNative,
        });

        console.log('[Camera] Photo captured');

        if (!image.base64String) {
            console.error('[Camera] No Base64 data returned from camera');
            return capturePhotoViaFileInput({ useCamera: useCameraFallback });
        }

        const blob = base64ToBlob(image.base64String, image.format);
        if (!blob) {
            return capturePhotoViaFileInput({ useCamera: useCameraFallback });
        }

        const extension = image.format || blob.type.split('/').pop() || 'jpg';
        const fileName = `photo_${Date.now()}.${extension}`;

        if (typeof File !== 'undefined') {
            const file = new File([blob], fileName, {
                type: blob.type || `image/${image.format}`,
                lastModified: Date.now(),
            });
            console.log('[Camera] Photo file created:', file.name, file.type, file.size);
            return file;
        }

        const fallbackFile = Object.assign(blob, {
            name: fileName,
            lastModified: Date.now(),
            type: blob.type || `image/${image.format}`,
        }) as File;

        if (typeof (fallbackFile as { size?: number }).size !== 'number') {
            Object.defineProperty(fallbackFile, 'size', {
                get() {
                    return blob.size;
                },
                configurable: true,
            });
        }

        console.log('[Camera] Photo file created (fallback):', fallbackFile.name, fallbackFile.type, fallbackFile.size);
        return fallbackFile;
    } catch (error) {
        console.error('[Camera] Photo capture error:', error);
        return capturePhotoViaFileInput({ useCamera: useCameraFallback });
    }
}

function base64ToBlob(base64String: string, format?: string | null): Blob | null {
    try {
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: `image/${format || 'jpeg'}` });
    } catch (error) {
        console.error('[Camera] Failed to convert base64 string to blob:', error);
        return null;
    }
}

export type VideoCaptureMode = 'auto' | 'camera' | 'gallery';

/**
 * Capture a video using either the device camera or gallery.
 * The default behaviour (`auto`) ensures web falls back to gallery while
 * native platforms can choose based on user preference.
 */
export async function captureVideo(mode: VideoCaptureMode = 'auto'): Promise<File | null> {
    const isNative = Capacitor.isNativePlatform();
    console.log('[Camera] captureVideo called', { mode, isNative });

    if (mode === 'gallery') {
        return captureVideoFromGallery();
    }

    if (mode === 'camera') {
        if (isNative) {
            try {
                await ensureNativePermissions();
            } catch (permissionError) {
                console.error('[Camera] Unable to obtain permissions for video capture:', permissionError);
                return null;
            }
        }
        return captureVideoFromCamera();
    }

    // mode === 'auto'
    if (!isNative) {
        return captureVideoFromGallery();
    }

    let useCamera = false;
    try {
        useCamera = window.confirm('Would you like to take a new video? Press Cancel to choose from gallery.');
    } catch (confirmError) {
        console.warn('[Camera] Video choice prompt failed, defaulting to gallery:', confirmError);
    }

    if (useCamera) {
        try {
            await ensureNativePermissions();
        } catch (permissionError) {
            console.error('[Camera] Unable to obtain permissions for video capture:', permissionError);
            return null;
        }
        return captureVideoFromCamera();
    }

    return captureVideoFromGallery();
}

function captureVideoFromCamera(): Promise<File | null> {
    console.log('[Camera] captureVideoFromCamera called - using file input capture');
    return captureVideoViaFileInput({ useCamera: true });
}

function captureVideoFromGallery(): Promise<File | null> {
    console.log('[Camera] captureVideoFromGallery called');
    return captureVideoViaFileInput({ useCamera: false });
}

function captureVideoViaFileInput({ useCamera }: { useCamera: boolean }): Promise<File | null> {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') {
            resolve(null);
            return;
        }

        const input = document.createElement('input') as CaptureInputElement;
        input.type = 'file';
        input.accept = 'video/*';
        input.multiple = false;

        if (useCamera) {
            input.capture = 'environment';
        }

        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0] ?? null;
            console.log('[Camera] Video input returned:', file?.name, file?.type, file?.size);
            if (file && file.size > 100 * 1024 * 1024) {
                console.error('[Camera] Video file too large:', file.size);
                alert('Video file is too large. Please use a video under 100MB.');
                cleanup();
                resolve(null);
                return;
            }
            cleanup();
            resolve(file);
        };

        input.oncancel = () => {
            console.log('[Camera] Video input cancelled');
            cleanup();
            resolve(null);
        };

        function cleanup() {
            if (input.parentNode) {
                input.parentNode.removeChild(input);
            }
        }

        input.style.display = 'none';
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * Upload media (image/video) to Supabase storage
 * @param file - The file to upload
 * @param type - The media type ('image' or 'video')
 * @returns Promise with the public URL of the uploaded file
 */
export async function uploadMedia(
    file: File,
    type: 'image' | 'video'
): Promise<{ url: string; error?: Error }> {
    try {
        // Dynamic import to avoid issues in environments without supabase
        const { supabase } = await import('./supabase');
        
        // Validate file
        if (!file) {
            throw new Error('No file provided');
        }

        const maxSize = type === 'image' ? 25 * 1024 * 1024 : 100 * 1024 * 1024; // 25MB for images, 100MB for videos
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop() || (type === 'image' ? 'jpg' : 'mp4');
        const filename = `${timestamp}-${randomString}.${extension}`;
        
        // Determine bucket based on type
        const bucket = type === 'image' ? 'avatars' : 'videos';
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('[Upload] Supabase storage error:', error);
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filename);

        return { url: urlData.publicUrl };
    } catch (error) {
        console.error('[Upload] Error uploading media:', error);
        return { 
            url: '', 
            error: error instanceof Error ? error : new Error('Upload failed') 
        };
    }
}
