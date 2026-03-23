import React from 'react';
import { motion } from 'motion/react';

interface BoxProps {
  color: string;
}

export const Box: React.FC<BoxProps> = ({ color }) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 45 }}
      className="w-full h-full flex items-center justify-center p-2"
    >
      <div 
        className="w-full h-full rounded-lg shadow-lg border-2 border-black/20 relative overflow-hidden crate-texture"
        style={{ backgroundColor: color }}
      >
        {/* Crate Details */}
        <div className="absolute inset-2 border border-black/10 rounded-sm" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-black/5" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-1 bg-black/5" />
        
        {/* Shine */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-white/20 rounded-full" />
      </div>
    </motion.div>
  );
};
