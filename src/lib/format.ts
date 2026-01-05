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
