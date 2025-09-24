// firebase-messaging-sw.js
// Complete PWA Service Worker untuk YUKI dengan Firebase Messaging
// Version: 2.0.0

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// PWA Configuration
const CACHE_NAME = 'yuki-pwa-v2.0.0';
const DATA_CACHE_NAME = 'yuki-data-v2.0.0';
const SW_VERSION = '2.0.0';

// Firebase configuration - Your actual config
const firebaseConfig = {
    apiKey: "AIzaSyBy1k5a9HWebDVKzXa7BpKaX1Rb_TBD-Wk",
    authDomain: "yuki-catatan-app.firebaseapp.com", 
    projectId: "yuki-catatan-app",
    storageBucket: "yuki-catatan-app.firebasestorage.app",
    messagingSenderId: "297091216840",
    appId: "1:297091216840:web:0865c2c665311b8e0a7cfd",
    measurementId: "G-3DS20TBDY1"
};

// Cache resources for offline functionality
const STATIC_CACHE_URLS = [
    '/yuki/',
    '/yuki/index.html',
    '/yuki/manifest.json',
    '/yuki/icon.png',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
];

// API URLs that should be cached with network-first strategy
const API_CACHE_URLS = [
    'https://script.google.com/macros/s/AKfycbz_Ab__bbSpHyMc__KsW2c5hVjkCBOKiEE9P2Pf789noK46EtOwuGIuhuS68wyHQfnS/exec'
];

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

console.log(`[SW v${SW_VERSION}] YUKI Service Worker initializing...`);

// =============================================================================
// PWA INSTALLATION & CACHING
// =============================================================================

// Service Worker installation
self.addEventListener('install', (event) => {
    console.log(`[SW v${SW_VERSION}] Installing...`);
    
    event.waitUntil(
        Promise.all([
            // Cache static resources
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[SW] Caching static resources...');
                return cache.addAll(STATIC_CACHE_URLS.map(url => {
                    return new Request(url, { cache: 'reload' });
                }));
            }),
            // Skip waiting to activate immediately
            self.skipWaiting()
        ]).catch(error => {
            console.error('[SW] Install failed:', error);
        })
    );
});

// Service Worker activation
self.addEventListener('activate', (event) => {
    console.log(`[SW v${SW_VERSION}] Activating...`);
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(),
            // Claim all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log(`[SW v${SW_VERSION}] Activated and ready!`);
            // Notify all clients that SW is ready
            return broadcastToClients({
                type: 'SW_ACTIVATED',
                version: SW_VERSION
            });
        }).catch(error => {
            console.error('[SW] Activation failed:', error);
        })
    );
});

// Clean up old caches
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCacheNames = cacheNames.filter(cacheName => 
        (cacheName.startsWith('yuki-pwa-') || cacheName.startsWith('yuki-data-')) &&
        cacheName !== CACHE_NAME && 
        cacheName !== DATA_CACHE_NAME
    );
    
    console.log('[SW] Cleaning up old caches:', oldCacheNames);
    return Promise.all(
        oldCacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// =============================================================================
// NETWORK REQUEST HANDLING
// =============================================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.method === 'GET') {
        if (isStaticAsset(request)) {
            // Static assets: Cache first with fallback
            event.respondWith(handleStaticAsset(request));
        } else if (isAPIRequest(request)) {
            // API requests: Network first with cache fallback
            event.respondWith(handleAPIRequest(request));
        } else if (isHTMLRequest(request)) {
            // HTML requests: Network first with cache fallback
            event.respondWith(handleHTMLRequest(request));
        }
    }
});

// Check if request is for static asset
function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/);
}

// Check if request is for API
function isAPIRequest(request) {
    return API_CACHE_URLS.some(apiUrl => request.url.includes(apiUrl));
}

// Check if request is for HTML
function isHTMLRequest(request) {
    return request.headers.get('accept')?.includes('text/html');
}

