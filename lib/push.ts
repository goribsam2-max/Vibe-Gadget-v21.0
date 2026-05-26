import { auth, db, messaging } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

export async function unsubscribeFromWebPush() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return true;
        }
        const registration = await navigator.serviceWorker.ready;
        if (!registration.pushManager) return true;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }
        return true;
    } catch(e) {
        console.error('Web Push unsubscribe error', e);
        return false;
    }
}

export async function subscribeToWebPush() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log("Web Push not supported");
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        const res = await fetch('/api/web-push/public-key');
        if (!res.ok) {
           console.error("Failed to fetch public key");
           return false;
        }
        const { publicKey } = await res.json();
        
        let fcmTokenString = null;
        try {
            const msg = await messaging();
            if (msg && publicKey) {
                const reg = await navigator.serviceWorker.ready;
                fcmTokenString = await getToken(msg, {
                    vapidKey: publicKey,
                    serviceWorkerRegistration: reg
                });
                
                if (fcmTokenString && auth.currentUser) {
                    await updateDoc(doc(db, "users", auth.currentUser.uid), {
                        fcmToken: fcmTokenString
                    });
                }
            }
        } catch (fcmErr) {
            console.error("FCM Token error, falling back to standard web push", fcmErr);
        }

        if (publicKey) {
            const registration = await navigator.serviceWorker.ready;
            if (!registration || !registration.pushManager) {
                 console.error("No push manager available");
                 return false;
            }
            
            const urlB64ToUint8Array = (base64String: string) => {
              const padding = '='.repeat((4 - base64String.length % 4) % 4);
              const base64 = (base64String + padding)
                .replace(/\-/g, '+')
                .replace(/_/g, '/');
              const rawData = window.atob(base64);
              const outputArray = new Uint8Array(rawData.length);
              for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
              }
              return outputArray;
            };

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array(publicKey)
            });

            const uid = auth.currentUser?.uid;
            
            // Save subscription to backend
            const endpointHash = btoa(subscription.endpoint).replace(/[^a-zA-Z0-9]/g, '');
            
            if (uid) {
                try {
                    await updateDoc(doc(db, "users", uid), {
                        fcmToken: fcmTokenString || null,
                        webPushSub: JSON.parse(JSON.stringify(subscription))
                    });
                } catch(e) {
                    console.error("Failed to save to users doc", e);
                }
            }

            try {
                await setDoc(doc(db, "web_push_subscriptions", endpointHash), {
                    subscription: JSON.parse(JSON.stringify(subscription)),
                    uid: uid || null,
                    fcmToken: fcmTokenString || null,
                    createdAt: new Date().getTime()
                });
                return true;
            } catch (err) {
                console.error("Failed to save subscription to Firestore", err);
                
                // If it failed because of permissions but we already saved to users, consider it a success
                if (uid) return true;
                
                return false;
            }
        }
    } catch(e) {
        console.error('Web Push setup error', e);
        return false;
    }
    return false;
}
