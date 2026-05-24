import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, ArrowDown, ExternalLink } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const InstallPwaGuide: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [config, setConfig] = useState({ style: 'style1', icon: '' });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "platform"), (docSnap) => {
            if (docSnap.exists()) {
                setConfig({
                    style: docSnap.data().pwaPopupStyle || 'style1',
                    icon: docSnap.data().pwaPopupIcon || ''
                });
            }
        });
        return () => unsub();
    }, []);

    const [mode, setMode] = useState<'install' | 'push' | null>(null);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setIsIos(true);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (localStorage.getItem('pwa_dismissed') !== 'true') {
                setMode('install');
                setShowInstall(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        
        if (isStandalone) {
             // In standalone mode, use this banner to ask for push notifications
             if ('Notification' in window && Notification.permission === 'default' && localStorage.getItem('push_dismissed') !== 'true') {
                 setTimeout(() => {
                     setMode('push');
                     setShowInstall(true);
                 }, 3000);
             } else {
                 setShowInstall(false);
                 setMode(null);
             }
        } else if (isIos && localStorage.getItem('pwa_dismissed') !== 'true') {
            setTimeout(() => {
                setMode('install');
                setShowInstall(true);
            }, 3000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [isIos]);

    const handleInstallParams = async () => {
        // Request Native Web Push subscription
        try {
            if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Fetch VAPID public key from our server
                    const res = await fetch('/api/web-push/public-key');
                    const { publicKey } = await res.json();
                    
                    if (publicKey) {
                        const registration = await navigator.serviceWorker.ready;
                        
                        // Helper to convert base64 to Uint8Array
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

                        // Save subscription to backend
                        await fetch('/api/web-push/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ subscription }) // Optionally pass uid if logged in
                        });
                        
                        if (mode === 'push') {
                            setShowInstall(false);
                            return;
                        }
                    }
                }
            }
        } catch(e) {
            console.error('Web Push setup error', e);
        }

        if (mode === 'push') {
            setShowInstall(false);
            return;
        }

        if (!deferredPrompt && !isIos) return;
        
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstall(false);
            }
        }
    };

    const handleDismiss = () => {
        setShowInstall(false);
        if (mode === 'push') {
            localStorage.setItem('push_dismissed', 'true');
        } else {
            localStorage.setItem('pwa_dismissed', 'true');
        }
    };

    if (!showInstall) return null;

    const AppIcon = () => {
        if (config.icon) {
            return <img src={config.icon} alt="App Icon" className="w-12 h-12 rounded-xl object-cover shrink-0" />;
        }
        return (
            <div className="w-12 h-12 bg-black text-white shrink-0 rounded-xl flex items-center justify-center font-bold text-xl uppercase tracking-tighter">
                V
            </div>
        );
    };

    const renderInstallButton = (className: string) => {
        if (mode === 'push') {
            return (
                <button onClick={handleInstallParams} className={className}>
                    Enable Notifications
                </button>
            );
        }
        if (isIos && !deferredPrompt) {
            return <p className="text-xs text-zinc-500">Tap <span className="inline-block mx-1 font-bold">Share</span> and <span className="font-bold">Add to Home Screen</span></p>;
        }
        if (deferredPrompt) {
            return (
                <button onClick={handleInstallParams} className={className}>
                    <Download size={14} /> Install
                </button>
            );
        }
        return null;
    };

    const getTitle = () => mode === 'push' ? 'Enable Notifications' : 'Install App';
    const getDescription = () => mode === 'push' ? 'Get order updates and offers.' : 'Fast loading, offline shopping, and exclusive deals.';

    // --- Template Styles ---
    const renderStyle = () => {
        switch (config.style) {
            case 'style2':
                // Floating Pill
                return (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white rounded-full p-2 pr-6 shadow-2xl flex items-center gap-4 z-[9999] whitespace-nowrap">
                        <button onClick={handleDismiss} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
                            <X size={14} />
                        </button>
                        <span className="text-sm font-semibold">{getTitle()}</span>
                        {renderInstallButton("bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2")}
                    </motion.div>
                );
            case 'style3':
                // Classic Bottom Banner
                return (
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4 z-[9999] flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3">
                            <AppIcon />
                            <div>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Vibe Gadgets App</h4>
                                <p className="text-[10px] text-zinc-500">{getDescription()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                           {renderInstallButton("bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2")}
                           <button onClick={handleDismiss} className="text-zinc-400 p-1"><X size={16}/></button>
                        </div>
                    </motion.div>
                );
            case 'style4':
                // FAB
                return (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="fixed bottom-20 right-4 z-[9999] flex flex-col items-end gap-2">
                         <button onClick={handleDismiss} className="bg-white dark:bg-zinc-800 p-1 rounded-full shadow border border-zinc-200 dark:border-zinc-700"><X size={12} className="text-zinc-500"/></button>
                         <button onClick={handleInstallParams} className="bg-black text-white p-4 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden group">
                           <Download size={24} />
                           <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out pl-0 group-hover:pl-2 font-semibold">{getTitle()}</span>
                         </button>
                         {isIos && !deferredPrompt && mode !== 'push' && <div className="bg-black text-white text-[10px] p-2 rounded-lg max-w-[120px] text-center">Tap Share {'->'} Add to Home Screen</div>}
                    </motion.div>
                );
            case 'style5':
                // Top Notification Bar
                return (
                    <motion.div initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} className="fixed top-0 left-0 right-0 bg-indigo-600 text-white p-3 z-[9999] flex items-center justify-between pt-safe">
                        <div className="flex items-center gap-3">
                            <Smartphone size={18} />
                            <span className="text-xs font-medium">{getDescription()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           {renderInstallButton("bg-white text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1")}
                           <button onClick={handleDismiss}><X size={16} className="text-indigo-200"/></button>
                        </div>
                    </motion.div>
                );
            case 'style6':
                // Full Screen Bottom Sheet
                return (
                    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl p-6 relative">
                            <button onClick={handleDismiss} className="absolute top-4 right-4 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"><X size={16} className="text-zinc-500"/></button>
                            <div className="flex flex-col items-center text-center mt-4">
                                <div className="scale-150 mb-6"><AppIcon /></div>
                                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">{mode==='push'?'Turn on Notifications':'Experience Vibe Gadgets'}</h3>
                                <p className="text-sm text-zinc-500 mb-8 px-4">{getDescription()}</p>
                                {renderInstallButton("w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2")}
                            </div>
                        </motion.div>
                    </div>
                );
            case 'style7':
                // Minimalist text
                return (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-full shadow-lg z-[9999] flex items-center gap-3">
                       <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{getTitle()}</span>
                       {renderInstallButton("text-xs font-bold text-blue-600 dark:text-blue-400 underline flex gap-1 items-center")}
                       <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700"></div>
                       <button onClick={handleDismiss} className="text-zinc-400"><X size={12}/></button>
                   </motion.div>
                );
            case 'style8':
                // Neon Glowing
                return (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed bottom-20 mx-4 md:right-6 md:left-auto md:w-80 p-[2px] rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 z-[9999]">
                        <div className="bg-black p-4 rounded-[14px] flex items-center gap-3 h-full">
                            <AppIcon />
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm">{getTitle()}</h4>
                                <p className="text-zinc-400 text-[10px]">Tap to {mode==='push'?'enable':'install'} now</p>
                            </div>
                            {renderInstallButton("bg-white text-black px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1")}
                            <button onClick={handleDismiss} className="text-zinc-500 rounded p-1"><X size={14}/></button>
                        </div>
                    </motion.div>
                );
            case 'style9':
                // Glassmorphism
                return (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="fixed bottom-24 right-4 left-4 md:left-auto md:w-96 bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 p-5 rounded-3xl shadow-2xl z-[9999]">
                        <button onClick={handleDismiss} className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                        <div className="flex gap-4">
                            <div className="shrink-0 shadow-lg rounded-xl"><AppIcon /></div>
                            <div>
                                <h3 className="font-semibold text-black dark:text-white text-base">{getTitle()}</h3>
                                <p className="text-xs text-zinc-800 dark:text-zinc-300 mt-1 mb-3">{getDescription()}</p>
                                {renderInstallButton("bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2")}
                            </div>
                        </div>
                    </motion.div>
                );
            case 'style10':
                // Tech border
                return (
                    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="fixed bottom-24 left-4 bg-zinc-950 border-l-4 border-emerald-500 p-4 rounded shadow-2xl z-[9999] w-72">
                         <button onClick={handleDismiss} className="absolute top-2 right-2 text-zinc-600 hover:text-white"><X size={14}/></button>
                         <h4 className="font-mono text-emerald-500 text-xs mb-2">{'// SYSTEM.APP_' + (mode==='push'?'NOTIFY':'INSTALL')}</h4>
                         <p className="text-zinc-400 text-xs font-mono mb-4">Would you like to enable the {mode==='push'?'notifications':'client'}?</p>
                         {renderInstallButton("w-full border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black py-2 text-xs font-mono transition-colors flex justify-center items-center gap-2")}
                    </motion.div>
                );
            case 'style1':
            default:
                // Default Compact Mobile Card
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-700 p-4 z-[9999]"
                    >
                        <button onClick={handleDismiss} className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <X size={16} />
                        </button>
                        <div className="flex items-start gap-4">
                            <AppIcon />
                            <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{getTitle()}</h4>
                                <p className="text-xs text-zinc-500 mb-3">{getDescription()}</p>
                                {renderInstallButton("bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2")}
                            </div>
                        </div>
                    </motion.div>
                );
        }
    };

    return (
        <AnimatePresence>
            {showInstall && renderStyle()}
        </AnimatePresence>
    );
};
