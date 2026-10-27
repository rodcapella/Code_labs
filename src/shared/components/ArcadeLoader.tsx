import React from 'react';

interface ArcadeLoaderProps {
  /** Texto a piscar, por exemplo "A preparar o nível…". */
  label: string;
  /** Preenche a área do pai (absolute). Por defeito, cobre o pai inteiro. */
  className?: string;
}

const BLOCKS = 10;

/**
 * Ecrã de carregamento estilo arcade: linhas de varrimento de CRT, texto a piscar
 * em fonte pixel e uma fila de blocos que se acendem em sequência.
 * Com movimento reduzido (preferência do sistema), fica estático.
 */
export const ArcadeLoader: React.FC<ArcadeLoaderProps> = ({ label, className = '' }) => (
  <div
    role="status"
    aria-live="polite"
    className={`arcade-loader absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-brand-ink overflow-hidden ${className}`}
  >
    <div className="arcade-scanlines" aria-hidden="true" />

    <p
      className="arcade-blink text-brand-cyan text-sm md:text-base text-center px-6 brand-glow"
      style={{ fontFamily: 'var(--font-arcade)' }}
    >
      {label}
    </p>

    <div className="flex gap-2" aria-hidden="true">
      {Array.from({ length: BLOCKS }, (_, i) => (
        <span
          key={i}
          className="arcade-block w-3 h-3 md:w-4 md:h-4 bg-brand-cyan"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>

    <p
      className="arcade-blink text-brand-ice/60 text-[10px] tracking-widest"
      style={{ fontFamily: 'var(--font-arcade)', animationDelay: '0.5s' }}
      aria-hidden="true"
    >
      INSERT COIN
    </p>
  </div>
);
