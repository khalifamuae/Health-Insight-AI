import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'screenshots');

const DEVICES = [
  {
    name: '6.5inch',
    width: 414,
    height: 896,
    deviceScaleFactor: 3,
    outputWidth: 1242,
    outputHeight: 2688,
  },
  {
    name: '6.7inch',
    width: 428,
    height: 926,
    deviceScaleFactor: 3,
    outputWidth: 1284,
    outputHeight: 2778,
  },
];

const SCREENS = [
  { name: '01_dashboard', path: '/', waitFor: 3000 },
  { name: '02_tests', path: '/tests', waitFor: 3000 },
  { name: '03_diet', path: '/diet', waitFor: 3000 },
  { name: '04_profile', path: '/profile', waitFor: 3000 },
  { name: '05_compare', path: '/compare', waitFor: 3000 },
];

async function takeScreenshots() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (const device of DEVICES) {
    const deviceDir = path.join(OUTPUT_DIR, `${device.outputWidth}x${device.outputHeight}`);
    if (!fs.existsSync(deviceDir)) {
      fs.mkdirSync(deviceDir, { recursive: true });
    }

    const landscapeDir = path.join(OUTPUT_DIR, `${device.outputHeight}x${device.outputWidth}`);
    if (!fs.existsSync(landscapeDir)) {
      fs.mkdirSync(landscapeDir, { recursive: true });
    }

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
      locale: 'ar',
    });

    const page = await context.newPage();

    console.log(`\n📱 Device: ${device.name} (${device.outputWidth}x${device.outputHeight})`);
    console.log('🔐 Logging in...');

    const loginResp = await page.goto(`${BASE_URL}/api/dev-screenshot-login`, { waitUntil: 'networkidle', timeout: 15000 });
    const loginBody = await loginResp?.json().catch(() => null);
    console.log('Login result:', loginBody);

    if (!loginBody?.success) {
      console.error('❌ Login failed, screenshots will show login page');
    }

    for (const screen of SCREENS) {
      try {
        await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(screen.waitFor);

        const portraitPath = path.join(deviceDir, `${screen.name}.png`);
        await page.screenshot({ path: portraitPath, fullPage: false });
        console.log(`✓ Portrait: ${device.outputWidth}x${device.outputHeight} - ${screen.name}`);

        await page.setViewportSize({ width: device.height, height: device.width });
        await page.waitForTimeout(1000);
        const landscapePath = path.join(landscapeDir, `${screen.name}.png`);
        await page.screenshot({ path: landscapePath, fullPage: false });
        console.log(`✓ Landscape: ${device.outputHeight}x${device.outputWidth} - ${screen.name}`);

        await page.setViewportSize({ width: device.width, height: device.height });
        await page.waitForTimeout(500);
      } catch (err) {
        console.error(`✗ Error on ${screen.name}: ${err}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\n📸 All screenshots saved to:', OUTPUT_DIR);

  const dirs = fs.readdirSync(OUTPUT_DIR).sort();
  for (const dir of dirs) {
    const fullDir = path.join(OUTPUT_DIR, dir);
    if (fs.statSync(fullDir).isDirectory()) {
      const files = fs.readdirSync(fullDir);
      console.log(`\n📁 ${dir}/`);
      for (const file of files) {
        const stat = fs.statSync(path.join(fullDir, file));
        console.log(`   ${file} (${(stat.size / 1024).toFixed(0)} KB)`);
      }
    }
  }
}

takeScreenshots().catch(console.error);
