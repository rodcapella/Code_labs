import React from 'react';
import { Position, Box as BoxType, Direction } from '../types/game';
import { Robot } from './Robot';
import { Box } from './Box';
import { AnimatePresence, motion } from 'motion/react';
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
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells.push({ x, y });
    }
  }

  return (
    <div className="relative perspective-1000 flex items-center justify-center p-12">
      <div 
        className="grid gap-2 bg-slate-300 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-b-8 border-slate-400"
        style={{ 
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          transform: 'rotateX(45deg) rotateZ(-45deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {cells.map((cell) => {
          const isRobotHere = robotPosition.x === cell.x && robotPosition.y === cell.y;
          const boxHere = boxes.find(b => b.position.x === cell.x && b.position.y === cell.y && !b.collected);

          return (
            <div
              key={`${cell.x}-${cell.y}`}
              className="w-16 h-16 rounded-lg grid-cell flex items-center justify-center relative border-b-4 border-slate-200"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Floor Pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black" />
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-black" />
              </div>

              <AnimatePresence>
                {boxHere && (
                  <div className="absolute inset-0 z-10" style={{ transform: 'rotateZ(45deg) rotateX(-45deg) translateZ(15px)' }}>
                    <Box color={boxColor} />
                  </div>
                )}
              </AnimatePresence>

              {/* Success Effect */}
              <AnimatePresence>
                {isRobotHere && boxes.some(b => b.position.x === cell.x && b.position.y === cell.y && b.collected) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 2 }}
                    className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    style={{ transform: 'rotateZ(45deg) rotateX(-45deg) translateZ(30px)' }}
                  >
                    <Sparkles className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>

              {isRobotHere && (
                <div className="absolute inset-0 z-20" style={{ transform: 'rotateZ(45deg) rotateX(-45deg) translateZ(25px)' }}>
                  <Robot color={robotColor} direction={robotDirection} commandCount={commandCount} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
