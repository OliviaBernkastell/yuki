// Firebase Cloud Messaging Service Worker for YUKI - Enhanced Version
// Place this file at: /yuki/firebase-messaging-sw.js

console.log('[SW] Loading Firebase Messaging Service Worker...');

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as main app)
const firebaseConfig = {
    apiKey: "AIzaSyBy1k5a9HWebDVKzXa7BpKaX1Rb_TBD-Wk",
    authDomain: "yuki-catatan-app.firebaseapp.com",
    projectId: "yuki-catatan-app",
    storageBucket: "yuki-catatan-app.firebasestorage.app",
    messagingSenderId: "297091216840",
    appId: "1:297091216840:web:0865c2c665311b8e0a7cfd",
    measurementId: "G-3DS20TBDY1"
};

// Initialize Firebase in service worker
try {
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] ✅ Firebase initialized successfully');
} catch (error) {
    console.error('[SW] ❌ Firebase initialization failed:', error);
}

// Initialize Firebase Messaging
const messaging = firebase.messaging();
console.log('[SW] ✅ Firebase Messaging initialized');

// CRITICAL: Background message handler - Enhanced for reliability
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 📨 Background message received:', payload);
    console.log('[SW] 📨 Notification data:', payload.notification);
    console.log('[SW] 📨 Custom data:', payload.data);

    try {
        // Extract notification data with fallbacks
        const notificationTitle = payload.notification?.title || payload.data?.title || 'YUKI Notification';
        const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new notification';
        
        // Detect notification type
        const notificationType = payload.data?.type || 'general';
        const isScheduled = notificationType === 'yuki_notification' || payload.data?.timestamp;
        
        console.log('[SW] 🔔 Creating notification:', {
            title: notificationTitle,
            body: notificationBody,
            type: notificationType,
            isScheduled: isScheduled
        });

        // Enhanced notification options
        const notificationOptions = {
            body: notificationBody,
            icon: './icon.png',
            badge: './icon.png',
            tag: isScheduled ? 'yuki-scheduled' : 'yuki-notification',
            data: {
                click_action: payload.data?.click_action || './',
                url: payload.data?.click_action || './',
                type: notificationType,
                timestamp: new Date().toISOString(),
                ...payload.data
            },
            actions: [
                {
                    action: 'open',
                    title: 'Open YUKI',
                    icon: './icon.png'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ],
            requireInteraction: isScheduled, // Scheduled notifications require interaction
            silent: false,
            vibrate: isScheduled ? [200, 100, 200, 100, 200] : [200, 100, 200], // Longer vibration for scheduled
            renotify: true,
            image: payload.notification?.image || null,
            dir: 'ltr',
            lang: 'id'
        };

        console.log('[SW] 🔔 Showing notification with options:', notificationOptions);

        // Force show notification
        return self.registration.showNotification(notificationTitle, notificationOptions);

    } catch (error) {
        console.error('[SW] ❌ Error handling background message:', error);
        
        // Fallback notification
        return self.registration.showNotification('YUKI', {
            body: 'You have a new notification',
            icon: './icon.png',
            tag: 'yuki-fallback'
        });
    }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 🖱️ Notification clicked:', event.notification.title);
    console.log('[SW] 🖱️ Action:', event.action);
    console.log('[SW] 🖱️ Data:', event.notification.data);

    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};
    const clickAction = data.click_action || data.url || './';

    // Close notification
    notification.close();

    // Handle dismiss action
    if (action === 'dismiss') {
        console.log('[SW] 🚫 Notification dismissed');
        return;
    }

    // Handle open action or default click
    console.log('[SW] 🚀 Opening YUKI app...');
    
    event.waitUntil(
        clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        }).then((clientList) => {
            console.log('[SW] 🔍 Found clients:', clientList.length);

            // Check if YUKI is already open
            const existingClient = clientList.find(client => {
                const isYukiApp = client.url.includes('/yuki/') || 
                                client.url.includes('yuki') ||
                                client.url.includes('localhost');
                console.log('[SW] 🔍 Checking client:', client.url, 'isYuki:', isYukiApp);
                return isYukiApp && 'focus' in client;
            });

            if (existingClient) {
                console.log('[SW] ✅ Focusing existing YUKI window');
                return existingClient.focus();
            }

            // Open new window
            console.log('[SW] 🆕 Opening new YUKI window:', clickAction);
            if (clients.openWindow) {
                return clients.openWindow(clickAction);
            }
        }).catch(error => {
            console.error('[SW] ❌ Error handling notification click:', error);
        })
    );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] ❌ Notification closed:', event.notification.tag);
    console.log('[SW] 📊 Notification data:', event.notification.data);
    
    // Optional: Track notification dismissals
    // Could send analytics here if needed
});

