import { defineConfig, devices } from '@playwright/test';

/**
 * Testes em dispositivos móveis (emulação de telemóvel: viewport, toque e user-agent).
 * CHROMIUM_PATH: binário do Chromium a usar (útil em ambientes sem download do Playwright).
 */
const chromiumPath = process.env.CHROMIUM_PATH;
const mobile = (device: keyof typeof devices) => ({
  ...devices[device],
  defaultBrowserType: 'chromium' as const,
  launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
});

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-13', use: mobile('iPhone 13') },
    { name: 'pixel-7', use: mobile('Pixel 7') },
    { name: 'pequeno-360', use: { ...mobile('Pixel 7'), viewport: { width: 360, height: 640 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
