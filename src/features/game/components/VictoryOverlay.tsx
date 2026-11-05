import React from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { LevelComplete } from './LevelComplete';

interface VictoryOverlayProps {
  title: string;
  description: string;
  playAgainLabel: string;
  nextLabel: string;
  onPlayAgain: () => void;
  onNext: () => void;
  /** Bloco opcional entre a descrição e os botões (ex.: nome para o ranking). */
  rankingSlot?: React.ReactNode;
  /** Bloco opcional de partilha (GIF da solução). */
  shareSlot?: React.ReactNode;
}

/** Ecrã de nível concluído, com a animação de celebração. */
export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  title, description, playAgainLabel, nextLabel, onPlayAgain, onNext, rankingSlot, shareSlot,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-6"
  >
    <LevelComplete />
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
      className="relative bg-brand-navy p-8 rounded-3xl shadow-2xl border border-white/10 text-center max-w-sm w-full"
    >
      <motion.div
        initial={{ scale: 0, rotate: -25 }}
        animate={{ scale: [0, 1.25, 1], rotate: [-25, 8, 0] }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
        className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
      >
        <Trophy className="w-10 h-10" />
      </motion.div>
      <h3 className="text-2xl font-bold text-brand-ice mb-2">{title}</h3>
      <p className="text-brand-ice/80 mb-6">{description}</p>
      {rankingSlot}
      {shareSlot && <div className="mt-6">{shareSlot}</div>}
      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={onPlayAgain}
          className="w-full py-4 bg-brand-navy text-brand-ice/85 font-bold rounded-2xl hover:bg-white/10 transition-all"
        >
          {playAgainLabel}
        </button>
        <button
          onClick={onNext}
          className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue transition-all shadow-lg shadow-brand-blue/20"
        >
          {nextLabel}
        </button>
      </div>
    </motion.div>
  </motion.div>
);
