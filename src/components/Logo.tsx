import React from 'react';
import logoUrl from '../assets/sapiente-logo.png';

interface LogoProps {
  className?: string;
}

/** Logótipo Sapiente.AI, com ligação para o site numa nova aba. */
export const Logo: React.FC<LogoProps> = ({ className = '' }) => (
  <a
    href="https://sapienteai.com"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Sapiente.AI (abre sapienteai.com numa nova aba)"
    className={`inline-flex items-center transition-opacity hover:opacity-80 ${className}`}
  >
    <img src={logoUrl} alt="Sapiente.AI" className="h-8 w-auto" />
  </a>
);
