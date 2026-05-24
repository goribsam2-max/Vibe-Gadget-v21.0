import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export type MascotState = 'idle' | 'name-empty' | 'name-typed' | 'email' | 'password' | 'success';

interface VibeMascotProps {
  state: MascotState;
  showPassword?: boolean;
}

export const VibeMascot: React.FC<VibeMascotProps> = ({ state, showPassword }) => {
  const [isClapping, setIsClapping] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state === 'email') {
      interval = setInterval(() => setIsClapping(p => !p), 150);
    } else {
      setIsClapping(false);
    }
    return () => clearInterval(interval);
  }, [state]);

  const activeState = state === 'password' && showPassword ? 'password-peek' : state;

  const headVariants = {
    idle: { y: [5, 10, 5], transition: { repeat: Infinity, duration: 2 } },
    'name-empty': { y: [0, 2, 0], transition: { repeat: Infinity, duration: 3 } },
    'name-typed': { y: [0, -3, 0], transition: { repeat: Infinity, duration: 1.5 } },
    email: { y: [0, 6, 0], transition: { repeat: Infinity, duration: 0.3 } },
    password: { y: 2, rotate: 0 }, 
    'password-peek': { y: -2, rotate: -5 }, 
    success: { y: [0, -25, 0], transition: { repeat: Infinity, duration: 0.6 } } 
  };

  const earL = {
    idle: { rotate: -45, y: 20 },
    'name-empty': { rotate: -15, y: 5 },
    'name-typed': { rotate: 5, y: 0 },
    email: { rotate: 20, y: -5 },
    password: { rotate: -30, y: 15 },
    'password-peek': { rotate: -5, y: 0 },
    success: { rotate: 25, y: -5 }
  };

  const earR = {
    idle: { rotate: 45, y: 20 },
    'name-empty': { rotate: 15, y: 5 },
    'name-typed': { rotate: -5, y: 0 },
    email: { rotate: -20, y: -5 },
    password: { rotate: 30, y: 15 },
    'password-peek': { rotate: 30, y: 15 },
    success: { rotate: -25, y: -5 }
  };

  const eyeL = {
    idle: { scaleY: 0.1, y: 5, opacity: 1 },
    'name-empty': { scaleY: 0.8, y: 0, opacity: 1 },
    'name-typed': { scaleY: 1.1, y: 0, opacity: 1 },
    email: { scaleY: 1.3, y: 0, opacity: 1 },
    password: { scaleY: 0.1, y: 0, opacity: 0 },
    'password-peek': { scaleY: 1.2, y: -2, x: 5, opacity: 1 },
    success: { scaleY: 1, y: 0, opacity: 1 }
  };

  const eyeR = {
    idle: { scaleY: 0.1, y: 5, opacity: 1 },
    'name-empty': { scaleY: 0.8, y: 0, opacity: 1 },
    'name-typed': { scaleY: 1.1, y: 0, opacity: 1 },
    email: { scaleY: 1.3, y: 0, opacity: 1 },
    password: { scaleY: 0.1, y: 0, opacity: 0 },
    'password-peek': { scaleY: 0.1, y: 0, opacity: 0 },
    success: { scaleY: 1, y: 0, opacity: 1 }
  };

  const pupil = {
    idle: { y: 2, scale: 0.8 },
    'name-empty': { y: -2, scale: 1 },
    'name-typed': { y: -6, scale: 1.1 },
    email: { y: -3, scale: 1.2 },
    password: { y: 0, scale: 1 },
    'password-peek': { y: 2, x: 3, scale: 1 },
    success: { y: -4, scale: 1.1 }
  };

  const mouth = {
    idle: { d: "M 85 135 Q 100 120 115 135", y: 2 },
    'name-empty': { d: "M 90 126 Q 100 124 110 126", y: 0 },
    'name-typed': { d: "M 85 118 Q 100 142 115 118", y: 0 },
    email: { d: "M 80 115 Q 100 155 120 115", y: 0 },
    password: { d: "M 96 122 Q 100 125 104 122", y: 0 },
    'password-peek': { d: "M 90 120 Q 100 126 110 118", y: 0 },
    success: { d: "M 85 118 Q 100 145 115 118", y: 0 }
  };

  const pawL = {
    idle: { x: 55, y: 160, rotate: 5, scale: 1 },
    'name-empty': { x: 50, y: 160, rotate: -5, scale: 1 },
    'name-typed': { x: 55, y: 155, rotate: 15, scale: 1 },
    email: { x: 80, y: 140, rotate: 40, scale: 1.1 },
    emailClap: { x: 95, y: 140, rotate: 20, scale: 1.1 },
    password: { x: 65, y: 95, rotate: 15, scale: 1.35 },
    'password-peek': { x: 30, y: 120, rotate: -20, scale: 1.1 },
    success: { x: 35, y: 70, rotate: -30, scale: 1.2 }
  };

  const pawR = {
    idle: { x: 145, y: 160, rotate: -5, scale: 1 },
    'name-empty': { x: 150, y: 160, rotate: 5, scale: 1 },
    'name-typed': { x: 145, y: 155, rotate: -15, scale: 1 },
    email: { x: 120, y: 140, rotate: -40, scale: 1.1 },
    emailClap: { x: 105, y: 140, rotate: -20, scale: 1.1 },
    password: { x: 135, y: 95, rotate: -15, scale: 1.35 },
    'password-peek': { x: 140, y: 90, rotate: -35, scale: 1.2 },
    success: { x: 165, y: 70, rotate: 30, scale: 1.2 }
  };

  const footL = {
    idle: { y: 0, x: 0, rotate: 5 },
    success: { y: [-5, 5, -5], rotate: -15, transition: { repeat: Infinity, duration: 0.6 } },
    default: { y: 0, x: 0, rotate: 0 }
  };

  const footR = {
    idle: { y: 0, x: 0, rotate: -5 },
    success: { y: [-5, 5, -5], rotate: 15, transition: { repeat: Infinity, duration: 0.6 } },
    default: { y: 0, x: 0, rotate: 0 }
  };

  const currentLeftPaw = activeState === 'email' ? (isClapping ? 'emailClap' : 'email') : activeState;
  const currentRightPaw = activeState === 'email' ? (isClapping ? 'emailClap' : 'email') : activeState;

  const getFootAnim = () => activeState === 'success' ? 'success' : activeState === 'idle' ? 'idle' : 'default';

  return (
    <div className="w-full flex justify-center mt-2 -mb-8 relative z-10 pointer-events-none select-none">
      <motion.svg width="180" height="180" viewBox="0 0 200 200" className="overflow-visible drop-shadow-2xl">
        <defs>
          <radialGradient id="headGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff2e5" />
            <stop offset="20%" stopColor="#ffb973" />
            <stop offset="70%" stopColor="#f57c00" />
            <stop offset="100%" stopColor="#c56000" />
          </radialGradient>
          
          <radialGradient id="pawGrad" cx="40%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#ffe0b2" />
            <stop offset="50%" stopColor="#fb8c00" />
            <stop offset="100%" stopColor="#e65100" />
          </radialGradient>

          <linearGradient id="earInner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f48fb1" />
            <stop offset="100%" stopColor="#ad1457" />
          </linearGradient>

          <radialGradient id="eyeGloss" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <filter id="shadowHeavy" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="15" stdDeviation="12" floodColor="#000" floodOpacity="0.2" />
          </filter>

          <filter id="innerShadow">
            <feComponentTransfer in="SourceAlpha"><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feOffset dx="-5" dy="-5" />
            <feComposite operator="arithmetic" k2="-1" k3="1" result="shadowDiff" in2="SourceAlpha" />
            <feFlood floodColor="#ffffff" floodOpacity="0.6" />
            <feComposite operator="in" in2="shadowDiff" />
            <feComposite operator="over" in2="SourceGraphic" />
          </filter>
        </defs>

        <path d="M 50 120 Q 100 90 150 120 L 160 190 Q 100 200 40 190 Z" fill="url(#headGrad)" filter="url(#shadowHeavy)" />

        <motion.g animate={getFootAnim()} variants={footL} transition={{ type: "spring" }}>
          <ellipse cx="65" cy="190" rx="16" ry="12" fill="url(#pawGrad)" filter="drop-shadow(0 4px 4px rgba(0,0,0,0.4))" />
          <circle cx="58" cy="192" r="3" fill="#f48fb1" opacity="0.8" />
          <circle cx="65" cy="194" r="3.5" fill="#f48fb1" opacity="0.8" />
          <circle cx="72" cy="192" r="3" fill="#f48fb1" opacity="0.8" />
        </motion.g>

        <motion.g animate={getFootAnim()} variants={footR} transition={{ type: "spring" }}>
          <ellipse cx="135" cy="190" rx="16" ry="12" fill="url(#pawGrad)" filter="drop-shadow(0 4px 4px rgba(0,0,0,0.4))" />
          <circle cx="128" cy="192" r="3" fill="#f48fb1" opacity="0.8" />
          <circle cx="135" cy="194" r="3.5" fill="#f48fb1" opacity="0.8" />
          <circle cx="142" cy="192" r="3" fill="#f48fb1" opacity="0.8" />
        </motion.g>

        <motion.g animate={activeState} variants={headVariants}>
          <motion.g style={{ transformOrigin: '50px 60px' }} variants={earL}>
            <path d="M 35 85 Q 0 -5 75 35 Z" fill="url(#headGrad)" filter="drop-shadow(2px 4px 4px rgba(0,0,0,0.2))" />
            <path d="M 42 75 Q 15 15 70 42 Z" fill="url(#earInner)" />
          </motion.g>

          <motion.g style={{ transformOrigin: '150px 60px' }} variants={earR}>
            <path d="M 165 85 Q 200 -5 125 35 Z" fill="url(#headGrad)" filter="drop-shadow(-2px 4px 4px rgba(0,0,0,0.2))" />
            <path d="M 158 75 Q 185 15 130 42 Z" fill="url(#earInner)" />
          </motion.g>

          <circle cx="100" cy="100" r="78" fill="url(#headGrad)" filter="url(#innerShadow)" />
          
          <circle cx="45" cy="115" r="16" fill="#f48fb1" opacity="0.5" filter="blur(5px)" />
          <circle cx="155" cy="115" r="16" fill="#f48fb1" opacity="0.5" filter="blur(5px)" />

          <motion.g variants={eyeL} style={{ transformOrigin: '65px 95px' }}>
            <circle cx="65" cy="95" r="18" fill="#1f140d" />
            <circle cx="65" cy="95" r="18" fill="url(#eyeGloss)" />
            <motion.g variants={pupil}>
              <circle cx="60" cy="86" r="6" fill="#ffffff" filter="blur(0.5px)" />
              <circle cx="72" cy="102" r="2.5" fill="#ffffff" />
            </motion.g>
          </motion.g>

          <motion.g variants={eyeR} style={{ transformOrigin: '135px 95px' }}>
            <circle cx="135" cy="95" r="18" fill="#1f140d" />
            <circle cx="135" cy="95" r="18" fill="url(#eyeGloss)" />
            <motion.g variants={pupil}>
              <circle cx="130" cy="86" r="6" fill="#ffffff" filter="blur(0.5px)" />
              <circle cx="142" cy="102" r="2.5" fill="#ffffff" />
            </motion.g>
          </motion.g>

          {activeState === 'idle' && (
            <g>
              <motion.path 
                 d="M 60 105 Q 65 115 60 120 Q 55 115 60 105" 
                 fill="#4fc3f7" opacity="0.8"
                 animate={{ opacity: [0, 1, 0], y: [0, 20, 30], scale: [0.5, 1.2, 0] }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "easeIn" }}
              />
              <motion.path 
                 d="M 140 105 Q 145 115 140 120 Q 135 115 140 105" 
                 fill="#4fc3f7" opacity="0.8"
                 animate={{ opacity: [0, 1, 0], y: [0, 20, 30], scale: [0.5, 1.2, 0] }}
                 transition={{ repeat: Infinity, duration: 1.5, delay: 0.7, ease: "easeIn" }}
              />
            </g>
          )}

          <circle cx="100" cy="124" r="24" fill="#ffeecc" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.1)) blur(0.5px)" />
          
          <path d="M 92 116 Q 100 120 108 116 L 100 126 Z" fill="#ec407a" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.2))" />

          <motion.path
            d="M 85 118 Q 100 150 115 118 Z"
            fill="#c2185b"
            initial={{ scale: 0 }}
            animate={['name-typed', 'email', 'success'].includes(activeState) ? { scale: 1 } : { scale: 0 }}
            style={{ transformOrigin: '100px 120px' }}
          />
          {['name-typed', 'email', 'success'].includes(activeState) && (
            <motion.path d="M 90 135 Q 100 125 110 135 Z" fill="#f48fb1" />
          )}

          <motion.path
            fill="none"
            stroke="#1f140d"
            strokeWidth="3.5"
            strokeLinecap="round"
            variants={mouth}
            animate={activeState}
          />
        </motion.g>

        <motion.g animate={currentLeftPaw} variants={pawL} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <circle cx="0" cy="0" r="24" fill="url(#pawGrad)" filter="drop-shadow(0px 6px 8px rgba(0,0,0,0.4))" />
          <circle cx="-10" cy="-8" r="5" fill="#f48fb1" opacity="0.85" />
          <circle cx="0" cy="-14" r="5" fill="#f48fb1" opacity="0.85" />
          <circle cx="10" cy="-8" r="5" fill="#f48fb1" opacity="0.85" />
          <circle cx="0" cy="4" r="9" fill="#f48fb1" opacity="0.85" />
        </motion.g>

        <motion.g animate={currentRightPaw} variants={pawR} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <circle cx="0" cy="0" r="24" fill="url(#pawGrad)" filter="drop-shadow(0px 6px 8px rgba(0,0,0,0.4))" />
          <circle cx="-10" cy="-8" r="5" fill="#f48fb1" opacity="0.85" />
          <circle cx="0" cy="-14" r="5" fill="#f48fb1" opacity="0.85" />
          <circle cx="10" cy="-8" r="5" fill="#f48fb1" opacity="0.85" />
          <circle cx="0" cy="4" r="9" fill="#f48fb1" opacity="0.85" />
        </motion.g>

      </motion.svg>
    </div>
  );
};
