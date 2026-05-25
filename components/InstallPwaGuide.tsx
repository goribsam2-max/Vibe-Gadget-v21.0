import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, ArrowDown, ExternalLink } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

import { subscribeToWebPush } from '../lib/push';

export const InstallPwaGuide: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [config, setConfig] = useState(() => {
        try {
           const cached = localStorage.getItem('pwa_popup_config');
           return cached ? JSON.parse(cached) : { style: 'style1', icon: '' };
        } catch(e) {
           return { style: 'style1', icon: '' };
        }
    });
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [mode, setMode] = useState<'install' | 'push' | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "platform"), (docSnap) => {
            if (docSnap.exists()) {
                const newConfig = {
                    style: docSnap.data().pwaPopupStyle || 'style1',
                    icon: docSnap.data().pwaPopupIcon || ''
                };
                setConfig(newConfig);
                localStorage.setItem('pwa_popup_config', JSON.stringify(newConfig));
            }
            setIsConfigLoaded(true);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setIsIos(true);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // If the browser fires beforeinstallprompt, it means the app is NOT installed.
            // Even if they dismissed it before, we clear it and eventually show it if they requested it to always show. 
            // Wait, if they just dismissed it (X), it should stay dismissed.
            // But the user said: "se remove korleo refresh dile abr dekhabe download dile open dekhabei close dile close hoye jabe r dekhabe na"
            // Translation: "If they remove it, on refresh it will show again. If they click download it shows open. If they close it (X), it will close and not show again."
            // So if they close it, it's dismissed. If they install it, we don't know it was uninstalled until beforeinstallprompt fires AGAIN on next visit.
            // If they installed it, pwa_installed is true. If they dismissed it, pwa_dismissed is true.
            
            if (localStorage.getItem('pwa_installed') === 'true') {
                // They previously installed it, but now beforeinstallprompt fired! So they MUST have uninstalled it.
                // Reset state so it shows again!
                localStorage.removeItem('pwa_installed');
                localStorage.removeItem('pwa_dismissed');
                setIsInstalled(false);
                setMode('install');
                setShowInstall(true);
            } else if (localStorage.getItem('pwa_dismissed') !== 'true') {
                setIsInstalled(false);
                setMode('install');
                setShowInstall(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        
        if (isStandalone) {
             // In standalone mode, they already installed it
             // Ask for push notification if not enabled
             if ('Notification' in window && Notification.permission === 'default' && localStorage.getItem('push_dismissed') !== 'true') {
                 setTimeout(() => {
                     setMode('push');
                     setShowInstall(true);
                 }, 3000);
             } else {
                 setShowInstall(false);
                 setMode(null);
             }
        } else if (localStorage.getItem('pwa_dismissed') !== 'true') {
             // Not standalone. Show prompt after a delay, regardless of iOS. On android, relies on deferredPrompt or manual
             setTimeout(() => {
                 setMode('install');
                 setShowInstall(true);
             }, 3000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const simulateDownload = (duration: number) => {
        setIsDownloading(true);
        setDownloadProgress(0);
        const steps = 30;
        const interval = duration / steps;
        let currentProgress = 0;
        
        const timer = setInterval(() => {
            currentProgress += 100 / steps;
            if (currentProgress >= 100) {
                clearInterval(timer);
                setDownloadProgress(null);
                setIsDownloading(false);
                setIsInstalled(true);
                localStorage.setItem('pwa_installed', 'true');
                if (mode !== 'push') {
                    setTimeout(() => setShowInstall(false), 2500);
                }
            } else {
                setDownloadProgress(Math.floor(currentProgress));
            }
        }, interval);
    };

    const handleInstallParams = async () => {
        if (mode === 'push') {
            await subscribeToWebPush();
            setShowInstall(false);
            return;
        }

        // Handle Installation Mode
        if (isInstalled || isDownloading) {
            if (isInstalled && !isDownloading) {
                setShowInstall(false);
            }
            return;
        }

        if (isIos && !deferredPrompt) {
            // Can only show hint for iOS
            return;
        }

        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    localStorage.setItem('pwa_dismissed', 'true');
                    simulateDownload(2500);
                }
            } catch (err) {
                console.error("Prompt failed", err);
                simulateDownload(2000); 
            }
        } else {
            // Fallback for missing deferredPrompt on non-iOS
            simulateDownload(2500);
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

    if (!isConfigLoaded || !showInstall) return null;

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
                    Enable
                </button>
            );
        }
        
        let btnText: React.ReactNode = "Download";
        if (isIos) btnText = "Get";
        
        if (isDownloading && downloadProgress !== null) {
            btnText = (
                <div className="flex items-center gap-2 relative z-10 w-full justify-center">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-mono text-[10px] sm:text-xs">{downloadProgress}%</span>
                </div>
            );
        } else if (isInstalled) {
            btnText = "Open";
        }

        if (isIos && !deferredPrompt && !isDownloading && !isInstalled) {
            return <p className="text-xs text-zinc-500 whitespace-nowrap">Tap <span className="inline-block mx-1 font-bold">Share</span> {'->'} <span className="font-bold">Add to Home Screen</span></p>;
        }
        
        return (
            <button 
                onClick={isInstalled ? () => setShowInstall(false) : handleInstallParams} 
                className={`${className} relative overflow-hidden transition-all duration-300 min-w-[90px] justify-center`}
                disabled={isDownloading}
            >
                {isDownloading && downloadProgress !== null && (
                    <div 
                        className="absolute left-0 top-0 bottom-0 bg-black/10 dark:bg-white/20 transition-all duration-200"
                        style={{ width: `${downloadProgress}%` }}
                    />
                )}
                {btnText}
            </button>
        );
    };

    const getTitle = () => mode === 'push' ? 'Enable Notifications' : 'Install App';
    const getDescription = () => mode === 'push' ? 'Get order updates and offers.' : 'Fast loading, offline shopping, and exclusive deals.';

    // --- Template Styles ---
    const renderStyle = () => {
        switch (config.style) {
            case 'style2':
                // Floating Pill
                return (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white rounded-full p-2 pr-6 shadow-2xl flex items-center gap-4 z-[99999] whitespace-nowrap">
                        <button onClick={handleDismiss} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
                            <X size={14} />
                        </button>
                        <span className="text-sm font-semibold">{getTitle()}</span>
                        {renderInstallButton("bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2")}
                    </motion.div>
                );
            case 'style3':
                // Classic Bottom Banner -> sits exactly below bottom nav visually
                return (
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4 pb-safe z-[90] flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3">
                            <AppIcon />
                            <div>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Vibe Gadgets App</h4>
                                <p className="text-[10px] text-zinc-500">{getDescription()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                           {renderInstallButton("bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2")}
                           <button onClick={handleDismiss} className="text-zinc-400 p-1"><X size={16}/></button>
                        </div>
                    </motion.div>
                );
            case 'style4':
                // FAB
                return (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="fixed bottom-[80px] md:bottom-6 right-4 z-[99999] flex flex-col items-end gap-2">
                         <button onClick={handleDismiss} className="bg-white dark:bg-zinc-800 p-1 rounded-full shadow border border-zinc-200 dark:border-zinc-700"><X size={12} className="text-zinc-500"/></button>
                         <button onClick={isInstalled ? () => setShowInstall(false) : handleInstallParams} disabled={isDownloading} className="bg-black text-white p-4 rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden group">
                           {isDownloading ? <span className="animate-pulse px-2 text-xs font-bold">...</span> : <Download size={24} />}
                           <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out pl-0 group-hover:pl-2 font-semibold">
                               {isInstalled ? 'Open' : (isIos ? 'Get' : 'Download')}
                           </span>
                         </button>
                         {isIos && !deferredPrompt && mode !== 'push' && <div className="bg-black text-white text-[10px] p-2 rounded-lg max-w-[120px] text-center">Tap Share {'->'} Add to Home Screen</div>}
                    </motion.div>
                );
            case 'style5':
                // Top Notification Bar
                return (
                    <motion.div initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} className="fixed top-14 left-0 right-0 bg-indigo-600 text-white p-3 z-[90] flex items-center justify-between pt-safe">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6"><AppIcon /></div>
                            <span className="text-xs font-medium">{getDescription()}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                           {renderInstallButton("bg-white text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1")}
                           <button onClick={handleDismiss}><X size={16} className="text-indigo-200"/></button>
                        </div>
                    </motion.div>
                );
            case 'style6':
                // Full Screen Bottom Sheet
                return (
                    <div className="fixed inset-0 z-[100005] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
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
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-[80px] md:bottom-24 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-full shadow-lg z-[100005] flex items-center gap-3">
                       <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{getTitle()}</span>
                       {renderInstallButton("text-xs font-bold text-blue-600 dark:text-blue-400 underline flex gap-1 items-center")}
                       <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700"></div>
                       <button onClick={handleDismiss} className="text-zinc-400"><X size={12}/></button>
                   </motion.div>
                );
            case 'style8':
                // Neon Glowing
                return (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed bottom-[80px] md:bottom-20 mx-4 md:right-6 md:left-auto md:w-80 p-[2px] rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 z-[100005]">
                        <div className="bg-black p-4 rounded-[14px] flex items-center gap-3 h-full">
                            <AppIcon />
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis">{getTitle()}</h4>
                                <p className="text-zinc-400 text-[10px]">Tap to {mode==='push'?'enable':'install'} now</p>
                            </div>
                            {renderInstallButton("bg-white text-black px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 shrink-0")}
                            <button onClick={handleDismiss} className="text-zinc-500 rounded p-1"><X size={14}/></button>
                        </div>
                    </motion.div>
                );
            case 'style9':
                // Glassmorphism
                return (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="fixed bottom-[80px] md:bottom-24 right-4 left-4 md:left-auto md:w-96 bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 p-5 rounded-3xl shadow-2xl z-[100005]">
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
                    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="fixed bottom-[80px] md:bottom-24 left-4 bg-zinc-950 border-l-4 border-emerald-500 p-4 rounded shadow-2xl z-[100005] w-72">
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
                        className="fixed bottom-[80px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-700 p-4 z-[100005]"
                    >
                        <button onClick={handleDismiss} className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="shrink-0 flex items-center justify-center">
                                <AppIcon />
                            </div>
                            <div className="flex-1 pr-2">
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
