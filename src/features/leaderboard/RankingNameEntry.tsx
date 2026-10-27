import React from 'react';
import { PLAYER_NAME_MAX, validatePlayerName } from './domain/leaderboardRules';

export type RankingStatus = 'checking' | 'enter' | 'out' | 'sending' | 'sent' | 'rejected' | 'error';

interface RankingNameEntryProps {
  status: RankingStatus;
  name: string;
  /** Com conta, o nome é o da conta e não se pode alterar. */
  locked?: boolean;
  onNameChange: (name: string) => void;
  onConfirm: () => void;
  messages: {
    checking: string;
    qualify: string;
    out: string;
    rejected: string;
    save: string;
    sending: string;
    sent: string;
    error: string;
    invalid: string;
  };
}

/** Bloco do ranking no ecrã de vitória: pede o nome só se o resultado entrar no top. */
export const RankingNameEntry: React.FC<RankingNameEntryProps> = ({ status, name, locked = false, onNameChange, onConfirm, messages }) => {
  if (status === 'checking') return <p className="text-brand-ice/70 text-sm">{messages.checking}</p>;
  if (status === 'out') return <p className="text-brand-ice/70 text-sm">{messages.out}</p>;
  if (status === 'rejected') return <p className="text-brand-ice/70 text-sm">{messages.rejected}</p>;
  if (status === 'sent') return <p className="text-brand-cyan font-bold text-sm">{messages.sent}</p>;

  const valid = validatePlayerName(name) !== null;
  return (
    <div className="space-y-3">
      <p className="text-brand-cyan font-bold text-sm">{messages.qualify}</p>
      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          if (valid && status === 'enter') onConfirm();
        }}
      >
        <input
          value={name}
          maxLength={PLAYER_NAME_MAX}
          readOnly={locked}
          onChange={e => onNameChange(e.target.value)}
          aria-label={messages.qualify}
          disabled={status === 'sending'}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-brand-ink border border-white/15 text-brand-ice font-mono text-sm focus:outline-none focus:border-brand-cyan"
        />
        <button
          type="submit"
          disabled={!valid || status === 'sending'}
          className="px-4 py-2 rounded-xl bg-brand-blue text-white font-bold text-sm disabled:opacity-40"
        >
          {status === 'sending' ? messages.sending : messages.save}
        </button>
      </form>
      {!valid && name.length > 0 && <p className="text-red-400 text-xs">{messages.invalid}</p>}
      {status === 'error' && <p className="text-red-400 text-xs">{messages.error}</p>}
    </div>
  );
};
