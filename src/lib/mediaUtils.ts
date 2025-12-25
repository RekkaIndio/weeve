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
 * If originalCreator is provided (for weeved/forked stories), adds a second line with fork attribution.
 * Returns a Blob of the PNG image.
 */
export async function createWatermarkImage(
    username: string,
    originalCreator?: string,
    brandAvatarUrl?: string
): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // 1. Load Weeve Logo
    const logoImg = new Image();
    await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.crossOrigin = 'anonymous'; 
        logoImg.src = '/weeve-logo.png';
    });

    // 2. Load Brand Avatar if provided
    let brandImg: HTMLImageElement | null = null;
    if (brandAvatarUrl) {
        brandImg = new Image();
        try {
            await new Promise((resolve, reject) => {
                brandImg!.onload = resolve;
                brandImg!.onerror = reject;
                brandImg!.crossOrigin = 'anonymous';
                brandImg!.src = brandAvatarUrl;
            });
        } catch (e) {
            console.warn('Failed to load brand avatar for watermark:', e);
            brandImg = null;
        }
    }

    // 3. Measure Text
    const fontSize = 42; 
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    const text = `@${username}`;
    const textMetrics = ctx.measureText(text);
    
    // 4. Layout Dimensions
    const padding = 24; 
    const logoHeight = 64; 
    const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
    
    // Brand Avatar dimensions
    const brandSize = brandImg ? 80 : 0; // Slightly larger than logo
    const brandPadding = brandImg ? 24 : 0;

    const forkSymbol = '⑂'; 
    const forkFontSize = 32; 
    let forkText = '';
    let forkTextWidth = 0;
    
    if (originalCreator) {
        ctx.font = `bold ${forkFontSize}px Inter, sans-serif`;
        forkText = `${forkSymbol} from @${originalCreator}`;
        forkTextWidth = ctx.measureText(forkText).width;
    }
    
    const lineHeight = fontSize * 1.5;
    const forkLineHeight = originalCreator ? forkFontSize * 1.5 : 0;
    // Total height considers brand avatar or text lines
    const totalHeight = Math.max(logoHeight, brandSize, lineHeight + forkLineHeight);
    
    // Total width: [BrandAvatar] + padding + [Text] + padding + [Logo]
    // Or if fork text is wider than main text
    const textBlockWidth = Math.max(textMetrics.width, forkTextWidth);
    const totalWidth = brandSize + brandPadding + textBlockWidth + padding + logoWidth;

    canvas.width = totalWidth + 24; 
    canvas.height = totalHeight + 12;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 5. Draw
    // Shadow settings
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    let currentX = 12;

    // Draw Brand Avatar (Circular)
    if (brandImg) {
        const brandY = (canvas.height - brandSize) / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(currentX + brandSize/2, brandY + brandSize/2, brandSize/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(brandImg, currentX, brandY, brandSize, brandSize);
        ctx.restore();

        // Draw border/stroke for brand avatar
        ctx.beginPath();
        ctx.arc(currentX + brandSize/2, brandY + brandSize/2, brandSize/2, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        currentX += brandSize + brandPadding;
    }

    // Draw Text
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    
    const mainLineY = originalCreator 
        ? (canvas.height - forkLineHeight) / 2 
        : canvas.height / 2;

    ctx.fillText(text, currentX, mainLineY);
    
    if (originalCreator && forkText) {
        ctx.font = `bold ${forkFontSize}px Inter, sans-serif`;
        ctx.fillStyle = '#EC1D99';
        const forkLineY = mainLineY + lineHeight * 0.6;
        ctx.fillText(forkText, currentX, forkLineY);
    }

    // Draw Weeve Logo
    currentX += textBlockWidth + padding;
    const logoY = (canvas.height - logoHeight) / 2;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logoImg, currentX, logoY, logoWidth, logoHeight);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed for watermark'));
        }, 'image/png');
    });
}
