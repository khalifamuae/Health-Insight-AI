import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'screenshots', 'en_dark_1242x2688');

const SCREENS = [
  { name: '01_dashboard', path: '/', waitFor: 2000 },
  { name: '02_tests', path: '/tests', waitFor: 2000 },
  { name: '03_diet', path: '/diet', waitFor: 2000 },
  { name: '04_profile', path: '/profile', waitFor: 2000 },
  { name: '05_compare', path: '/compare', waitFor: 2000 },
];

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
  if (bodyText?.includes('الرئيسية') || bodyText?.includes('فحوصاتي') || bodyText?.includes('النظام') || bodyText?.includes('المعلومات') || bodyText?.includes('مقارنة')) {
    if (await langBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

async function takeScreenshots() {
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

  console.log('\n📱 English + Dark Mode (1242x2688)');
  console.log('🔐 Logging in...');

  const loginResp = await page.goto(`${BASE_URL}/api/dev-screenshot-login`, { waitUntil: 'networkidle', timeout: 15000 });
  const loginBody = await loginResp?.json().catch(() => null);
  console.log('Login result:', loginBody);

  for (const screen of SCREENS) {
    try {
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);

      await switchToEnglishAndDark(page);
      await page.waitForTimeout(screen.waitFor);

      const screenshotPath = path.join(OUTPUT_DIR, `${screen.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const text = (await page.textContent('body')) || '';
      const lang = text.includes('Home') || text.includes('My Tests') || text.includes('Diet') || text.includes('Personal') || text.includes('Compare') ? 'EN' : 'AR';
      const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      console.log(`✓ ${screen.name} [${lang}] [${dark ? 'Dark' : 'Light'}]`);
    } catch (err) {
      console.error(`✗ Error on ${screen.name}: ${err}`);
    }
  }

  await context.close();
  await browser.close();

  console.log('\n📸 Screenshots saved to:', OUTPUT_DIR);
  const files = fs.readdirSync(OUTPUT_DIR);
  for (const file of files) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, file));
    console.log(`   ${file} (${(stat.size / 1024).toFixed(0)} KB)`);
  }
}

takeScreenshots().catch(console.error);
