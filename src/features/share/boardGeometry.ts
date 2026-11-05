/** Margem superior/inferior do cartão (cabeçalho e rodapé). */
export const PAD_PX = 36;

/** Posição em pixels de uma casa. A grelha ocupa o espaço entre as margens, com margem lateral. */
export const boardGeometry = (gridSize: number, canvasSize: number) => {
  const side = canvasSize - PAD_PX * 2;
  const cell = side / gridSize;
  const left = (canvasSize - side) / 2;
  return {
    cell,
    x: (col: number) => left + col * cell,
    y: (row: number) => PAD_PX + row * cell,
  };
};
