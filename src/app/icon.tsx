import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

// Route segment config
export const runtime = 'nodejs';

// Image metadata
export const size = {
    width: 32,
    height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
    // Read the image file
    const logoPath = join(process.cwd(), 'public/weeve-logo.png');
    const logoData = readFileSync(logoPath);
    const base64Logo = `data:image/png;base64,${logoData.toString('base64')}`;

    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: 'transparent', // Ensure background is transparent
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden', // Crop content outside the container
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={base64Logo}
                    alt="Weeve Logo"
                    style={{
                        width: '250%', // Zoom in
                        height: '250%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
