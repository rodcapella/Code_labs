import { describe, it, expect } from 'vitest';
import { compileProgram, compileErrorMessage } from './program';
import { TRANSLATIONS } from '../../../shared/i18n/translations';

const ON = { allowLoops: true, allowConditionals: false };
const OFF = { allowLoops: false, allowConditionals: false };
const ALL = { allowLoops: true, allowConditionals: true };

describe('compileProgram: enquanto', () => {
  it('gera teste de sala à frente, corpo e salto de volta ao teste', () => {
    const r = compileProgram(['enquanto_livre() {', 'mover()', '}', 'pegar()'], 'pt', ALL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions).toEqual([
      { kind: 'check', cond: 'room', sourceLine: 0, skipTo: 3 },
      { kind: 'cmd', text: 'mover()', sourceLine: 1 },
      { kind: 'jump', target: 0, sourceLine: 0 },
      { kind: 'cmd', text: 'pegar()', sourceLine: 3 },
    ]);
  });

  it('não é permitido fora do nível avançado', () => {
    const r = compileProgram(['enquanto_livre() {', 'mover()', '}'], 'pt', { allowLoops: true, allowConditionals: false });
    expect(r).toMatchObject({ ok: false, error: { reason: 'conditionalNotAllowed' } });
  });
});

const txt = (i: { kind: string; text?: string }) => (i.kind === 'cmd' ? i.text : `<${i.kind}>`);

describe('compileProgram: linhas simples', () => {
  it('sem blocos, as instruções são as próprias linhas, com a sua posição', () => {
    const r = compileProgram(['mover()', 'virar_direita()', 'pegar()'], 'pt', OFF);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions).toEqual([
      { kind: 'cmd', text: 'mover()', sourceLine: 0 },
      { kind: 'cmd', text: 'virar_direita()', sourceLine: 1 },
      { kind: 'cmd', text: 'pegar()', sourceLine: 2 },
    ]);
  });
});

describe('compileProgram: repetir', () => {
  it('repetir(3) expande o corpo três vezes', () => {
    const r = compileProgram(['repetir(3) {', 'mover()', '}'], 'pt', ON);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.instructions.map(txt)).toEqual(['mover()', 'mover()', 'mover()']);
      // Todas as cópias apontam para a linha do corpo no editor (linha 1).
      expect(r.instructions.every(i => i.sourceLine === 1)).toBe(true);
    }
  });

  it('instruções antes e depois do bloco mantêm a ordem e a linha', () => {
    const r = compileProgram(['pegar()', 'repetir(2) {', 'mover()', 'virar_direita()', '}', 'pegar()'], 'pt', ON);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions.map(i => `${txt(i)}@${i.sourceLine}`)).toEqual([
      'pegar()@0', 'mover()@2', 'virar_direita()@3', 'mover()@2', 'virar_direita()@3', 'pegar()@5',
    ]);
  });

  it('blocos aninhados multiplicam-se', () => {
    const r = compileProgram(['repetir(2) {', 'repetir(3) {', 'mover()', '}', '}'], 'pt', ON);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions).toHaveLength(6);
  });

  it('funciona em inglês com a palavra "repeat"', () => {
    const r = compileProgram(['repeat(2) {', 'move()', '}'], 'en', ON);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions).toHaveLength(2);
  });

  it('ignora espaços e linhas vazias', () => {
    const r = compileProgram(['  repetir(2) {  ', '', '  mover()  ', '}'], 'pt', ON);
    expect(r.ok).toBe(true);
  });
});

