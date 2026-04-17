import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage Component
 * 
 * Performance-first image component for POS menu items.
 * Features:
 * - Lazy Loading (loading="lazy")
 * - Async decoding (decoding="async")
 * - Shimmer placeholder while loading
 * - Professional fallback on error
 * - Smart URL optimization for supported CDNs (Appwrite)
 * - Layout shift prevention (Aspect Ratio)
 */

const getOptimizedUrl = (url, width = 400, quality = 75) => {
    if (!url) return '';
    
    // Support Appwrite URL optimization if detected
    if (url.includes('/storage/buckets/') && url.includes('/files/')) {
        try {
            const u = new URL(url);
            // Appwrite preview API
            u.pathname = u.pathname.replace(/\/view$/, '/preview');
            if (!u.pathname.endsWith('/preview')) {
                u.pathname = u.pathname + '/preview';
            }
            u.searchParams.set('width', String(width));
            u.searchParams.set('quality', String(quality));
            u.searchParams.set('output', 'webp'); // Optimization: Use WebP
            return u.toString();
        } catch {
            return url;
        }
    }

    // Support for potential other CDNs or just return original URL
    return url;
};

const OptimizedImage = ({ 
    src, 
    alt, 
    className = "", 
    containerClassName = "",
    width = 400, 
    quality = 75,
    aspectRatio = "aspect-square",
    objectFit = "object-cover",
    children
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const fullResUrl = getOptimizedUrl(src, width, quality);

    // Reset state when src changes
    useEffect(() => {
        if (!src) {
            setIsError(true);
            setIsLoading(false);
        } else {
            setIsLoading(true);
            setIsError(false);
        }
    }, [src]);

    return (
        <div className={`relative overflow-hidden ${containerClassName} ${aspectRatio} bg-[var(--theme-bg-dark)]`}>
            {/* Shimmer Placeholder */}
            {isLoading && !isError && (
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-[var(--theme-border)] to-transparent animate-shimmer-sweep opacity-30" 
                     style={{ backgroundSize: '200% 100%' }} />
            )}

            {/* Error Fallback */}
            {isError ? (
                <div className={`w-full h-full flex flex-col items-center justify-center bg-[var(--theme-bg-muted)] text-[var(--theme-text-subtle)] border border-[var(--theme-border)]`}>
                    <svg className="w-8 h-8 opacity-20 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30">No Image</span>
                </div>
            ) : (
                <img
                    src={fullResUrl}
                    alt={alt || "Menu Item"}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsError(true);
                        setIsLoading(false);
                    }}
                    className={`
                        w-full h-full transition-all duration-700 ease-out
                        ${objectFit} 
                        ${className}
                        ${isLoading ? 'scale-110 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'}
                    `}
                />
            )}
            
            {/* Overlays (Add to Cart buttons, badges, etc.) */}
            {children}
        </div>
    );
};

export default OptimizedImage;

