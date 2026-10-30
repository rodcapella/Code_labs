import { createPortal } from 'react-dom';
import React from 'react';

/**
 * Renderiza no <body>, fora de qualquer ancestral com transform/filter.
 * Sem isto, um position:fixed dentro de um elemento animado fica preso a esse elemento
 * e sai do ecrã em telemóveis.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(children, document.body);
