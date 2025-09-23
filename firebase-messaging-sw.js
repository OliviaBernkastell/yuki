// firebase-messaging-sw.js
// Firebase Service Worker untuk background notifications

// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

// Firebase configuration - Your actual config
const firebaseConfig = {
  apiKey: "AIzaSyBy1k5a9HWebDVKzXa7BpKaX1Rb_TBD-Wk",
  authDomain: "yuki-catatan-app.firebaseapp.com",
  projectId: "yuki-catatan-app",
  storageBucket: "yuki-catatan-app.firebasestorage.app",
  messagingSenderId: "297091216840",
  appId: "1:297091216840:web:0865c2c665311b8e0a7cfd",
  measurementId: "G-3DS20TBDY1",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );

  // Extract notification info
  const notificationTitle = payload.notification?.title || "YUKI Reminder";
  const notificationOptions = {
    body: payload.notification?.body || "You have a task reminder",
    icon: payload.notification?.icon || "/favicon.ico",
    badge: "/badge.png",
    tag: "yuki-notification",
    data: {
      click_action: payload.notification?.click_action || "/",
      ...payload.data,
    },
    actions: [
      {
        action: "view",
        title: "View Tasks",
        icon: "/view-icon.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/dismiss-icon.png",
      },
    ],
    requireInteraction: true, // Keep notification visible until user interacts
    silent: false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
  };

  // Show the notification
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click received.");

  event.notification.close();

  const action = event.action;
  const clickAction = event.notification.data?.click_action || "/";

  if (action === "view" || !action) {
    // Open or focus the YUKI app
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          // Check if YUKI is already open
          const yukiClient = clients.find(
            (client) =>
              client.url.includes("yuki") ||
              client.url === clickAction ||
              client.url === self.location.origin
          );

          if (yukiClient) {
            // Focus existing YUKI tab
            return yukiClient.focus();
          } else {
            // Open new YUKI tab
            return clients.openWindow(clickAction);
          }
        })
    );
  } else if (action === "dismiss") {
    // Just close the notification (already done above)
    console.log("Notification dismissed");
  }
});

// Handle push events (additional handling if needed)
self.addEventListener("push", (event) => {
  console.log("[firebase-messaging-sw.js] Push received:", event);

  if (event.data) {
    const payload = event.data.json();
    console.log("Push data:", payload);

    // You can add custom push handling logic here if needed
    // The onBackgroundMessage handler above should handle most cases
  }
});

// Service Worker installation
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker installing...");
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker activating...");
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Error handling
self.addEventListener("error", (event) => {
  console.error("[firebase-messaging-sw.js] Service Worker error:", event);
});

// Unhandled promise rejection handling
self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "[firebase-messaging-sw.js] Unhandled promise rejection:",
    event
  );
});
