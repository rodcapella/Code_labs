import React from 'react';
import { Position, Box as BoxType, Direction } from '../../../shared/types/game';
import { Robot } from './Robot';
import { Box } from './Box';
import { AnimatePresence, motion } from 'motion/react';

// Geometria do tabuleiro: espaçamento gap-2 (8px) e padding p-4 (16px).
const GAP = 8;
const PAD = 16;
import { Sparkles } from 'lucide-react';

interface GridProps {
  /** Cor da grelha do nível (hex). */
  gridColor: string;
  walls: Position[];
  size: number;
  robotPosition: Position;
  robotDirection: Direction;
  boxes: BoxType[];
  robotColor: string;
  boxColor: string;
  commandCount: number;
  /** Sobe a cada jogada bloqueada: dispara o embate do robô. */
  bumpKey: number;
  /** Parede contra a qual o robô bateu (destacada no tabuleiro). */
  blockedCell: { x: number; y: number } | null;
  /** Descrição textual do tabuleiro para leitores de ecrã. */
  summary: string;
}

export const Grid: React.FC<GridProps> = ({
  bumpKey, blockedCell, summary,
  gridColor,
  walls,
  size,
  robotPosition,
  robotDirection,
  boxes,
  robotColor,
  boxColor,
  commandCount,
}) => {
  // Grelhas grandes usam células menores para caber no ecrã.
  const CELL = size > 8 ? 48 : 64;
  const PITCH = CELL + GAP;

  const onCollectedBox = boxes.some(
    b => b.collected && b.position.x === robotPosition.x && b.position.y === robotPosition.y,
  );

  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells.push({ x, y });
    }
  }

  return (
    <div className="relative perspective-1000 flex items-center justify-center p-12">
      <p className="sr-only" aria-live="polite">{summary}</p>
      <div 
        className="relative grid gap-2 bg-white/10 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-b-8"
        style={{
          ["--grid-accent" as string]: gridColor,
          borderBottomColor: gridColor,
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          transform: 'rotateX(45deg) rotateZ(-45deg)',
          transformStyle: 'preserve-3d',
        } as React.CSSProperties}
      >
        {cells.map((cell) => {
          const boxHere = boxes.find(b => b.position.x === cell.x && b.position.y === cell.y && !b.collected);
          const isWall = walls.some(w => w.x === cell.x && w.y === cell.y);

          return (
            <div
              key={`${cell.x}-${cell.y}`}
              className="rounded-lg grid-cell flex items-center justify-center relative border-b-4"
              style={{ width: CELL, height: CELL, transformStyle: 'preserve-3d' }}
            >
              {isWall && (
                // Parede: bloco elevado e escuro. Não pode ser atravessada.
                <div
                  aria-label="parede"
                  className="absolute inset-0.5 rounded-md bg-brand-ink border-2 border-white/30 shadow-[inset_0_-6px_0_rgba(0,0,0,0.5)] pointer-events-none"
                  style={{ transform: 'translateZ(10px)' }}
                />
              )}
              {/* Floor Pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-brand-ink" />
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-brand-ink" />
              </div>

              <AnimatePresence>
                {boxHere && (
                  <div className="absolute inset-0 z-10" style={{ transform: 'rotateZ(45deg) rotateX(-45deg) translateZ(15px)' }}>
                    <Box color={boxColor} />
                  </div>
                )}
              </AnimatePresence>

            </div>
          );
        })}
        {/* Robô: uma única camada que desliza entre células (mesmo plano 3D do tabuleiro) */}
        <motion.div
          className="absolute z-20 pointer-events-none"
          style={{ width: CELL, height: CELL }}
          initial={false}
          animate={{ left: PAD + robotPosition.x * PITCH, top: PAD + robotPosition.y * PITCH }}
          transition={{ type: 'tween', duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="absolute inset-0" style={{ transform: 'rotateZ(45deg) rotateX(-45deg) translateZ(25px)' }}>
            {/* Embate: o robô treme quando a jogada é bloqueada. A chave muda a cada embate. */}
            <motion.div
              key={bumpKey}
              className="w-full h-full"
              initial={{ x: 0 }}
              animate={{ x: bumpKey > 0 ? [0, -6, 6, -4, 4, 0] : 0 }}
              transition={{ duration: 0.4 }}
            >
              <Robot color={robotColor} direction={robotDirection} commandCount={commandCount} />
            </motion.div>
          </div>
          <AnimatePresence>
            {onCollectedBox && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1.5 }}
                exit={{ opacity: 0, scale: 2 }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: 'rotateZ(45deg) rotateX(-45deg) translateZ(40px)' }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Parede contra a qual a jogada falhou: pisca em vermelho */}
        {blockedCell && (
          <motion.div
            key={`blocked-${bumpKey}`}
            aria-hidden="true"
            className="absolute z-10 pointer-events-none rounded-lg border-2 border-red-500 bg-red-500/20"
            style={{ width: CELL, height: CELL, left: PAD + blockedCell.x * PITCH, top: PAD + blockedCell.y * PITCH }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 1, 0] }}
            transition={{ duration: 0.9 }}
          />
        )}
      </div>
    </div>
  );
};
