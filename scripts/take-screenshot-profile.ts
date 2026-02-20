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

  const context = await browser.newContext({
    viewport: { width: 414, height: 896 },
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

  const upgradeBtn = page.locator('[data-testid="button-upgrade"]');
  if (await upgradeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await upgradeBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  const subscriptionSection = page.locator('text=Why upgrade to Pro?');
  if (await subscriptionSection.isVisible({ timeout: 2000 }).catch(() => false)) {
    await subscriptionSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'profile_upgrade_en_dark.png'), fullPage: true });
  console.log('✓ Full page screenshot saved');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'profile_top_en_dark.png'), fullPage: false });
  console.log('✓ Top viewport screenshot saved');

  const proFeature1 = page.locator('[data-testid="pro-feature-1"]');
  if (await proFeature1.isVisible({ timeout: 2000 }).catch(() => false)) {
    await proFeature1.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'profile_features_en_dark.png'), fullPage: false });
  console.log('✓ Features viewport screenshot saved');

  await context.close();
  await browser.close();
}

takeScreenshot().catch(console.error);