// Enhanced Service Worker installation
self.addEventListener('install', (event) => {
    console.log('[SW] 🔧 Service Worker installing...');
    
    // Force activation to ensure immediate background message handling
    event.waitUntil(
        Promise.resolve().then(() => {
            console.log('[SW] ⚡ Forcing immediate activation');
            return self.skipWaiting();
        })
    );
});

// Enhanced Service Worker activation
self.addEventListener('activate', (event) => {
    console.log('[SW] ✅ Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Take control of all clients immediately
            self.clients.claim(),
            
            // Clean up old caches if needed
            Promise.resolve().then(() => {
                console.log('[SW] 🧹 Cleaning up old resources');
                // Add cache cleanup logic here if needed
                return Promise.resolve();
            })
        ]).then(() => {
            console.log('[SW] 🎉 Service Worker fully activated and ready');
            
            // Log current registration info
            return self.registration.getNotifications().then(notifications => {
                console.log('[SW] 📊 Current notifications:', notifications.length);
            });
        })
    );
});

// Handle direct push events (fallback for FCM)
self.addEventListener('push', (event) => {
    console.log('[SW] 📬 Direct push event received:', event);

    if (!event.data) {
        console.log('[SW] ⚠️ Push event has no data');
        return;
    }

    try {
        const data = event.data.json();
        console.log('[SW] 📬 Push data parsed:', data);
        
        const title = data.notification?.title || data.title || 'YUKI';
        const options = {
            body: data.notification?.body || data.body || 'New notification',
            icon: './icon.png',
            badge: './icon.png',
            tag: 'yuki-direct-push',
            data: data.data || data,
            requireInteraction: true,
            vibrate: [200, 100, 200]
        };

        console.log('[SW] 📬 Showing direct push notification');
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
        
    } catch (error) {
        console.error('[SW] ❌ Error parsing push data:', error);
        
        // Show fallback notification
        event.waitUntil(
            self.registration.showNotification('YUKI', {
                body: 'You have a new notification',
                icon: './icon.png',
                tag: 'yuki-push-fallback'
            })
        );
    }
});

// Handle fetch events (optional: for caching and debugging)
self.addEventListener('fetch', (event) => {
    // Only log YUKI app requests for debugging
    if (event.request.url.includes('/yuki/') || event.request.url.includes('yuki')) {
        console.log('[SW] 🌐 Fetch request:', event.request.url);
    }
    
    // Let browser handle all requests normally
    // Add caching logic here if needed for offline support
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] ❌ Unhandled promise rejection:', event.reason);
});

// Error handling for general errors
self.addEventListener('error', (event) => {
    console.error('[SW] ❌ Service Worker error:', event.error);
});

// Heartbeat function to keep service worker alive (optional)
function heartbeat() {
    console.log('[SW] 💓 Service worker heartbeat at', new Date().toISOString());
}

// Set heartbeat interval (every 30 seconds)
setInterval(heartbeat, 30000);

// Log successful service worker load
console.log('[SW] 🎉 Firebase Messaging Service Worker loaded successfully');
console.log('[SW] 📋 Service Worker scope:', self.registration?.scope || 'Unknown');
console.log('[SW] 🔧 Service Worker version: 2.0 - Enhanced Background Support');

// Test notification function (for debugging)
function showTestNotification() {
    return self.registration.showNotification('YUKI Service Worker Test', {
        body: 'Service worker is working correctly!',
        icon: './icon.png',
        tag: 'sw-test',
        requireInteraction: true
    });
}

// Make test function available for debugging
self.showTestNotification = showTestNotification;
