import React from 'react';
import { motion } from 'motion/react';

interface BoxProps {
  color: string;
  /** Número de ordem de recolha (só em níveis com ordem obrigatória). */
  order?: number;
  /** É a próxima caixa a apanhar: destaca-se com um anel. */
  isNext?: boolean;
}

export const Box: React.FC<BoxProps> = ({ color, order, isNext = false }) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 45 }}
      className={`w-full h-full flex items-center justify-center p-2 ${isNext ? "rounded-xl ring-4 ring-amber-300 animate-pulse" : ""}`}
    >
      <div 
        className="w-full h-full rounded-lg shadow-lg border-2 border-white/10 relative overflow-hidden crate-texture"
        style={{ backgroundColor: color }}
        aria-label={order !== undefined ? `caixa ${order}` : 'caixa'}
      >
        {order !== undefined && (
          // Número grande: a ordem lê-se sem depender da cor (modo para daltónicos).
          <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-brand-ink drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
            {order}
          </span>
        )}
        {/* Crate Details */}
        <div className="absolute inset-2 border border-white/10 rounded-sm" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-brand-ink/5" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-1 bg-brand-ink/5" />
        
        {/* Shine */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-brand-navy/20 rounded-full" />
      </div>
    </motion.div>
  );
};
