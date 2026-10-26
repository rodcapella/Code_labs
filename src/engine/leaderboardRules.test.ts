import { describe, it, expect } from 'vitest';
import { validateEntry, encodeScore, keyFor, scoreOf } from './leaderboardRules';
import { compareEntries } from './leaderboard';
import { LeaderboardEntry } from '../types/game';

const valid = {
  name: 'Rui',
  levelId: 2,
  commands: 10,
  errors: 1,
  time: 42,
  date: '2026-10-26',
  robotColor: '#2563EB',
};

describe('validateEntry', () => {
  it('aceita uma entrada válida e devolve-a sem campos extra', () => {
    const r = validateEntry({ ...valid, id: 'hack', extra: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entry).toEqual(valid);
  });

  it('rejeita corpo que não é objeto', () => {
    expect(validateEntry(null).ok).toBe(false);
    expect(validateEntry('x').ok).toBe(false);
  });

  it('rejeita nome vazio, grande demais ou com caracteres perigosos', () => {
    expect(validateEntry({ ...valid, name: '' }).ok).toBe(false);
    expect(validateEntry({ ...valid, name: 'a'.repeat(11) }).ok).toBe(false);
    expect(validateEntry({ ...valid, name: '<script>' }).ok).toBe(false);
  });

  it('aceita nomes com acentos', () => {
    expect(validateEntry({ ...valid, name: 'João' }).ok).toBe(true);
  });

  it('rejeita nível fora de 1–3', () => {
    expect(validateEntry({ ...valid, levelId: 0 }).ok).toBe(false);
    expect(validateEntry({ ...valid, levelId: 4 }).ok).toBe(false);
    expect(validateEntry({ ...valid, levelId: 1.5 }).ok).toBe(false);
  });

  it('rejeita números negativos, não inteiros ou fora dos limites', () => {
    expect(validateEntry({ ...valid, commands: -1 }).ok).toBe(false);
    expect(validateEntry({ ...valid, errors: 10001 }).ok).toBe(false);
    expect(validateEntry({ ...valid, time: 86401 }).ok).toBe(false);
    expect(validateEntry({ ...valid, time: '42' }).ok).toBe(false);
  });

  it('rejeita data e cor mal formadas', () => {
    expect(validateEntry({ ...valid, date: '26/10/2026' }).ok).toBe(false);
    expect(validateEntry({ ...valid, robotColor: 'red' }).ok).toBe(false);
  });
});

describe('encodeScore', () => {
  const e = (commands: number, errors: number, time: number): LeaderboardEntry => ({
    id: '', name: 'x', levelId: 1, commands, errors, time, date: '2026-01-01', robotColor: '#000000',
  });

  it('pontuação com penalização: 3 comandos + 2 erros é pior que 5 limpos', () => {
    expect(scoreOf(3, 2, 0)).toBeGreaterThan(scoreOf(5, 0, 0));
  });

  it('o tempo conta na pontuação: cada 10 s soma 1 ponto', () => {
    expect(scoreOf(5, 0, 0)).toBe(5);
    expect(scoreOf(5, 0, 9)).toBe(5);
    expect(scoreOf(5, 0, 10)).toBe(6);
    expect(scoreOf(5, 0, 30)).toBe(8);
  });

  it('menos tempo ganha quando comandos e erros são iguais', () => {
    expect(encodeScore(e(4, 0, 12))).toBeLessThan(encodeScore(e(4, 0, 99)));
  });

  it('um erro pesa mais que 10 s, mas um comando pesa menos que um erro', () => {
    expect(scoreOf(4, 1, 0)).toBeGreaterThan(scoreOf(4, 0, 19));
    expect(scoreOf(5, 0, 0)).toBeLessThan(scoreOf(4, 1, 0));
  });

  it('ordena pelo score codificado da mesma forma que compareEntries', () => {
    const samples = [e(5, 0, 30), e(3, 2, 10), e(4, 0, 99), e(4, 0, 12), e(2, 1, 5), e(10, 0, 1)];
    const byCompare = [...samples].sort(compareEntries).map(x => encodeScore(x));
    const byEncoded = samples.map(x => encodeScore(x)).sort((a, b) => a - b);
    expect(byEncoded).toEqual(byCompare);
  });

});

describe('keyFor', () => {
  it('uma chave Redis por nível', () => {
    expect(keyFor(1)).toBe('leaderboard:level:1');
    expect(keyFor(3)).not.toBe(keyFor(2));
  });
});
