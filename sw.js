// Service Worker for Background Removal Tool
// Enables offline functionality and caches critical resources

const CACHE_VERSION = 'gotoolly-v2';
const RUNTIME_CACHE = 'gotoolly-runtime-v2';
const ASSETS_CACHE = 'gotoolly-assets-v2';
const MODEL_CACHE = 'gotoolly-models-v2';

// Files to cache on install
const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/tools/Background%20Removal.html',
+    '/tools/image-compressor.html',
    '/assets/css/base.css',
    '/assets/css/layout.css',
    '/assets/css/components.css',
    '/assets/css/tools.css',
    '/assets/js/main.js',
+    '/assets/js/tools/image-compressor.js',
    '/assets/images/logo.png'
];

// Model files to cache
const MODELS_TO_CACHE = [
    '/assets/js/lib/remove-background.min.js',
    '/assets/js/lib/remove-background.wasm'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install event');
    
    event.waitUntil(
        (async () => {
            try {
                // Cache critical assets
                const cache = await caches.open(ASSETS_CACHE);
                await cache.addAll(CRITICAL_ASSETS.filter(asset => {
                    // Only cache resources that exist
                    return asset !== '/tools/Background%20Removal.html'; // May not exist yet
                }));
                
                console.log('[ServiceWorker] Critical assets cached');
            } catch (error) {
                console.warn('[ServiceWorker] Failed to cache some assets:', error);
            }
            
            // Force the waiting service worker to become the active service worker
            self.skipWaiting();
        })()
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate event');
    
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            
            // Delete old cache versions
            await Promise.all(
                cacheNames
                    .filter(name => name.startsWith('bg-removal-') && 
                                    name !== ASSETS_CACHE && 
                                    name !== MODEL_CACHE &&
                                    name !== RUNTIME_CACHE)
                    .map(name => {
                        console.log('[ServiceWorker] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
            
            // Take control of all pages
            self.clients.claim();
        })()
    );
});

// Fetch event - implement network-first, then cache strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }
    
    // Different strategies based on request type
    if (request.destination === 'document' || url.pathname.includes('Background')) {
        // HTML documents: network-first, fallback to cache
        event.respondWith(networkFirstStrategy(request));
    } else if (request.destination === 'style' || request.destination === 'script') {
        // CSS/JS: cache-first, fallback to network
        event.respondWith(cacheFirstStrategy(request));
    } else if (request.destination === 'image') {
        // Images: cache-first with network update
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Default: network-first
        event.respondWith(networkFirstStrategy(request));
    }
});

/**
 * Network-first strategy: try network, fallback to cache
 * Good for documents that change frequently
 */
async function networkFirstStrategy(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        // If successful, cache it
        if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // Network failed, try cache
        const cached = await caches.match(request);
        
        if (cached) {
            console.log('[ServiceWorker] Using cached response for:', request.url);
            return cached;
        }
        
        // No cache, return offline page or error
        console.warn('[ServiceWorker] Network failed and no cache for:', request.url);
        return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Cache-first strategy: try cache, fallback to network
 * Good for static assets that don't change often
 */
async function cacheFirstStrategy(request) {
    // Check cache first
    const cached = await caches.match(request);
    
    if (cached) {
        console.log('[ServiceWorker] Using cached asset:', request.url);
        
        // Update cache in background (stale-while-revalidate pattern)
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const cache = caches.open(ASSETS_CACHE);
                    cache.then(c => c.put(request, response));
                }
            })
            .catch(err => {
                // Network error during background update, ignore
                console.log('[ServiceWorker] Background update failed:', err.message);
            });
        
        return cached;
    }
    
    // Not in cache, try network
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            // Cache the response
            const cache = await caches.open(ASSETS_CACHE);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.warn('[ServiceWorker] Network failed for:', request.url);
        return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Message handler - allow clients to control cache
 */
self.addEventListener('message', (event) => {
    const { action, payload } = event.data;
    
    switch (action) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
            event.ports[0].postMessage({ success: true });
            break;
            
        case 'CACHE_MODELS':
            cacheModels().then(() => {
                event.ports[0].postMessage({ success: true });
            }).catch(err => {
                event.ports[0].postMessage({ success: false, error: err.message });
            });
            break;
            
        default:
            console.log('[ServiceWorker] Unknown message:', action);
    }
});

/**
 * Pre-cache AI models
 */
async function cacheModels() {
    try {
        const cache = await caches.open(MODEL_CACHE);
        
        for (const modelUrl of MODELS_TO_CACHE) {
            try {
                const response = await fetch(modelUrl);
                if (response.ok) {
                    await cache.put(modelUrl, response);
                    console.log('[ServiceWorker] Cached model:', modelUrl);
                }
            } catch (error) {
                console.warn('[ServiceWorker] Failed to cache model:', modelUrl, error);
            }
        }
    } catch (error) {
        console.error('[ServiceWorker] Failed to cache models:', error);
    }
}

console.log('[ServiceWorker] Background Removal Service Worker loaded');
