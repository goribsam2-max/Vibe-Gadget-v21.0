import { auth } from '../firebase';

export async function subscribeToWebPush() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log("Web Push not supported");
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        const res = await fetch('/api/web-push/public-key');
        if (!res.ok) return false;
        const { publicKey } = await res.json();
        
        if (publicKey) {
            const registration = await navigator.serviceWorker.ready;
            
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
            await fetch('/api/web-push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription, uid }) 
            });

            return true;
        }
    } catch(e) {
        console.error('Web Push setup error', e);
        return false;
    }
    return false;
}
