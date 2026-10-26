import React from 'react';
import { Position, Box as BoxType, Direction } from '../types/game';
import { Robot } from './Robot';
import { Box } from './Box';
import { AnimatePresence, motion } from 'motion/react';

// Geometria do tabuleiro: células de 64px, espaçamento gap-2 (8px), padding p-4 (16px).
const CELL = 64;
const PITCH = 72;
const PAD = 16;
import { Sparkles } from 'lucide-react';

interface GridProps {
  size: number;
  robotPosition: Position;
  robotDirection: Direction;
  boxes: BoxType[];
  robotColor: string;
  boxColor: string;
  commandCount: number;
}

export const Grid: React.FC<GridProps> = ({
  size,
  robotPosition,
  robotDirection,
  boxes,
  robotColor,
  boxColor,
  commandCount,
}) => {
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
      <div 
        className="relative grid gap-2 bg-white/10 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-b-8 border-white/20"
        style={{ 
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          transform: 'rotateX(45deg) rotateZ(-45deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {cells.map((cell) => {
          const boxHere = boxes.find(b => b.position.x === cell.x && b.position.y === cell.y && !b.collected);

          return (
            <div
              key={`${cell.x}-${cell.y}`}
              className="w-16 h-16 rounded-lg grid-cell flex items-center justify-center relative border-b-4 border-white/10"
              style={{ transformStyle: 'preserve-3d' }}
            >
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
            <Robot color={robotColor} direction={robotDirection} commandCount={commandCount} />
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
      </div>
    </div>
  );
};
