import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showRestored, setShowRestored] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            setIsDismissed(false);
            setShowRestored(false);
        };
        const handleOnline = () => {
            setIsOffline(false);
            setShowRestored(true);
            setTimeout(() => setShowRestored(false), 3000);
        };

        const handleForceOfflinePop = () => {
             setIsOffline(true);
             setIsDismissed(false);
             setShowRestored(false);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener('showNetworkError', handleForceOfflinePop);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('showNetworkError', handleForceOfflinePop);
        };
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            if (navigator.onLine) {
                setIsOffline(false);
                setShowRestored(true);
                setTimeout(() => setShowRestored(false), 3000);
            } else {
                setIsRefreshing(false);
            }
        }, 800);
    };

    return (
        <AnimatePresence>
            {(isOffline && !isDismissed) && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 z-[100000]"
                >
                    <button onClick={() => setIsDismissed(true)} className="absolute top-2 right-2 text-zinc-400 hover:text-white p-2">
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                            <WifiOff className="text-red-500" size={24} />
                        </div>
                        <div className="flex-1 pr-4">
                            <h3 className="text-white font-semibold text-lg mb-1">No Internet Connection</h3>
                            <p className="text-zinc-400 text-sm mb-4">You are currently offline. Some features like placing orders require an active internet connection.</p>
                            <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="w-full bg-white text-black py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                                {isRefreshing ? "Checking..." : "Refresh Network"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {showRestored && !isOffline && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-safe pt-4 md:top-6 left-0 right-0 flex justify-center z-[100000] pointer-events-none px-4"
                >
                    <div className="bg-emerald-500 text-white px-5 py-3 rounded-full shadow-lg font-bold flex items-center gap-2">
                        <Wifi size={18} />
                        Network Restored
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
