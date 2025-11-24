import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Capture a photo using the device camera or select from gallery
 * Uses Capacitor Camera plugin for native camera access
 */
export async function capturePhoto(): Promise<File | null> {
    console.log('[Camera] capturePhoto called, isNative:', Capacitor.isNativePlatform());

    try {
        console.log('[Camera] Requesting photo via Capacitor Camera plugin (Base64 mode)');
        // Use Base64 for maximum compatibility. DataUrl can be too large for some bridges, and Uri fails on Android.
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Photos, // Force Gallery only for stability
        });

        console.log('[Camera] Photo captured');

        if (!image.base64String) {
            console.error('[Camera] No Base64 data returned from camera');
            return null;
        }

        // Convert Base64 to Blob manually to avoid fetch/URL issues
        let blob: Blob | null = null;
        try {
            const byteCharacters = atob(image.base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: `image/${image.format || 'jpeg'}` });
            console.log('[Camera] Blob constructed from base64:', blob.type, blob.size);
        } catch (conversionError) {
            console.error('[Camera] Failed to convert base64 string to blob:', conversionError);
            return null;
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

        // Fallback for environments where File constructor is not available
        const fallbackFile = Object.assign(blob, {
            name: fileName,
            lastModified: Date.now(),
            type: blob.type || `image/${image.format}`,
        }) as File;

        if (typeof (fallbackFile as any).size !== 'number') {
            Object.defineProperty(fallbackFile, 'size', {
                get() {
                    return blob.size;
                },
                configurable: true,
            });
        }

        console.log('[Camera] Photo file created (fallback):', fallbackFile.name, fallbackFile.type, fallbackFile.size);
        return fallbackFile;
    } catch (error: any) {
        console.error('[Camera] Photo capture error:', error);
        return null;
    }
}

/**
 * Capture a video using the device camera or select from gallery
 * Uses file input since Capacitor Camera plugin doesn't support video
 */
export async function captureVideo(): Promise<File | null> {
    console.log('[Camera] captureVideo called - using file input');

    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        // input.capture = 'environment';  // Removed to force Gallery selection

        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            console.log('[Camera] Video file selected:', file?.name, file?.type, file?.size);
            if (file && file.size > 100 * 1024 * 1024) { // 100MB limit
                console.error('[Camera] Video file too large:', file.size);
                alert('Video file is too large. Please select a video under 100MB.');
                resolve(null);
                return;
            }
            // Clean up
            document.body.removeChild(input);
            resolve(file || null);
        };

        input.oncancel = () => {
            console.log('[Camera] Video input cancelled');
            document.body.removeChild(input);
            resolve(null);
        };

        // Attach to DOM to ensure events fire
        input.style.display = 'none';
        document.body.appendChild(input);

        // Ensure it's called from a user gesture
        input.click();
    });
}
