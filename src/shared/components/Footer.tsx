import React from 'react';
import { Logo } from './Logo';

interface FooterProps {
  rights: (year: number) => string;
  developedBy: string;
}

/** Rodapé em todas as páginas: copyright, autoria e link para o site da Sapiente AI. */
export const Footer: React.FC<FooterProps> = ({ rights, developedBy }) => (
  <footer className="relative z-10 border-t border-white/10 bg-brand-ink/95 px-6 py-5 text-xs text-brand-ice/75">
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 md:flex-row">
      <p>{rights(new Date().getFullYear())}</p>
      <div className="flex items-center gap-2">
        <span>{developedBy}</span>
        <Logo />
      </div>
    </div>
  </footer>
);
