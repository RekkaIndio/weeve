export const PHOTO_FILTERS = [
    // Basic
    { id: 'normal', label: 'Normal', filter: 'none' },

    // Classic
    { id: 'vintage', label: 'Vintage', filter: 'sepia(0.4) contrast(1.1) brightness(0.9)' },
    { id: 'retro', label: 'Retro', filter: 'sepia(0.25) contrast(1.15) saturate(1.2) brightness(0.95)' },
    { id: 'film', label: 'Film', filter: 'contrast(1.1) saturate(0.9) brightness(1.05) sepia(0.1)' },
    { id: 'polaroid', label: 'Polaroid', filter: 'contrast(0.9) brightness(1.1) saturate(0.85) sepia(0.15)' },

    // Black & White
    { id: 'bw', label: 'B&W', filter: 'grayscale(1) contrast(1.1)' },
    { id: 'noir', label: 'Noir', filter: 'grayscale(1) contrast(1.4) brightness(0.9)' },
    { id: 'silver', label: 'Silver', filter: 'grayscale(0.8) contrast(1.05) brightness(1.1)' },

    // Warm Tones
    { id: 'warm', label: 'Warm', filter: 'sepia(0.2) saturate(1.3) brightness(1.05)' },
    { id: 'golden', label: 'Golden', filter: 'sepia(0.3) saturate(1.2) brightness(1.05) hue-rotate(-10deg)' },
    { id: 'sunset', label: 'Sunset', filter: 'sepia(0.35) saturate(1.4) brightness(1.0) hue-rotate(-15deg)' },
    { id: 'amber', label: 'Amber', filter: 'sepia(0.5) saturate(1.1) brightness(0.95)' },

    // Cool Tones
    { id: 'cool', label: 'Cool', filter: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)' },
    { id: 'arctic', label: 'Arctic', filter: 'saturate(0.8) brightness(1.1) hue-rotate(20deg) contrast(1.05)' },
    { id: 'ocean', label: 'Ocean', filter: 'saturate(1.1) brightness(1.0) hue-rotate(30deg)' },
    { id: 'moonlight', label: 'Moon', filter: 'saturate(0.7) brightness(1.15) hue-rotate(15deg) contrast(0.95)' },

    // Vibrant
    { id: 'vivid', label: 'Vivid', filter: 'saturate(1.5) contrast(1.1)' },
    { id: 'pop', label: 'Pop', filter: 'saturate(1.7) contrast(1.15) brightness(1.05)' },
    { id: 'neon', label: 'Neon', filter: 'saturate(2.0) contrast(1.2) brightness(1.1)' },
    { id: 'electric', label: 'Electric', filter: 'saturate(1.8) contrast(1.25) hue-rotate(5deg)' },

    // Moody
    { id: 'fade', label: 'Fade', filter: 'contrast(0.9) brightness(1.1) saturate(0.8)' },
    { id: 'dramatic', label: 'Drama', filter: 'contrast(1.3) brightness(0.95) saturate(1.1)' },
    { id: 'moody', label: 'Moody', filter: 'contrast(1.2) brightness(0.85) saturate(0.9)' },
    { id: 'shadow', label: 'Shadow', filter: 'contrast(1.35) brightness(0.8) saturate(0.85)' },

    // Soft & Dreamy
    { id: 'soft', label: 'Soft', filter: 'contrast(0.85) brightness(1.1) saturate(0.9)' },
    { id: 'dreamy', label: 'Dreamy', filter: 'contrast(0.8) brightness(1.15) saturate(0.85) blur(0.5px)' },
    { id: 'haze', label: 'Haze', filter: 'contrast(0.9) brightness(1.2) saturate(0.75)' },

    // Artistic
    { id: 'invert', label: 'Invert', filter: 'invert(1)' },
    { id: 'sepia', label: 'Sepia', filter: 'sepia(1)' },
    { id: 'chrome', label: 'Chrome', filter: 'saturate(0) contrast(1.3) brightness(1.1)' },

    // Instagram-style
    { id: 'clarendon', label: 'Claren', filter: 'contrast(1.2) saturate(1.35)' },
    { id: 'gingham', label: 'Gingham', filter: 'brightness(1.05) hue-rotate(-10deg) saturate(0.9)' },
    { id: 'juno', label: 'Juno', filter: 'sepia(0.1) saturate(1.5) contrast(1.15) brightness(1.05)' },
    { id: 'lark', label: 'Lark', filter: 'contrast(0.9) saturate(1.1) brightness(1.1)' },
    { id: 'reyes', label: 'Reyes', filter: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
] as const;
