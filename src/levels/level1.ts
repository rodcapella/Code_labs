import levelBackground from '../assets/backgrounds/level1.jpg';
import { LevelConfig } from '../types/game';

export const level1: LevelConfig = {
  backgroundImage: levelBackground,
  id: 1,
  gridSize: 6,
  initialRobotPosition: { x: 0, y: 0 },
  initialRobotDirection: 'EAST',
  boxes: [
    { x: 2, y: 2 },
    { x: 4, y: 0 },
    { x: 1, y: 4 },
    { x: 5, y: 2 },
    { x: 3, y: 4 },
    { x: 5, y: 5 },
  ],
  colors: {
    robot: '#2563EB',
    box: '#60A5FA',
  },
  hints: [
    'Tente usar mover() para chegar até a primeira caixa.',
    'Lembre-se de usar virar_direita() ou virar_esquerda() para mudar a direção.',
    'Use pegar() quando estiver exatamente em cima de uma caixa.',
    'Você pode combinar vários comandos para coletar todas as caixas de uma vez!',
  ],
};
