import React, { useEffect, useRef } from 'react';

interface LevelIntroModalProps {
  kicker: string;
  title: string;
  body: string[];
  closeLabel: string;
  onClose: () => void;
}

/**
 * Janela centrada, antes de cada nível, com o conceito testado.
 * Fecha com o botão ou com Esc. O foco vai para o botão ao abrir.
 */
export const LevelIntroModal: React.FC<LevelIntroModalProps> = ({ kicker, title, body, closeLabel, onClose }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/85 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-intro-title"
        className="w-full max-w-sm rounded-2xl border border-brand-cyan/40 bg-brand-navy p-6 text-center shadow-2xl"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-cyan">{kicker}</p>
        <h2 id="level-intro-title" className="mt-2 text-xl font-bold text-brand-ice">{title}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-brand-ice/85">
          {body.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <button
          ref={buttonRef}
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-brand-blue py-3 font-bold text-white shadow-lg shadow-brand-blue/20"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
};
