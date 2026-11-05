import { GameState, LevelMeta } from '../../shared/types/game';
import { PAD_PX, boardGeometry } from './boardGeometry';

export interface CardInfo {
  levelNumber: number;
  score: number;
  stars: number;
  robotColor: string;
  /** Texto curto de rodapé, ex.: o endereço da aplicação. */
  footer: string;
  labels: { level: string; points: string; stars: string };
}

const DIRECTION_ANGLE: Record<GameState['robotDirection'], number> = {
  NORTH: -Math.PI / 2,
  EAST: 0,
  SOUTH: Math.PI / 2,
  WEST: Math.PI,
};

/**
 * Desenha um estado do tabuleiro num canvas 2D (vista de cima). Cada tipo de obstáculo tem
 * uma forma e um padrão próprios, para não depender só da cor (modo para daltónicos).
 */
export const drawBoard = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  level: LevelMeta,
  card: CardInfo,
  size: number,
): void => {
  const g = boardGeometry(state.gridSize, size);
  ctx.fillStyle = '#001547';
  ctx.fillRect(0, 0, size, size);

  // Cabeçalho: nível e pontuação
  ctx.fillStyle = '#5CD4F2';
  ctx.font = `bold ${Math.round(size * 0.05)}px sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(`${card.labels.level} ${card.levelNumber}`, PAD_PX, PAD_PX / 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${card.labels.points}: ${card.score}  ${'★'.repeat(card.stars)}${'☆'.repeat(3 - card.stars)}`, size - PAD_PX, PAD_PX / 2);
  ctx.textAlign = 'left';

  // Casas
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      ctx.fillStyle = '#012050';
      ctx.fillRect(g.x(x), g.y(y), g.cell - 2, g.cell - 2);
    }
  }

  // Buracos: poço escuro com contorno tracejado
  for (const h of state.holes) {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(g.x(h.x) + g.cell / 2, g.y(h.y) + g.cell / 2, g.cell * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Paredes: bloco cinzento com tijolos (linhas)
  for (const w of state.walls) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(g.x(w.x), g.y(w.y), g.cell - 2, g.cell - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(g.x(w.x), g.y(w.y) + g.cell / 2);
    ctx.lineTo(g.x(w.x) + g.cell - 2, g.y(w.y) + g.cell / 2);
    ctx.stroke();
  }

  // Madeira: bloco castanho com veios diagonais
  for (const m of state.wood) {
    ctx.fillStyle = '#92400E';
    ctx.fillRect(g.x(m.x), g.y(m.y), g.cell - 2, g.cell - 2);
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    for (let k = -g.cell; k < g.cell; k += 8) {
      ctx.beginPath();
      ctx.moveTo(g.x(m.x) + k, g.y(m.y) + g.cell - 2);
      ctx.lineTo(g.x(m.x) + k + g.cell, g.y(m.y));
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  // Caixas: quadrado da cor do nível; recolhidas ficam esbatidas
  for (const b of state.boxes) {
    ctx.globalAlpha = b.collected ? 0.25 : 1;
    ctx.fillStyle = level.colors.box;
    const pad = g.cell * 0.22;
    ctx.fillRect(g.x(b.position.x) + pad, g.y(b.position.y) + pad, g.cell - pad * 2, g.cell - pad * 2);
    ctx.globalAlpha = 1;
  }

  // Robô: círculo na cor do jogador com um bico na direção em que está virado
  const rx = g.x(state.robotPosition.x) + g.cell / 2;
  const ry = g.y(state.robotPosition.y) + g.cell / 2;
  const r = g.cell * 0.36;
  ctx.fillStyle = card.robotColor;
  ctx.beginPath();
  ctx.arc(rx, ry, r, 0, Math.PI * 2);
  ctx.fill();
  const a = DIRECTION_ANGLE[state.robotDirection];
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(rx + Math.cos(a) * r * 0.6, ry + Math.sin(a) * r * 0.6, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Rodapé: endereço da aplicação
  ctx.fillStyle = 'rgba(230,241,255,0.8)';
  ctx.font = `${Math.round(size * 0.035)}px sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(card.footer, PAD_PX, size - PAD_PX / 3);
};
