import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitEntry, AttemptContext } from './leaderboardApi';

const entry = { name: 'RUI', levelId: 1, commands: 5, errors: 0, time: 10, date: '2026-01-01', robotColor: '#000000' };
const attempt: AttemptContext = { knowledgeLevel: 'beginner', language: 'pt', runs: [['mover()']], attemptId: 'a' };

describe('submitEntry', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('devolve qualified=true quando o servidor aceita no top', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ qualified: true }) })));
    expect(await submitEntry(entry, attempt)).toEqual({ saved: true, qualified: true });
  });

  it('devolve qualified=false quando o servidor recusa por estar fora do top', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ qualified: false }) })));
    expect(await submitEntry(entry, attempt)).toEqual({ saved: true, qualified: false });
  });

  it('sem servidor não há resposta: qualified=null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await submitEntry(entry, attempt)).toEqual({ saved: false, qualified: null });
  });
});
