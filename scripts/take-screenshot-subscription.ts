import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'screenshots');

async function switchToEnglishAndDark(page: any) {
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  const langBtn = page.locator('[data-testid="button-language-toggle"]');
  const bodyText = await page.textContent('body');
  if (!bodyText?.includes('Profile') && !bodyText?.includes('Personal')) {
    if (await langBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

async function takeScreenshot() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1284x2778 = 428x926 viewport at 3x scale
  const context = await browser.newContext({
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en',
    colorScheme: 'dark',
  });

  const page = await context.newPage();

  const loginResp = await page.goto(`${BASE_URL}/api/dev-screenshot-login`, { waitUntil: 'networkidle', timeout: 15000 });
  console.log('Login:', await loginResp?.json().catch(() => 'ok'));

  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await switchToEnglishAndDark(page);
  await page.waitForTimeout(2000);

  // Scroll to subscription features section
  const whyUpgrade = page.locator('text=Why upgrade to Pro?');
  if (await whyUpgrade.isVisible({ timeout: 3000 }).catch(() => false)) {
    await whyUpgrade.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'subscription_features_1284x2778.png'), fullPage: false });
  console.log('✓ Subscription features screenshot (1284x2778) saved');

  await context.close();
  await browser.close();
}

takeScreenshot().catch(console.error);