describe('compileProgram: erros', () => {
  it('bloco sem fecho aponta para a linha do repetir', () => {
    const r = compileProgram(['mover()', 'repetir(2) {', 'mover()'], 'pt', ON);
    expect(r).toMatchObject({ ok: false, error: { reason: 'unclosed', line: 1 } });
  });

  it('"}" sem repetir é erro', () => {
    const r = compileProgram(['mover()', '}'], 'pt', ON);
    expect(r).toMatchObject({ ok: false, error: { reason: 'unexpectedEnd', line: 1 } });
  });

  it('número de repetições fora de 1–9 é erro', () => {
    expect(compileProgram(['repetir(0) {', 'mover()', '}'], 'pt', ON)).toMatchObject({ error: { reason: 'repeatCount' } });
    expect(compileProgram(['repetir(10) {', 'mover()', '}'], 'pt', ON)).toMatchObject({ error: { reason: 'repeatCount' } });
  });

  it('repetir não é permitido no nível iniciante', () => {
    const r = compileProgram(['repetir(2) {', 'mover()', '}'], 'pt', OFF);
    expect(r).toMatchObject({ ok: false, error: { reason: 'loopsNotAllowed', line: 0 } });
  });

  it('programas com mais de 500 instruções são rejeitados', () => {
    const r = compileProgram(['repetir(9) {', 'repetir(9) {', 'repetir(9) {', 'mover()', '}', '}', '}'], 'pt', ON);
    expect(r).toMatchObject({ ok: false, error: { reason: 'tooLong' } });
  });

  it('cada erro tem mensagem no idioma indicado', () => {
    const e = { reason: 'unclosed' as const, line: 0 };
    expect(compileErrorMessage(e, 'pt')).toBe(TRANSLATIONS.pt.errorRepeatUnclosed);
    expect(compileErrorMessage(e, 'en')).toBe(TRANSLATIONS.en.errorRepeatUnclosed);
  });
});

describe('compileProgram: se_caixa', () => {
  it('gera uma instrução de verificação com salto para depois do bloco', () => {
    const r = compileProgram(['se_caixa() {', 'pegar()', '}', 'mover()'], 'pt', ALL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions).toEqual([
      { kind: 'check', cond: 'box', sourceLine: 0, skipTo: 2 },
      { kind: 'cmd', text: 'pegar()', sourceLine: 1 },
      { kind: 'cmd', text: 'mover()', sourceLine: 3 },
    ]);
  });

  it('o salto de um bloco aninhado é absoluto, não relativo', () => {
    const r = compileProgram(['se_caixa() {', 'mover()', 'se_caixa() {', 'pegar()', '}', '}', 'mover()'], 'pt', ALL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions).toEqual([
      { kind: 'check', cond: 'box', sourceLine: 0, skipTo: 4 },
      { kind: 'cmd', text: 'mover()', sourceLine: 1 },
      { kind: 'check', cond: 'box', sourceLine: 2, skipTo: 4 },
      { kind: 'cmd', text: 'pegar()', sourceLine: 3 },
      { kind: 'cmd', text: 'mover()', sourceLine: 6 },
    ]);
  });

  it('se_caixa dentro de repetir é copiado com saltos corretos em cada cópia', () => {
    const r = compileProgram(['repetir(2) {', 'se_caixa() {', 'pegar()', '}', '}'], 'pt', ALL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instructions.map(i => (i.kind === 'check' ? `check->${i.skipTo}` : i.kind === 'cmd' ? i.text : `jump->${i.target}`))).toEqual([
      'check->2', 'pegar()', 'check->4', 'pegar()',
    ]);
  });

  it('não é permitido nos níveis iniciante e intermédio', () => {
    const r = compileProgram(['se_caixa() {', 'pegar()', '}'], 'pt', { allowLoops: true, allowConditionals: false });
    expect(r).toMatchObject({ ok: false, error: { reason: 'conditionalNotAllowed', line: 0 } });
  });

  it('bloco se_caixa sem fecho aponta para a linha de abertura', () => {
    const r = compileProgram(['mover()', 'se_caixa() {', 'pegar()'], 'pt', ALL);
    expect(r).toMatchObject({ ok: false, error: { reason: 'unclosed', line: 1 } });
  });
});
