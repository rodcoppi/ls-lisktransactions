// High-performance image component with Next.js optimization, WebP/AVIF support, and lazy loading
'use client';

import React, { 
  useState, 
  useCallback, 
  useRef, 
  useEffect,
  memo,
  forwardRef,
} from 'react';
import Image from 'next/image';
import { useIntersectionLazyLoad } from '../../lib/performance/lazy-loading';
import { performanceMonitor } from '../../lib/performance/monitoring';

// Types
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  fallbackSrc?: string;
  progressive?: boolean;
  responsive?: boolean;
  webpFallback?: boolean;
  avifFallback?: boolean;
  lazyRoot?: Element | Document | null;
  lazyRootMargin?: string;
  lazyThreshold?: number;
}

interface ImageState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  currentSrc: string;
  loadTime?: number;
}

// Enhanced image component with performance optimizations
export const OptimizedImage = memo(
  forwardRef<HTMLDivElement, OptimizedImageProps>(({
    src,
    alt,
    width,
    height,
    fill = false,
    sizes = '100vw',
    quality = 85,
    priority = false,
    placeholder = 'empty',
    blurDataURL,
    className = '',
    style,
    loading = 'lazy',
    onLoad,
    onError,
    onLoadStart,
    fallbackSrc,
    progressive = true,
    responsive = true,
    webpFallback = true,
    avifFallback = true,
    lazyRoot,
    lazyRootMargin = '50px',
    lazyThreshold = 0.1,
    ...props
  }, ref) => {
    // State management
    const [imageState, setImageState] = useState<ImageState>({
      isLoading: false,
      isLoaded: false,
      hasError: false,
      currentSrc: src,
    });

    const loadStartTime = useRef<number>(0);
    const retryCount = useRef<number>(0);
    const maxRetries = 3;

    // Lazy loading setup
    const { elementRef, isVisible } = useIntersectionLazyLoad({
      threshold: lazyThreshold,
      rootMargin: lazyRootMargin,
    });

    // Should load image?
    const shouldLoad = priority || loading === 'eager' || isVisible;

    // Generate optimized image URLs with format fallbacks
    const generateImageSources = useCallback((originalSrc: string) => {
      const sources = [];
      
      // AVIF support (best compression)
      if (avifFallback && progressive) {
        sources.push({
          srcSet: generateSrcSet(originalSrc, 'avif'),
          type: 'image/avif',
        });
      }
      
      // WebP support (good compression, wide support)
      if (webpFallback) {
        sources.push({
          srcSet: generateSrcSet(originalSrc, 'webp'),
          type: 'image/webp',
        });
      }
      
      // Fallback to original format
      sources.push({
        srcSet: generateSrcSet(originalSrc),
        type: getImageMimeType(originalSrc),
      });
      
      return sources;
    }, [avifFallback, webpFallback, progressive]);

    // Generate responsive srcSet
    const generateSrcSet = useCallback((imageSrc: string, format?: string) => {
      if (!responsive || (!width && !fill)) {
        return imageSrc;
      }

      const breakpoints = [480, 768, 1024, 1280, 1920];
      const srcSetEntries = [];

      breakpoints.forEach(breakpoint => {
        if (!width || breakpoint <= width * 2) { // Don't generate larger than 2x original
          const params = new URLSearchParams();
          params.set('w', breakpoint.toString());
          params.set('q', quality.toString());
          if (format) params.set('f', format);
          
          const optimizedSrc = `${imageSrc}?${params.toString()}`;
          srcSetEntries.push(`${optimizedSrc} ${breakpoint}w`);
        }
      });

      return srcSetEntries.join(', ');
    }, [responsive, width, quality]);

    // Handle load start
    const handleLoadStart = useCallback(() => {
      loadStartTime.current = performance.now();
      setImageState(prev => ({ ...prev, isLoading: true }));
      onLoadStart?.();
      
      performanceMonitor.recordCustomMetric('image-load-start', 1, {
        src: getImageName(src),
        width: width?.toString() || 'auto',
        height: height?.toString() || 'auto',
      });
    }, [src, width, height, onLoadStart]);

    // Handle successful load
    const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
      const loadTime = performance.now() - loadStartTime.current;
      
      setImageState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: true,
        hasError: false,
        loadTime,
      }));

      // Record performance metrics
      performanceMonitor.recordCustomMetric('image-load-success', loadTime, {
        src: getImageName(src),
        width: width?.toString() || 'auto',
        height: height?.toString() || 'auto',
        retries: retryCount.current.toString(),
      });

      onLoad?.(event);
    }, [src, width, height, onLoad]);

    // Handle load error with retry logic
    const handleError = useCallback(() => {
      const currentRetries = retryCount.current;
      
      performanceMonitor.recordCustomMetric('image-load-error', 1, {
        src: getImageName(src),
        retry: currentRetries.toString(),
      });

      // Try fallback source first
      if (currentRetries === 0 && fallbackSrc) {
        retryCount.current++;
        setImageState(prev => ({
          ...prev,
          isLoading: false,
          currentSrc: fallbackSrc,
        }));
        return;
      }

      // Then try retrying original source
      if (currentRetries < maxRetries) {
        retryCount.current++;
        setTimeout(() => {
          setImageState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }, Math.pow(2, currentRetries) * 1000); // Exponential backoff
        return;
      }

      // Finally, set error state
      setImageState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));

      onError?.(new Error(`Failed to load image after ${maxRetries} retries: ${src}`));
    }, [src, fallbackSrc, maxRetries, onError]);

    // Reset state when src changes
    useEffect(() => {
      retryCount.current = 0;
      setImageState({
        isLoading: false,
        isLoaded: false,
        hasError: false,
        currentSrc: src,
      });
    }, [src]);

    // Generate placeholder
    const getPlaceholder = useCallback(() => {
      if (placeholder === 'blur' && blurDataURL) {
        return blurDataURL;
      }
      
      // Generate a simple SVG placeholder
      const placeholderWidth = width || 400;
      const placeholderHeight = height || 300;
      
      const svgPlaceholder = `data:image/svg+xml;base64,${btoa(`
        <svg width="${placeholderWidth}" height="${placeholderHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="14">
            Loading...
          </text>
        </svg>
      `)}`;
      
      return svgPlaceholder;
    }, [placeholder, blurDataURL, width, height]);

    // Error fallback component
    if (imageState.hasError) {
      return (
        <div 
          ref={ref}
          className={`image-error-fallback bg-gray-100 border border-gray-200 rounded flex items-center justify-center ${className}`}
          style={{
            width: width || '100%',
            height: height || 200,
            ...style,
          }}
        >
          <div className="text-center text-gray-500">
            <svg 
              className="mx-auto h-8 w-8 mb-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      );
    }

    // Don't render anything if not visible and lazy loading
    if (!shouldLoad && loading === 'lazy') {
      return (
        <div 
          ref={elementRef}
          className={`image-placeholder ${className}`}
          style={{
            width: width || '100%',
            height: height || 200,
            backgroundColor: '#f3f4f6',
            ...style,
          }}
        />
      );
    }

    // Main image component
    return (
      <div 
        ref={ref || elementRef}
        className={`optimized-image-container ${className}`}
        style={style}
      >
        {progressive && (width || fill) ? (
          // Use picture element for progressive enhancement
          <picture>
            {generateImageSources(imageState.currentSrc).map((source, index) => (
              <source 
                key={index}
                srcSet={source.srcSet}
                type={source.type}
                sizes={sizes}
              />
            ))}
            <Image
              src={imageState.currentSrc}
              alt={alt}
              width={!fill ? width : undefined}
              height={!fill ? height : undefined}
              fill={fill}
              sizes={sizes}
              quality={quality}
              priority={priority}
              placeholder={placeholder}
              blurDataURL={placeholder === 'blur' ? (blurDataURL || getPlaceholder()) : undefined}
              onLoadStart={handleLoadStart}
              onLoad={handleLoad}
              onError={handleError}
              className={`transition-opacity duration-300 ${
                imageState.isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              {...props}
            />
          </picture>
        ) : (
          // Standard Next.js Image component
          <Image
            src={imageState.currentSrc}
            alt={alt}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            fill={fill}
            sizes={sizes}
            quality={quality}
            priority={priority}
            placeholder={placeholder}
            blurDataURL={placeholder === 'blur' ? (blurDataURL || getPlaceholder()) : undefined}
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-opacity duration-300 ${
              imageState.isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            {...props}
          />
        )}
        
        {/* Loading overlay */}
        {imageState.isLoading && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="loading-spinner w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  })
);

OptimizedImage.displayName = 'OptimizedImage';

// Helper functions
function getImageName(src: string): string {
  return src.substring(src.lastIndexOf('/') + 1);
}

function getImageMimeType(src: string): string {
  const extension = src.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    avif: 'image/avif',
  };
  
  return mimeTypes[extension || ''] || 'image/jpeg';
}

// Image gallery component with performance optimizations
export interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  lazyLoad?: boolean;
  quality?: number;
  sizes?: string;
  onImageLoad?: (index: number, loadTime: number) => void;
}

export const OptimizedImageGallery = memo<ImageGalleryProps>(({
  images,
  columns = 3,
  gap = 16,
  lazyLoad = true,
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onImageLoad,
}) => {
  const handleImageLoad = useCallback((index: number) => (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    const loadTime = performance.now();
    onImageLoad?.(index, loadTime);
  }, [onImageLoad]);

  return (
    <div 
      className="optimized-image-gallery grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {images.map((image, index) => (
        <div key={index} className="gallery-item">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={sizes}
            quality={quality}
            loading={lazyLoad ? 'lazy' : 'eager'}
            priority={!lazyLoad && index < 6} // Prioritize first 6 images
            placeholder="blur"
            onLoad={handleImageLoad(index)}
            className="w-full h-auto rounded-lg"
            responsive
            progressive
          />
          {image.caption && (
            <p className="mt-2 text-sm text-gray-600">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
});

OptimizedImageGallery.displayName = 'OptimizedImageGallery';

export default OptimizedImage;