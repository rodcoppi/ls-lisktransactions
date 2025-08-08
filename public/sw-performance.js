// Performance-optimized Service Worker with advanced caching strategies
// Version: 1.0.0

const CACHE_VERSION = 'performance-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Cache configuration
const CACHE_CONFIG = {
  static: {
    maxEntries: 100,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  dynamic: {
    maxEntries: 50,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  api: {
    maxEntries: 30,
    maxAge: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
  },
  images: {
    maxEntries: 200,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

// Critical resources to always cache
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/framework',
  '/_next/static/chunks/main',
  '/_next/static/chunks/pages',
];

// Performance metrics tracking
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  backgroundSyncs: 0,
  errors: 0,
};

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing performance service worker');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        // Precache critical resources
        return cache.addAll(CRITICAL_RESOURCES.filter(url => 
          !url.includes('/_next/static/css/') // Skip CSS paths for now
        ));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating performance service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.startsWith(CACHE_VERSION))
            .map((name) => caches.delete(name))
        );
      }),
      // Take control of all pages immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;
  
  // Only handle GET requests
  if (method !== 'GET') {
    return;
  }
  
  // Skip non-http requests
  if (!url.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

// Main request handler with different strategies
async function handleRequest(request) {
  const { url } = request;
  const urlObj = new URL(url);
  
  try {
    // Route to appropriate caching strategy
    if (isStaticAsset(url)) {
      return await cacheFirstStrategy(request, STATIC_CACHE, CACHE_CONFIG.static);
    } else if (isApiRequest(url)) {
      return await staleWhileRevalidateStrategy(request, API_CACHE, CACHE_CONFIG.api);
    } else if (isImageRequest(url)) {
      return await cacheFirstStrategy(request, IMAGE_CACHE, CACHE_CONFIG.images);
    } else if (isNavigationRequest(request)) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE, CACHE_CONFIG.dynamic);
    } else {
      return await staleWhileRevalidateStrategy(request, DYNAMIC_CACHE, CACHE_CONFIG.dynamic);
    }
  } catch (error) {
    performanceMetrics.errors++;
    console.error('[SW] Request handling error:', error);
    return handleOffline(request);
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    
    // Check if cache entry is still valid
    if (isCacheEntryValid(cachedResponse, config.maxAge)) {
      return cachedResponse;
    }
  }
  
  // Cache miss or expired - fetch from network
  performanceMetrics.cacheMisses++;
  performanceMetrics.networkRequests++;
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone response before caching
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await enforceMaxEntries(cache, config.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached response if available, even if expired
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network First Strategy (for navigation)
async function networkFirstStrategy(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  
  try {
    performanceMetrics.networkRequests++;
    const networkResponse = await fetchWithTimeout(request, 3000); // 3s timeout
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await enforceMaxEntries(cache, config.maxEntries);
    }
    
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      performanceMetrics.cacheHits++;
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (isNavigationRequest(request)) {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidateStrategy(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch from network in background
  const fetchPromise = fetchAndCache(request, cache, config);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    
    // Return cached response immediately
    // Background fetch will update cache for next time
    if (isCacheEntryValid(cachedResponse, config.staleWhileRevalidate || config.maxAge)) {
      fetchPromise.catch(() => {}); // Ignore errors for background updates
      return cachedResponse;
    }
  }
  
  // No valid cache entry - wait for network
  performanceMetrics.cacheMisses++;
  return await fetchPromise;
}

// Fetch and cache helper
async function fetchAndCache(request, cache, config) {
  performanceMetrics.networkRequests++;
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
      await enforceMaxEntries(cache, config.maxEntries);
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Fetch with timeout
function fetchWithTimeout(request, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
    
    fetch(request)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// Cache entry validation
function isCacheEntryValid(response, maxAge) {
  if (!response.headers.has('sw-cache-timestamp')) {
    return false;
  }
  
  const cacheTimestamp = parseInt(response.headers.get('sw-cache-timestamp'));
  const now = Date.now();
  return (now - cacheTimestamp) < maxAge;
}

// Enforce cache size limits
async function enforceMaxEntries(cache, maxEntries) {
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Remove oldest entries (simple FIFO)
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Request type detection
function isStaticAsset(url) {
  return (
    url.includes('/_next/static/') ||
    url.includes('/static/') ||
    /\.(js|css|ico|png|jpg|jpeg|gif|webp|avif|woff|woff2|ttf|otf)$/i.test(url)
  );
}

function isApiRequest(url) {
  return url.includes('/api/') || url.includes('/graphql');
}

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|webp|avif|svg)$/i.test(url);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Offline handling
async function handleOffline(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // Return cached version if available
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return offline page for navigation requests
  if (isNavigationRequest(request)) {
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) return offlinePage;
  }
  
  // Return a basic offline response
  return new Response('Offline - Content not available', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  performanceMetrics.backgroundSyncs++;
  
  try {
    // Implement background sync logic here
    // For example, retry failed API requests
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Performance monitoring
setInterval(() => {
  // Send performance metrics to analytics (if online)
  if (navigator.onLine) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_PERFORMANCE_METRICS',
          data: {
            ...performanceMetrics,
            cacheHitRate: performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) || 0,
          },
        });
      });
    });
  }
}, 60000); // Every minute

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_PERFORMANCE_METRICS':
      event.ports[0].postMessage({
        type: 'PERFORMANCE_METRICS_RESPONSE',
        data: performanceMetrics,
      });
      break;
      
    case 'PRECACHE_RESOURCES':
      event.waitUntil(precacheResources(data.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCaches(data.cacheNames));
      break;
      
    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

// Precache specific resources
async function precacheResources(urls) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    await cache.addAll(urls);
    console.log('[SW] Precached resources:', urls);
  } catch (error) {
    console.error('[SW] Precaching failed:', error);
  }
}

// Clear specific caches
async function clearCaches(cacheNames) {
  const promises = cacheNames.map(name => caches.delete(name));
  await Promise.all(promises);
  console.log('[SW] Cleared caches:', cacheNames);
}

// Critical resource push (for HTTP/2 Push simulation)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (isNavigationRequest(request)) {
    event.waitUntil(pushCriticalResources(request));
  }
});

async function pushCriticalResources(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // List of critical resources to "push"
  const criticalResources = [
    '/_next/static/css/app.css',
    '/_next/static/chunks/framework.js',
    '/_next/static/chunks/main.js',
  ];
  
  // Prefetch critical resources if not cached
  const prefetchPromises = criticalResources.map(async (url) => {
    const fullUrl = new URL(url, request.url).href;
    const cached = await cache.match(fullUrl);
    
    if (!cached) {
      try {
        const response = await fetch(fullUrl);
        if (response.ok) {
          await cache.put(fullUrl, response.clone());
        }
      } catch (error) {
        console.warn('[SW] Failed to prefetch critical resource:', url);
      }
    }
  });
  
  await Promise.all(prefetchPromises);
}

console.log('[SW] Performance service worker loaded');

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleRequest,
    cacheFirstStrategy,
    networkFirstStrategy,
    staleWhileRevalidateStrategy,
    performanceMetrics,
  };
}