import React from 'react';
import { motion } from 'motion/react';

const COLORS = ['#0A84FF', '#5CD4F2', '#7A5CFC', '#E6F1FF', '#34D399'];
const PARTICLES = 36;

/**
 * Animação de nível concluído: anel de luz, explosão de partículas da paleta
 * da marca e brilho no centro. Posições determinísticas (sem Math.random),
 * para o componente ser puro. Respeita movimento reduzido via MotionConfig.
 */
export const LevelComplete: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden" aria-hidden="true">
    {/* Anel de luz que se expande */}
    <motion.div
      className="absolute w-40 h-40 rounded-full border-4 border-brand-cyan"
      initial={{ scale: 0.2, opacity: 0.9 }}
      animate={{ scale: 3.2, opacity: 0 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
    />
    <motion.div
      className="absolute w-40 h-40 rounded-full border-2 border-brand-blue"
      initial={{ scale: 0.2, opacity: 0.8 }}
      animate={{ scale: 2.6, opacity: 0 }}
      transition={{ duration: 1.3, ease: 'easeOut', delay: 0.15 }}
    />

    {/* Brilho central */}
    <motion.div
      className="absolute w-64 h-64 rounded-full bg-brand-blue/30 blur-3xl"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: [0.4, 1.2, 1], opacity: [0, 0.9, 0.4] }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    />

    {/* Partículas em explosão */}
    {Array.from({ length: PARTICLES }, (_, i) => {
      const angle = (i / PARTICLES) * Math.PI * 2 + (i % 3) * 0.12;
      const distance = 130 + ((i * 37) % 90);
      const size = 6 + ((i * 13) % 7);
      const color = COLORS[i % COLORS.length];
      return (
        <motion.span
          key={i}
          className="absolute rounded-sm"
          style={{ width: size, height: size, background: color, boxShadow: `0 0 10px ${color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance - 20,
            opacity: [1, 1, 0],
            scale: [0.4, 1.2, 0.6],
            rotate: (i % 2 ? 1 : -1) * 240,
          }}
          transition={{ duration: 1.4 + (i % 4) * 0.1, ease: [0.16, 1, 0.3, 1], delay: (i % 6) * 0.03 }}
        />
      );
    })}
  </div>
);
