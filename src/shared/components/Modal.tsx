import React, { useEffect, useRef } from 'react';
import { Portal } from './Portal';


interface ModalProps {
  /** Texto pequeno acima do título (ex.: "Nível 3" ou "Erro"). */
  kicker?: string;
  title: string;
  children: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** Cor do destaque do cabeçalho: 'info' (ciano) ou 'alert' (vermelho). */
  tone?: 'info' | 'alert';
}

/**
 * Janela modal centrada, acessível: role=dialog, aria-modal, foco no botão ao abrir,
 * fecha com Esc. Ocupa pouco espaço para caber em ecrãs pequenos.
 */
export const Modal: React.FC<ModalProps> = ({ kicker, title, children, closeLabel, onClose, tone = 'info' }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const accent = tone === 'alert' ? 'border-red-400/50 text-red-300' : 'border-brand-cyan/40 text-brand-cyan';

  return (
    <Portal>
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-ink/85 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full max-w-sm rounded-2xl border bg-brand-navy p-6 text-center shadow-2xl ${accent.split(' ')[0]}`}
      >
        {kicker && <p className={`text-[10px] font-bold uppercase tracking-widest ${accent.split(' ')[1]}`}>{kicker}</p>}
        <h2 id="modal-title" className="mt-2 text-lg font-bold text-brand-ice">{title}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-brand-ice/85">{children}</div>
        <button
          ref={buttonRef}
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-brand-blue py-3 font-bold text-white shadow-lg shadow-brand-blue/20"
        >
          {closeLabel}
        </button>
      </div>
    </div>
    </Portal>
  );
};
