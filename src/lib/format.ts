/**
 * Formats a number to a compact representation (e.g., 1.4k, 2.5M)
 */
export const formatCount = (num: number): string => {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
};

/**
 * Formats a timestamp into a relative time string (e.g., "5m ago", "2h ago")
 */
export const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const deltaSeconds = Math.round((now - timestamp) / 1000);
    
    if (deltaSeconds < 60) {
        return `${Math.max(0, deltaSeconds)}s ago`;
    }
    
    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (deltaMinutes < 60) {
        return `${deltaMinutes}m ago`;
    }
    
    const deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) {
        return `${deltaHours}h ago`;
    }
    
    const deltaDays = Math.round(deltaHours / 24);
    if (deltaDays < 7) {
        return `${deltaDays}d ago`;
    }

    const deltaWeeks = Math.round(deltaDays / 7);
    if (deltaWeeks < 4) {
        return `${deltaWeeks}w ago`;
    }
    
    const deltaMonths = Math.round(deltaDays / 30);
    if (deltaMonths < 12) {
        return `${deltaMonths}mo ago`;
    }

    const deltaYears = Math.round(deltaDays / 365);
    return `${Math.max(0, deltaYears)}y ago`;
};
