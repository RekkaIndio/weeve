import { TextStyle } from "@/lib/store";

export async function urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.blob();
}

/**
 * Renders text content to a Blob (image/png) using HTML Canvas.
 * Mimics the style of the Weeve app (vertical format).
 */
export async function createImageFromText(content: string, style: TextStyle): Promise<Blob> {
    const canvas = document.createElement('canvas');
    // Standard resolution for Weeve stories (vertical HD)
    const width = 720;
    const height = 1280;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // 1. Background
    // If style has a background color, use it. Otherwise default to a gradient or dark color.
    // For text contributions, we usually want a nice background.
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, width, height);
    } else {
        // Default gradient background if transparent
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Text Configuration
    const fontSize = style.fontSize ? style.fontSize * 2 : 56; // Scale up for high-res
    const fontFamily = style.fontFamily?.replace(/['"]/g, '') || 'Inter, sans-serif';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = style.textColor || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3. Wrap Text
    const maxWidth = width * 0.8;
    const words = content.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    // 4. Render Text
    const lineHeight = fontSize * 1.5;
    const totalTextHeight = lines.length * lineHeight;
    let startY = (height - totalTextHeight) / 2 + (lineHeight / 2);

    // Apply alignment (simulated for center since we fixed x=width/2)
    const x = width / 2;
    
    lines.forEach(line => {
        ctx.fillText(line, x, startY);
        startY += lineHeight;
    });

    // 5. Add Watermark (Optional)
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Weeve', width / 2, height - 40);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
        }, 'image/png');
    });
}

/**
 * Creates a watermark image containing the text "@[username]" followed by the Weeve logo.
 * Returns a Blob of the PNG image.
 */
export async function createWatermarkImage(username: string): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // 1. Load Logo
    const logoImg = new Image();
    // Wrap image loading in a promise
    await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.crossOrigin = 'anonymous'; // Important for canvas export
        logoImg.src = '/weeve-logo.png';
    });

    // 2. Measure Text
    // Increase resolution for sharpness (will appear smaller if video is large, but 720p width is standard)
    // 40px font size is sharper than 24px
    const fontSize = 42; 
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    const text = `@${username}`;
    const textMetrics = ctx.measureText(text);
    
    // 3. Layout Dimensions
    const padding = 24; // Padding between text and logo
    const logoHeight = 64; // Target logo height (increased for sharpness/size)
    const logoWidth = (logoImg.width / logoImg.height) * logoHeight; // Maintain aspect ratio
    
    // Ensure height accommodates both text and logo comfortably
    const totalHeight = Math.max(logoHeight, fontSize * 1.5); 
    const totalWidth = textMetrics.width + padding + logoWidth;

    // Set canvas size (with some buffer for shadows)
    canvas.width = totalWidth + 24; 
    canvas.height = totalHeight + 12;

    // Clear context after resize
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 4. Draw Text
    // Re-set font after resize as it might reset context state
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    
    // Add shadow/outline for readability on any background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    const textX = 12; // Left margin
    const centerY = canvas.height / 2;

    ctx.fillText(text, textX, centerY);

    // 5. Draw Logo
    const logoX = textX + textMetrics.width + padding;
    const logoY = centerY - (logoHeight / 2);
    
    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed for watermark'));
        }, 'image/png');
    });
}
