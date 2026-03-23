import React from 'react';
import { motion } from 'motion/react';

interface RobotProps {
  color: string;
  direction: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
  commandCount: number;
}

export const Robot: React.FC<RobotProps> = ({ color, direction, commandCount }) => {
  const rotation = {
    NORTH: -90,
    EAST: 0,
    SOUTH: 90,
    WEST: 180,
  }[direction];

  return (
    <motion.div
      animate={{ 
        rotate: rotation,
        y: [0, -10, 0]
      }}
      key={commandCount}
      transition={{ 
        rotate: { type: 'spring', stiffness: 260, damping: 20 },
        y: { duration: 0.3, ease: "easeOut" }
      }}
      className="relative w-full h-full flex items-center justify-center"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full robot-shadow"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antenna */}
        <motion.line 
          x1="50" y1="25" x2="50" y2="10" 
          stroke={color} strokeWidth="4" strokeLinecap="round" 
          animate={{ strokeWidth: [4, 6, 4] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <motion.circle 
          cx="50" cy="8" r="4" 
          fill={color} 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Body 3D Effect */}
        <rect x="20" y="30" width="60" height="50" rx="12" fill={color} opacity="0.8" />
        <rect x="20" y="25" width="60" height="50" rx="12" fill={color} />
        
        {/* Screen/Face */}
        <rect x="28" y="33" width="44" height="25" rx="6" fill="#1e293b" />
        
        {/* Eyes */}
        <motion.g
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          <circle cx="40" cy="45" r="4" fill="#38bdf8" />
          <circle cx="60" cy="45" r="4" fill="#38bdf8" />
          <circle cx="40" cy="45" r="1.5" fill="white" />
          <circle cx="60" cy="45" r="1.5" fill="white" />
        </motion.g>

        {/* Detail */}
        <rect x="40" y="65" width="20" height="4" rx="2" fill="white" opacity="0.2" />
      </svg>
      {/* Shadow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/10 rounded-full blur-sm" />
    </motion.div>
  );
};
