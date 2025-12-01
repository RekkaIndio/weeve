import React, { useState, useEffect } from 'react';
import AestheticFallback from './AestheticFallback';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

export default function ImageWithFallback({
    src,
    fallbackSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%231f2937'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%234b5563'%3EImage Not Found%3C/text%3E%3C/svg%3E",
    alt,
    className,
    ...props
}: ImageWithFallbackProps) {
    // Ensure src is a string (filter out Blob types)
    const srcString = typeof src === 'string' ? src : undefined;
    const [imgSrc, setImgSrc] = useState<string | undefined>(srcString);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const newSrc = typeof src === 'string' ? src : undefined;
        setImgSrc(newSrc);
        setHasError(false);
    }, [src]);

    const onError = () => {
        if (!hasError) {
            setHasError(true);
        }
    };

    // If there's an error, render the aesthetic fallback
    if (hasError) {
        return <AestheticFallback className={className} />;
    }

    return (
        <img
            src={imgSrc || fallbackSrc}
            alt={alt}
            className={className}
            onError={onError}
            {...props}
        />
    );
}
