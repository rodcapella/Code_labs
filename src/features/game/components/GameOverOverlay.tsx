import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface GameOverOverlayProps {
  title: string;
  description: string;
  retryLabel: string;
  backLabel: string;
  onRetry: () => void;
  onBack: () => void;
}

/** Ecrã de fim de tentativa: limite de erros atingido. */
export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  title, description, retryLabel, backLabel, onRetry, onBack,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="absolute inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-6"
  >
    <div className="bg-brand-navy p-8 rounded-3xl shadow-2xl border border-white/10 text-center max-w-sm w-full">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h3 className="text-2xl font-bold text-brand-ice mb-2">{title}</h3>
      <p className="text-brand-ice/80 mb-8">{description}</p>
      <div className="flex flex-col gap-3">
        <button
          onClick={onRetry}
          className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue transition-all shadow-lg shadow-brand-blue/20"
        >
          {retryLabel}
        </button>
        <button
          onClick={onBack}
          className="w-full py-4 bg-brand-navy text-brand-ice/85 font-bold rounded-2xl hover:bg-white/10 transition-all"
        >
          {backLabel}
        </button>
      </div>
    </div>
  </motion.div>
);
