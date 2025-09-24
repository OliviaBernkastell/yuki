// Firebase Cloud Messaging Service Worker for YUKI
// Place this file at: /yuki/firebase-messaging-sw.js

// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

// Firebase configuration (same as main app)
const firebaseConfig = {
  apiKey: "AIzaSyBy1k5a9HWebDVKzXa7BpKaX1Rb_TBD-Wk",
  authDomain: "yuki-catatan-app.firebaseapp.com",
  projectId: "yuki-catatan-app",
  storageBucket: "yuki-catatan-app.firebasestorage.app",
  messagingSenderId: "297091216840",
  appId: "1:297091216840:web:0865c2c665311b8e0a7cfd",
  measurementId: "G-3DS20TBDY1",
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );

  // Extract notification data
  const notificationTitle = payload.notification?.title || "YUKI Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification",
    icon: "/yuki/icon.png",
    badge: "/yuki/icon.png",
    tag: "yuki-notification",
    data: {
      click_action: payload.data?.click_action || "/yuki/",
      url: payload.data?.click_action || "/yuki/",
      ...payload.data,
    },
    actions: [
      {
        action: "open",
        title: "Open YUKI",
        icon: "/yuki/icon.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
    requireInteraction: false,
    silent: false,
  };

  // Show notification
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click received:", event);

  const notification = event.notification;
  const action = event.action;
  const clickAction = notification.data?.click_action || "/yuki/";

  // Close notification
  notification.close();

  if (action === "dismiss") {
    // Just close, do nothing
    return;
  }

  // Handle click action (open or default click)
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if YUKI is already open
        const existingClient = clientList.find((client) => {
          return client.url.includes("/yuki/") && "focus" in client;
        });

        if (existingClient) {
          // Focus existing window
          return existingClient.focus();
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
  );
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log(
    "[firebase-messaging-sw.js] Notification closed:",
    event.notification.tag
  );
  // Optional: Track notification dismissals
});

// Service Worker installation
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker installing...");
  self.skipWaiting(); // Activate immediately
});

// Service Worker activation
self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker activating...");
  event.waitUntil(self.clients.claim()); // Take control immediately
});

// Handle fetch events (optional: for caching)
self.addEventListener("fetch", (event) => {
  // Only handle YUKI app requests
  if (event.request.url.includes("/yuki/")) {
    // You can add caching logic here if needed
    console.log(
      "[firebase-messaging-sw.js] Handling fetch for:",
      event.request.url
    );
  }
});

// Handle push events (backup for FCM)
self.addEventListener("push", (event) => {
  console.log("[firebase-messaging-sw.js] Push event received:", event);

  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.notification?.title || "YUKI";
      const options = {
        body: data.notification?.body || "New notification",
        icon: "/yuki/icon.png",
        badge: "/yuki/icon.png",
        tag: "yuki-push",
        data: data.data,
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (error) {
      console.error(
        "[firebase-messaging-sw.js] Error parsing push data:",
        error
      );
    }
  }
});

console.log(
  "[firebase-messaging-sw.js] Firebase Messaging Service Worker loaded successfully"
);
