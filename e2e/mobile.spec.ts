import { test, expect, Page } from '@playwright/test';

// Estado inicial: perfil já configurado (ignora o onboarding) e tutorial visto.
const seedProfile = async (page: Page, level: 'beginner' | 'advanced' = 'beginner') => {
  await page.addInitScript(lvl => {
    localStorage.setItem('codebot_lab_user_config', JSON.stringify({
      name: 'rui', age: 20, level: lvl, language: 'pt', robotColor: '#2563EB',
      completedLevels: [], levelsVersion: 2, stars: {},
    }));
    localStorage.setItem('tutorial_completed', 'true');
  }, level);
};

/** Nenhum conteúdo sai para fora do ecrã (sem scroll horizontal). */
const noHorizontalOverflow = async (page: Page) => {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll, 'a página não pode ter scroll horizontal').toBeLessThanOrEqual(width + 1);
};

/** Um elemento está inteiramente visível dentro da largura do ecrã. */
const fitsViewport = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox();
  const width = page.viewportSize()!.width;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
};

test.describe('ecrã inicial', () => {
  test('sem scroll horizontal e com os níveis visíveis', async ({ page }) => {
    await seedProfile(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /começar|start/i }).first()).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe('janela de conceito antes do nível', () => {
  test('cabe no ecrã e fecha com toque', async ({ page }) => {
    await seedProfile(page);
    await page.goto('/');
    await page.getByRole('button', { name: /começar|start/i }).first().tap();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await fitsViewport(page, '[role="dialog"]');
    await page.getByRole('button', { name: 'Começar o nível' }).tap();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('jogo em ecrã pequeno', () => {
  test('comandos tocáveis e sem scroll horizontal', async ({ page }) => {
    await seedProfile(page);
    await page.goto('/');
    await page.getByRole('button', { name: /começar|start/i }).first().tap();
    await page.getByRole('button', { name: 'Começar o nível' }).tap();
    await noHorizontalOverflow(page);

    // Alvos de toque: os botões de comando devem ter pelo menos 40 px de altura.
    const moveBox = await page.getByRole('button', { name: 'mover()' }).boundingBox();
    expect(moveBox!.height).toBeGreaterThanOrEqual(40);
  });

  test('um erro abre a janela com a dica e o embate fica visível', async ({ page }) => {
    await seedProfile(page);
    await page.goto('/');
    await page.getByRole('button', { name: /começar|start/i }).first().tap();
    await page.getByRole('button', { name: 'Começar o nível' }).tap();
    // Sete passos para a frente saem da grelha 6x6: o 6.º já é um erro.
    for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'mover()' }).tap();
    await page.getByRole('button', { name: /executar|execute/i }).tap();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await fitsViewport(page, '[role="dialog"]');
    await noHorizontalOverflow(page);
  });
});

test.describe('ranking', () => {
  test('separadores e tabela cabem no ecrã', async ({ page }) => {
    await seedProfile(page);
    await page.goto('/');
    await page.getByRole('button', { name: /ranking/i }).first().tap();
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 20_000 });
    await noHorizontalOverflow(page);
  });
});
