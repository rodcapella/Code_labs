import { describe, it, expect } from 'vitest';
import { validateSubmission, encodeScore, keyFor, scoreOf } from './leaderboardRules';
import { compareEntries } from './leaderboard';
import { LeaderboardEntry } from '../../../shared/types/game';

const valid = {
  attemptId: '3f2b1c4e-5d6a-4b7c-8e9f-0a1b2c3d4e5f',
  name: 'Rui',
  robotColor: '#2563EB',
  date: '2026-10-26',
  time: 42,
  levelId: 2,
  knowledgeLevel: 'beginner',
  language: 'pt',
  runs: [['mover()', 'pegar()']],
};

describe('validateSubmission', () => {
  it('aceita um envio válido', () => {
    const r = validateSubmission(valid);
    expect(r.ok).toBe(true);
  });

  it('ignora campos que o cliente não devia enviar (comandos, erros, id)', () => {
    const r = validateSubmission({ ...valid, commands: 0, errors: 0, id: 'x' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.submission).not.toHaveProperty('commands');
  });

  it('exige um attemptId válido (uuid)', () => {
    expect(validateSubmission({ ...valid, attemptId: undefined }).ok).toBe(false);
    expect(validateSubmission({ ...valid, attemptId: 'x' }).ok).toBe(false);
  });

  it('rejeita corpo que não é objeto', () => {
    expect(validateSubmission(null).ok).toBe(false);
    expect(validateSubmission('x').ok).toBe(false);
  });

  it('rejeita nome inválido, vazio ou com caracteres perigosos', () => {
    expect(validateSubmission({ ...valid, name: '' }).ok).toBe(false);
    expect(validateSubmission({ ...valid, name: 'a'.repeat(11) }).ok).toBe(false);
    expect(validateSubmission({ ...valid, name: '<script>' }).ok).toBe(false);
  });

  it('aceita nomes com acentos', () => {
    expect(validateSubmission({ ...valid, name: 'João' }).ok).toBe(true);
  });

  it('rejeita nível, tempo, data e cor inválidos', () => {
    expect(validateSubmission({ ...valid, levelId: 4 }).ok).toBe(true);
    expect(validateSubmission({ ...valid, levelId: 5 }).ok).toBe(true);
    expect(validateSubmission({ ...valid, levelId: 6 }).ok).toBe(true);
    expect(validateSubmission({ ...valid, levelId: 8 }).ok).toBe(false);
    expect(validateSubmission({ ...valid, time: -1 }).ok).toBe(false);
    expect(validateSubmission({ ...valid, date: '26/10/2026' }).ok).toBe(false);
    expect(validateSubmission({ ...valid, robotColor: 'red' }).ok).toBe(false);
  });

  it('rejeita nível de conhecimento e idioma fora do conjunto conhecido', () => {
    expect(validateSubmission({ ...valid, knowledgeLevel: 'expert' }).ok).toBe(false);
    expect(validateSubmission({ ...valid, language: 'fr' }).ok).toBe(false);
  });

  it('limita o tamanho do envio', () => {
    expect(validateSubmission({ ...valid, runs: [] }).ok).toBe(false);
    expect(validateSubmission({ ...valid, runs: Array(51).fill(['mover()']) }).ok).toBe(false);
    expect(validateSubmission({ ...valid, runs: [Array(201).fill('mover()')] }).ok).toBe(false);
    expect(validateSubmission({ ...valid, runs: [['x'.repeat(41)]] }).ok).toBe(false);
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
    expect(keyFor(1)).toBe('leaderboard:v2:level:1');
    expect(keyFor(3)).not.toBe(keyFor(2));
  });
});
