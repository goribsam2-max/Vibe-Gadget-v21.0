import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "./Icon";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const links = [
    { to: "/", icon: "home", label: "Home" },
    { to: "/wishlist", icon: "heart", label: "Saved" },
    { to: "/cart", icon: "shopping-bag", label: "Cart" },
    { to: "/profile", icon: "user", label: "Profile" },
  ];

  // Hide BottomNav on product detail pages where the custom action bar takes over
  if (location.pathname.startsWith("/product/")) {
    return null;
  }

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 w-full flex justify-center z-[100] pointer-events-none px-4 md:hidden">
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white dark:bg-zinc-900 px-1 py-0.5 flex justify-between items-center rounded-3xl shadow-[0_30px_60px_-10px_rgba(0,30,60,0.2),inset_0_4px_20px_rgba(255,255,255,0.7),inset_0_-4px_20px_rgba(255,255,255,0.2),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-1px_1px_rgba(0,0,0,0.05)] dark:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.6),inset_0_4px_20px_rgba(255,255,255,0.15),inset_0_-4px_20px_rgba(255,255,255,0.05),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.3)] border border-zinc-200 dark:border-zinc-800 pointer-events-auto w-full max-w-[260px] sm:max-w-[300px] relative overflow-hidden"
      >
        {/* Soft volumetric gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-blue-300/10 dark:from-white/5 dark:via-transparent dark:to-blue-500/5 pointer-events-none mix-blend-overlay" />
        
        {/* High-gloss top edge reflection */}
        <div className="absolute inset-x-[10%] top-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent rounded-t-full pointer-events-none" />
        
        {/* Soft inner bottom shadow for thickness */}
        <div className="absolute inset-x-0 bottom-0 h-[6px] bg-gradient-to-b from-transparent to-black/5 dark:to-black/30 pointer-events-none" />

        <div className="relative z-10 flex w-full justify-between items-center">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`relative flex flex-col items-center justify-center flex-1 h-10 w-10 sm:h-11 sm:w-11 rounded-2xl transition-all duration-500 z-10 ${
                  isActive
                    ? "text-[#ea580c] dark:text-[#f87171]"
                    : "text-zinc-600/80 dark:text-zinc-300/80 hover:text-[#ea580c] dark:hover:text-[#f87171]"
                }`}
              >
                <Icon
                  name={link.icon}
                  className={`text-[16px] sm:text-[18px] relative z-20 transition-all duration-300 ${
                    isActive ? "scale-[1.1] drop-shadow-md mb-0.5" : "hover:scale-110 mb-0.5"
                  }`}
                />
                <span className="text-[8px] sm:text-[9px] font-medium leading-none pb-0.5 relative z-20">
                  {link.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-glow"
                    className="absolute inset-[2px] bg-gradient-to-b from-white/80 to-white/20 dark:from-white/20 dark:to-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_12px_rgba(0,0,0,0.3)] -z-10 ring-1 ring-white/30 dark:ring-white/10"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default BottomNav;
