import React, { useState, useEffect } from 'react';
import { getFoodFallbackImage, FALLBACK_IMAGE_URL } from '../utils/foodImages';

const getOptimizedUrl = (url, width = 400, quality = 75) => {
    if (!url) return '';

    // Appwrite URL optimization
    if (url.includes('/storage/buckets/') && url.includes('/files/')) {
        try {
            const u = new URL(url);
            u.pathname = u.pathname.replace(/\/view$/, '/preview');
            if (!u.pathname.endsWith('/preview')) u.pathname += '/preview';
            u.searchParams.set('width', String(width));
            u.searchParams.set('quality', String(quality));
            u.searchParams.set('output', 'webp');
            return u.toString();
        } catch {
            return url;
        }
    }

    return url;
};

const OptimizedImage = ({
    src,
    alt,
    className = '',
    containerClassName = '',
    width = 400,
    quality = 75,
    aspectRatio = 'aspect-square',
    objectFit = 'object-cover',
    children,
}) => {
    const fallbackSrc = getFoodFallbackImage(alt || '');

    const resolveSrc = (rawSrc) => {
        if (!rawSrc) return fallbackSrc;
        return getOptimizedUrl(rawSrc, width, quality);
    };

    const [currentSrc, setCurrentSrc] = useState(() => resolveSrc(src));
    const [isLoading, setIsLoading] = useState(true);
    const [isFinalError, setIsFinalError] = useState(false);

    useEffect(() => {
        setCurrentSrc(resolveSrc(src));
        setIsLoading(true);
        setIsFinalError(false);
    }, [src, alt]);

    const handleError = () => {
        if (currentSrc === FALLBACK_IMAGE_URL) {
            // Both specific and generic fallback failed — stop trying
            setIsFinalError(true);
            setIsLoading(false);
            return;
        }
        if (currentSrc !== fallbackSrc) {
            // Primary image failed → try keyword fallback
            setCurrentSrc(fallbackSrc);
            setIsLoading(true);
            return;
        }
        // Keyword fallback failed → try generic fallback
        if (currentSrc !== FALLBACK_IMAGE_URL) {
            setCurrentSrc(FALLBACK_IMAGE_URL);
            setIsLoading(true);
        } else {
            setIsFinalError(true);
            setIsLoading(false);
        }
    };

    return (
        <div className={`relative overflow-hidden ${containerClassName} ${aspectRatio} bg-[var(--theme-bg-dark)]`}>
            {/* Shimmer while loading */}
            {isLoading && !isFinalError && (
                <div
                    className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-[var(--theme-border)] to-transparent animate-shimmer-sweep opacity-30"
                    style={{ backgroundSize: '200% 100%' }}
                />
            )}

            {isFinalError ? (
                // All fallbacks exhausted — plain dark tile with icon
                <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--theme-bg-muted)] text-[var(--theme-text-subtle)] border border-[var(--theme-border)]">
                    <svg className="w-8 h-8 opacity-20 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30">No Image</span>
                </div>
            ) : (
                <img
                    key={currentSrc}
                    src={currentSrc}
                    alt={alt || 'Menu Item'}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setIsLoading(false)}
                    onError={handleError}
                    className={`
                        w-full h-full transition-all duration-700 ease-out
                        ${objectFit}
                        ${className}
                        ${isLoading ? 'scale-110 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'}
                    `}
                />
            )}

            {children}
        </div>
    );
};

export default OptimizedImage;