// Handle static asset requests (cache first)
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Static asset fetch failed:', error);
        return new Response('Asset not available offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Handle API requests (network first)
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DATA_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] API request failed, trying cache...');
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Add offline indicator to response
            const offlineResponse = cachedResponse.clone();
            return offlineResponse;
        }
        
        // Return offline page or error
        return new Response(JSON.stringify({
            success: false,
            message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
            offline: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle HTML requests (network first with fallback)
async function handleHTMLRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.log('[SW] HTML request failed, serving cached version...');
        
        const cachedResponse = await caches.match('/index.html');
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>YUKI - Offline</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .offline { color: #dc2626; }
                    .retry { margin-top: 20px; }
                    button { padding: 10px 20px; background: #2383e2; color: white; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>🌸 YUKI</h1>
                <p class="offline">Anda sedang offline</p>
                <p>Periksa koneksi internet Anda dan coba lagi</p>
                <div class="retry">
                    <button onclick="window.location.reload()">🔄 Coba Lagi</button>
                </div>
            </body>
            </html>
        `, {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// =============================================================================
// FIREBASE MESSAGING
// =============================================================================

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Firebase background message received:', payload);

    // Extract notification info
    const notificationTitle = payload.notification?.title || 'YUKI Task Reminder';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a task reminder from YUKI',
        icon: payload.notification?.icon || '/yuki/icon.png',
        badge: '/yuki/icon.png',
        tag: 'yuki-task-reminder',
        data: {
            click_action: payload.notification?.click_action || '/yuki/',
            taskId: payload.data?.taskId || null,
            type: payload.data?.type || 'reminder',
            timestamp: Date.now(),
            badge: 1, // Add badge count
            ...payload.data
        },
        actions: [
            {
                action: 'view_tasks',
                title: 'Lihat Tugas',
                icon: '/yuki/icon.png'
            },
            {
                action: 'add_task',
                title: 'Tambah Tugas',
                icon: '/yuki/icon.png'
            },
            {
                action: 'dismiss',
                title: 'Tutup',
                icon: '/yuki/icon.png'
            }
        ],
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
        timestamp: Date.now()
    };

    // Update app badge for GitHub Pages
    if ('setAppBadge' in navigator) {
        navigator.setAppBadge(1);
    }

    // Show the notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received:', event.action);

    event.notification.close();

    const action = event.action;
    const data = event.notification.data || {};
    
    let targetUrl = '/';
    
    // Determine target URL based on action
    switch (action) {
        case 'view_tasks':
            targetUrl = '/yuki/?action=view-tasks';
            break;
        case 'add_task':
            targetUrl = '/yuki/?action=add-task';
            break;
        case 'dismiss':
            // Just close notification
            return;
        default:
            // Default click - open main app
            targetUrl = data.click_action || '/yuki/';
            break;
    }

    // Open or focus the YUKI app
    event.waitUntil(
        handleNotificationClick(targetUrl).catch(error => {
            console.error('[SW] Notification click handling failed:', error);
        })
    );
});

// Handle notification click logic
async function handleNotificationClick(targetUrl) {
    const clients = await self.clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
    });
    
    // Check if YUKI is already open
    const yukiClient = clients.find(client => {
        const clientUrl = new URL(client.url);
        const targetUrlObj = new URL(targetUrl, self.location.origin);
        return clientUrl.origin === targetUrlObj.origin;
    });

    if (yukiClient) {
        // Focus existing YUKI tab and navigate if needed
        await yukiClient.focus();
        
        // Send message to client to handle navigation
        yukiClient.postMessage({
            type: 'NOTIFICATION_CLICK',
            targetUrl: targetUrl,
            timestamp: Date.now()
        });
        
        return yukiClient;
    } else {
        // Open new YUKI tab
        return self.clients.openWindow(targetUrl);
    }
}

// Handle push events (additional handling if needed)
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received:', event);

    if (event.data) {
        const payload = event.data.json();
        console.log('[SW] Push data:', payload);

        // Custom push handling logic can be added here
        // The onBackgroundMessage handler above should handle most cases
    }
});

// =============================================================================
// CLIENT COMMUNICATION
// =============================================================================

// Handle messages from main app
self.addEventListener('message', (event) => {
    const { data } = event;
    console.log('[SW] Message received from client:', data);

    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'SW_VERSION',
                version: SW_VERSION
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({
                    type: 'CACHE_CLEARED',
                    success: true
                });
            }).catch(error => {
                event.ports[0].postMessage({
                    type: 'CACHE_CLEARED',
                    success: false,
                    error: error.message
                });
            });
            break;
            
        case 'CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage({
                    type: 'CACHE_STATUS_RESPONSE',
                    status: status
                });
            });
            break;
    }
});

// Broadcast message to all clients
async function broadcastToClients(message) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage(message);
    });
}

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const yukiCaches = cacheNames.filter(name => 
        name.startsWith('yuki-pwa-') || name.startsWith('yuki-data-')
    );
    
    return Promise.all(
        yukiCaches.map(cacheName => caches.delete(cacheName))
    );
}

// Get cache status
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
        if (cacheName.startsWith('yuki-')) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            status[cacheName] = keys.length;
        }
    }
    
    return status;
}

// =============================================================================
// BACKGROUND SYNC (Optional - for future use)
// =============================================================================

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);
    
    if (event.tag === 'yuki-sync-tasks') {
        event.waitUntil(syncTasks());
    }
});

// Sync tasks when connection is restored
async function syncTasks() {
    console.log('[SW] Syncing tasks...');
    
    try {
        // Get pending tasks from IndexedDB or cache
        // This would require implementing offline storage in the main app
        
        // For now, just notify clients that sync is available
        await broadcastToClients({
            type: 'SYNC_AVAILABLE',
            timestamp: Date.now()
        });
        
        console.log('[SW] Sync completed');
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Service Worker error:', event.error);
    
    // Report error to main app if possible
    broadcastToClients({
        type: 'SW_ERROR',
        error: {
            message: event.error?.message || 'Unknown error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        },
        timestamp: Date.now()
    }).catch(() => {
        // Ignore if broadcast fails
    });
});

// Unhandled promise rejection handling
self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
    
    // Report to main app
    broadcastToClients({
        type: 'SW_UNHANDLED_REJECTION',
        reason: event.reason?.toString() || 'Unknown rejection',
        timestamp: Date.now()
    }).catch(() => {
        // Ignore if broadcast fails
    });
});

// =============================================================================
// PWA UPDATE HANDLING
// =============================================================================

// Listen for update events
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_FOR_UPDATE') {
        // This will be handled by the app's update check mechanism
        event.ports[0].postMessage({
            type: 'UPDATE_STATUS',
            hasUpdate: false, // This would be determined by version comparison
            currentVersion: SW_VERSION
        });
    }
});

console.log(`[SW v${SW_VERSION}] YUKI Service Worker ready! 🌸`);

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================

// Only in development - log cache contents
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    self.addEventListener('activate', () => {
        console.log('[SW DEV] Current caches:');
        caches.keys().then(names => {
            names.forEach(name => console.log('[SW DEV] Cache:', name));
        });
    });
}
