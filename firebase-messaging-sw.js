// firebase-messaging-sw.js - CORRECTED VERSION
// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

// Firebase config - SAME AS YOUR MAIN APP
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

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("🔔 Background message received:", payload);

  const notificationTitle = payload.notification?.title || "YUKI Task Reminder";
  const notificationOptions = {
    body: payload.notification?.body || "You have a task reminder",
    icon: "/yuki/icon.png",
    badge: "/yuki/icon.png",
    tag: "yuki-task-reminder",
    data: {
      url: "/yuki/", // URL to open when clicked
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
    requireInteraction: true,
    silent: false,
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ Notification click received:", event);

  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  // Open or focus YUKI app
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if YUKI is already open
        for (const client of clientList) {
          if (client.url.includes("/yuki/") && "focus" in client) {
            return client.focus();
          }
        }

        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow("/yuki/");
        }
      })
  );
});

// Handle push events (additional safety)
self.addEventListener("push", (event) => {
  if (event.data) {
    console.log("📨 Push event received:", event.data.json());

    const payload = event.data.json();
    const title = payload.notification?.title || "YUKI";
    const options = {
      body: payload.notification?.body || "Task reminder",
      icon: "/yuki/icon.png",
      badge: "/yuki/icon.png",
      tag: "yuki-push",
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

console.log("🔥 Firebase messaging service worker loaded successfully");
