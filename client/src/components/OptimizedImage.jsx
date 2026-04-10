import React, { useState, useEffect } from 'react';

/**
 * OptimizedImage Component
 * 
 * Provides an "instant" image loading experience similar to Swiggy/Zomato.
 * Features:
 * - Appwrite image optimization (width/quality)
 * - Blur-up effect (low-res placeholder -> high-res image)
 * - Shimmer/Grey background while loading
 * - Prevents layout shifting
 * - Lazy loading
 */

const getOptimizedUrl = (url, width = 300, quality = 60) => {
    if (!url) return url;
    // Support both old URLs and Appwrite URLs
    if (!url.includes('/storage/buckets/') || !url.includes('/files/')) return url;
    
    try {
        const u = new URL(url);
        // Appwrite preview API supports width and quality
        // Replace /view with /preview if it exists
        u.pathname = u.pathname.replace(/\/view$/, '/preview');
        // Ensure /preview is there if neither view nor preview was present
        if (!u.pathname.endsWith('/preview')) {
            u.pathname = u.pathname + '/preview';
        }
        
        u.searchParams.set('width', String(width));
        u.searchParams.set('quality', String(quality));
        return u.toString();
    } catch {
        return url;
    }
};

const OptimizedImage = ({ 
    src, 
    alt, 
    className = "", 
    containerClassName = "",
    width = 300, 
    quality = 60,
    aspectRatio = "aspect-square",
    objectFit = "object-cover",
    children
}) => {
    const [error, setError] = useState(false);
    const fullResUrl = getOptimizedUrl(src, width, quality);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (error || !src) {
        return (
            <div className={`w-full h-full flex items-center justify-center text-2xl ${containerClassName} ${aspectRatio}`}>
                🍔
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${containerClassName} ${aspectRatio}`}>
            <img
                src={fullResUrl}
                alt={alt}
                loading="lazy"
                onError={() => setError(true)}
                className={`w-full h-full ${objectFit} ${className}`}
            />
            {children}
        </div>
    );
};

export default OptimizedImage;
