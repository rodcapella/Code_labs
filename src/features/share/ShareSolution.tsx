import React, { useEffect, useRef, useState } from 'react';
import { Share2, Download, Film } from 'lucide-react';
import { LevelConfig, Language } from '../../shared/types/game';
import { TRANSLATIONS } from '../../shared/i18n/translations';
import { CompileOptions } from '../game/engine/program';
import { buildSolutionGif } from './buildSolutionGif';

interface ShareSolutionProps {
  level: LevelConfig;
  winningLines: string[];
  lang: Language;
  opts: CompileOptions;
  robotColor: string;
  levelNumber: number;
  score: number;
  stars: number;
}

/**
 * Cria um GIF curto da solução e oferece partilhar (Web Share no telemóvel) ou descarregar.
 * O GIF mostra o nível, a pontuação e as estrelas; não mostra o nome do jogador.
 */
export const ShareSolution: React.FC<ShareSolutionProps> = ({ level, winningLines, lang, opts, robotColor, levelNumber, score, stars }) => {
  const t = TRANSLATIONS[lang];
  const [state, setState] = useState<'idle' | 'working' | 'ready' | 'error'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const urlRef = useRef<string | null>(null);

  // Liberta o URL do blob ao sair.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const create = () => {
    setState('working');
    // Adiado um tick para o estado "a criar" aparecer antes do trabalho pesado.
    setTimeout(() => {
      try {
        const gif = buildSolutionGif(level, winningLines, lang, opts, {
          levelNumber,
          score,
          stars,
          robotColor,
          footer: window.location.host,
          labels: { level: t.level, points: t.points, stars: t.victoryStars },
        });
        if (!gif) throw new Error('sem frames');
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const next = URL.createObjectURL(gif);
        urlRef.current = next;
        setBlob(gif);
        setUrl(next);
        setState('ready');
      } catch {
        setState('error');
      }
    }, 20);
  };

  const shareText = t.shareText(levelNumber, score, stars);
  const shareUrl = window.location.origin;

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], `codebot-nivel-${levelNumber}.gif`, { type: 'image/gif' });
    const data = { files: [file], text: shareText, url: shareUrl };
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share(data);
        return;
      } catch {
        // Cancelado pelo utilizador ou não suportado: cai para o descarregamento.
      }
    }
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
    }
  };

  return (
    <div className="space-y-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">{t.shareTitle}</p>

      {state === 'idle' && (
        <button type="button" onClick={create} className="w-full py-2 rounded-xl bg-brand-navy border border-brand-cyan/50 text-brand-cyan text-sm font-bold flex items-center justify-center gap-2">
          <Film className="w-4 h-4" />{t.shareCreate}
        </button>
      )}
      {state === 'working' && <p className="text-xs text-brand-ice/70" role="status">{t.shareWorking}</p>}
      {state === 'error' && <p className="text-xs text-red-400" role="alert">{t.shareError}</p>}

      {state === 'ready' && url && (
        <>
          <img src={url} alt={shareText} width={180} height={180} className="mx-auto rounded-xl border border-white/15" />
          <div className="flex gap-2">
            <button type="button" onClick={share} className="flex-1 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" />{t.shareShare}
            </button>
            <a href={url} download={`codebot-nivel-${levelNumber}.gif`} className="flex-1 py-2 rounded-xl bg-brand-navy border border-white/15 text-brand-ice text-sm font-bold flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />{t.shareDownload}
            </a>
          </div>
        </>
      )}
    </div>
  );
};
