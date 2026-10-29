import { describe, it, expect } from 'vitest';
import { executeCommand } from './interpreter';
import { compileProgram, createInitialState, checkCondition } from './program';
import { FIXED_LAYOUT } from '../testing/fixtures';

const ALL = { allowLoops: true, allowConditionals: true };
const withWallAhead = () => ({
  ...createInitialState({ ...FIXED_LAYOUT, walls: [{ x: 1, y: 0 }] }),
});

describe('mover(n) e paredes', () => {
  it('mover(3) anda três casas numa só jogada e conta como 1 comando', () => {
    const s = executeCommand(createInitialState(FIXED_LAYOUT), 'mover(3)', 'pt');
    expect(s.robotPosition).toEqual({ x: 3, y: 0 });
    expect(s.commandCount).toBe(1);
    expect(s.error).toBeNull();
  });

  it('uma parede no caminho faz a jogada inteira falhar, sem mexer o robô (opção a)', () => {
    const s = executeCommand({ ...createInitialState(FIXED_LAYOUT), walls: [{ x: 2, y: 0 }] }, 'mover(3)', 'pt');
    expect(s.error).toBeTruthy();
    expect(s.robotPosition).toEqual({ x: 0, y: 0 });
    expect(s.commandCount).toBe(0);
  });

  it('mover() contra parede também falha', () => {
    const s = executeCommand(withWallAhead(), 'mover()', 'pt');
    expect(s.error).toBeTruthy();
    expect(s.robotPosition).toEqual({ x: 0, y: 0 });
  });

  it('mover(n) fora de 1 a 9 é erro', () => {
    expect(executeCommand(createInitialState(FIXED_LAYOUT), 'mover(0)', 'pt').error).toBeTruthy();
    expect(executeCommand(createInitialState(FIXED_LAYOUT), 'mover(12)', 'pt').error).toBeTruthy();
  });

  it('em inglês, move(n)', () => {
    expect(executeCommand(createInitialState(FIXED_LAYOUT), 'move(2)', 'en').robotPosition).toEqual({ x: 2, y: 0 });
  });
});

describe('se_parede e senao', () => {
  it('se_parede é verdadeiro perante parede ou borda', () => {
    const s = withWallAhead();
    expect(checkCondition(s, 'blocked')).toBe(true);
    expect(checkCondition(s, 'room')).toBe(false);
  });

  it('senao depois de se_caixa gera salto para o outro caminho', () => {
    const r = compileProgram(['se_caixa() {', 'pegar()', '}', 'senao() {', 'mover()', '}'], 'pt', ALL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions.map(i => (i.kind === 'cmd' ? i.text : i.kind))).toEqual(['check', 'pegar()', 'jump', 'mover()']);
  });

  it('senao sem se_caixa imediatamente antes é erro', () => {
    expect(compileProgram(['mover()', 'senao() {', 'mover()', '}'], 'pt', ALL))
      .toMatchObject({ ok: false, error: { reason: 'elseWithoutIf' } });
  });

  it('senao depois de se_parede não é permitido', () => {
    expect(compileProgram(['se_parede() {', 'mover()', '}', 'senao() {', 'mover()', '}'], 'pt', ALL))
      .toMatchObject({ ok: false, error: { reason: 'elseWithoutIf' } });
  });

  it('senao não é permitido fora do nível avançado', () => {
    expect(compileProgram(['se_caixa() {', 'pegar()', '}', 'senao() {', 'mover()', '}'], 'pt', { allowLoops: true, allowConditionals: false }))
      .toMatchObject({ ok: false, error: { reason: 'conditionalNotAllowed' } });
  });
});
