importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyC1vnVFbzezdpqAxjU5GXgAxu63DN05eyE",
  authDomain: "vibegadgets-ae9d1.firebaseapp.com",
  projectId: "vibegadgets-ae9d1",
  storageBucket: "vibegadgets-ae9d1.firebasestorage.app",
  messagingSenderId: "50155075863",
  appId: "1:50155075863:web:469bb97fffbd37767bdf52",
  measurementId: "G-64DGWNB9MZ"
};

try {
   firebase.initializeApp(firebaseConfig);
   const messaging = firebase.messaging();
   
   messaging.onBackgroundMessage((payload) => {
     console.log('[firebase-messaging-sw.js] Received background message ', payload);
     const notificationTitle = payload.notification?.title || "Vibe Gadgets";
     
     let url = '/';
     if (payload.fcmOptions && payload.fcmOptions.link) {
         url = payload.fcmOptions.link;
     } else if (payload.data && payload.data.url) {
         url = payload.data.url;
     }

     const notificationOptions = {
       body: payload.notification?.body,
       icon: '/apple-touch-icon.png',
       image: payload.notification?.image,
       data: { url: url }
     };
   
     self.registration.showNotification(notificationTitle, notificationOptions);
   });
} catch(e) {}

// Standard Web Push Handler for VAPID implementation
self.addEventListener('push', function(event) {
  // If no data, do nothing
  if (!event.data) return;
  
  try {
     const data = event.data.json();
     // Determine if it was already handled by Firebase
     // Firebase messages usually have `data.firebaseMessaging` wrapped.
     // So we only show notification if it's OUR direct raw Web Push data format.
     if (!data.fcmMessageId && !data.from) {
         const title = data.title || 'Vibe Gadgets';
         const options = {
             body: data.body,
             icon: data.icon || '/apple-touch-icon.png',
             image: data.image,
             data: { url: data.url || '/' }
         };
         event.waitUntil(self.registration.showNotification(title, options));
     }
  } catch(e) {
     // Not JSON or handled
  }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            let urlToOpen = event.notification.data?.url || '/';
            // ensure it's a full URL
            if (urlToOpen.startsWith('/')) {
                urlToOpen = self.location.origin + urlToOpen;
            } else if (!urlToOpen.startsWith('http')) {
                urlToOpen = self.location.origin + '/' + urlToOpen;
            }
            
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(urlToOpen);
                    }
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
