import { LevelConfig, Language } from '../../shared/types/game';
import { recordFrames } from '../game/engine/recording';
import { CompileOptions } from '../game/engine/program';
import { drawBoard, CardInfo } from './drawBoard';
import { encodeGif, RgbaFrame } from './encodeGif';

export const SHARE_GIF_SIZE = 360;
const STEP_MS = 380;
const START_MS = 900;
const END_MS = 2600;

/**
 * Gera o GIF da passagem vencedora: reexecuta as jogadas, desenha cada estado e codifica.
 * Tudo corre no browser; nada sai do dispositivo até o jogador decidir partilhar.
 */
export const buildSolutionGif = (
  level: LevelConfig,
  winningLines: string[],
  lang: Language,
  opts: CompileOptions,
  card: CardInfo,
): Blob | null => {
  const layout = {
    gridSize: level.gridSize,
    initialRobotPosition: level.initialRobotPosition,
    initialRobotDirection: level.initialRobotDirection,
    boxes: level.boxes,
    walls: level.walls,
    holes: level.holes,
    wood: level.wood,
  };
  const states = recordFrames(layout, winningLines, lang, opts);
  if (states.length === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_GIF_SIZE;
  canvas.height = SHARE_GIF_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const frames: RgbaFrame[] = states.map((state, i) => {
    drawBoard(ctx, state, level, card, SHARE_GIF_SIZE);
    const data = ctx.getImageData(0, 0, SHARE_GIF_SIZE, SHARE_GIF_SIZE).data;
    const delay = i === 0 ? START_MS : i === states.length - 1 ? END_MS : STEP_MS;
    return { rgba: new Uint8ClampedArray(data), width: SHARE_GIF_SIZE, height: SHARE_GIF_SIZE, delay };
  });

  return new Blob([encodeGif(frames)], { type: 'image/gif' });
};
