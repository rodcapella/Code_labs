import { Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { STRUCTURE_BONUS } from '../../../shared/config/rules';

/**
 * Quantos tipos de estrutura de controlo aparecem nas linhas (repetir, se_caixa, enquanto_livre).
 * Conta tipos, não blocos: repetir o mesmo tipo várias vezes não aumenta o desconto.
 */
export const countStructureKinds = (lines: string[], lang: Language): number => {
  const t = TRANSLATIONS[lang];
  const repeatRe = new RegExp(`^${t.cmdRepeatWord}\\((\\d+)\\)\\s*\\{$`);
  let repeat = false;
  let ifBox = false;
  let whileFree = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (repeatRe.test(line)) repeat = true;
    if (line === t.cmdIfBox) ifBox = true;
    if (line === t.cmdWhileFree) whileFree = true;
  }
  return [repeat, ifBox, whileFree].filter(Boolean).length;
};

/** Desconto em pontos para a execução vencedora. */
export const structureBonusFor = (winningLines: string[], lang: Language): number =>
  countStructureKinds(winningLines, lang) * STRUCTURE_BONUS;
