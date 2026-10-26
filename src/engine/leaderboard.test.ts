import { describe, it, expect, beforeEach } from 'vitest';
import {
  addEntry, compareEntries, formatPlayerName, parseLeaderboard,
  loadLeaderboard, saveLeaderboard, LEADERBOARD_SIZE,
} from './leaderboard';
import { LeaderboardEntry } from '../types/game';

const entry = (id: string, commands: number, time = 10, errors = 0): LeaderboardEntry => ({
  id, name: id, levelId: 1, commands, errors, time, date: '2026-01-01', robotColor: '#000',
});

describe('ranking', () => {
  beforeEach(() => localStorage.clear());

  it('ordena por menos comandos e, em empate, por menos tempo', () => {
    const sorted = [entry('a', 5, 30), entry('b', 3, 50), entry('c', 5, 10)].sort(compareEntries);
    expect(sorted.map(e => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('penaliza erros na pontuação (cada erro soma ERROR_PENALTY comandos)', () => {
    // 3 comandos + 2 erros (=4) fica pior que 5 comandos sem erros
    const sorted = [entry('erros', 3, 10, 2), entry('limpo', 5, 10)].sort(compareEntries);
    expect(sorted.map(e => e.id)).toEqual(['limpo', 'erros']);
  });

  it('entradas antigas sem campo errors são lidas com 0', () => {
    const [e] = parseLeaderboard('[{"name":"x","commands":4,"time":9}]');
    expect(e.errors).toBe(0);
  });

  it('mantém apenas os melhores LEADERBOARD_SIZE resultados', () => {
    let list: LeaderboardEntry[] = [];
    for (let i = 0; i < LEADERBOARD_SIZE + 5; i++) list = addEntry(list, entry(`e${i}`, i + 1));
    expect(list).toHaveLength(LEADERBOARD_SIZE);
    expect(list[0].commands).toBe(1);
    expect(list[list.length - 1].commands).toBe(LEADERBOARD_SIZE);
  });

  it('formata o nome em maiúsculas com no máximo 10 caracteres', () => {
    expect(formatPlayerName('  alexandre silva  ')).toBe('ALEXANDRE ');
    expect(formatPlayerName('rui')).toBe('RUI');
  });

  it('parseLeaderboard tolera JSON inválido e dados estranhos', () => {
    expect(parseLeaderboard(null)).toEqual([]);
    expect(parseLeaderboard('não é json')).toEqual([]);
    expect(parseLeaderboard('{"a":1}')).toEqual([]);
    expect(parseLeaderboard('[{"name":"x","commands":1,"time":2},{"lixo":true}]')).toHaveLength(1);
  });

  it('guarda e lê do localStorage; sem dados começa vazio (sem entradas falsas)', () => {
    expect(loadLeaderboard()).toEqual([]);
    saveLeaderboard([entry('x', 2)]);
    expect(loadLeaderboard().map(e => e.id)).toEqual(['x']);
  });
});
