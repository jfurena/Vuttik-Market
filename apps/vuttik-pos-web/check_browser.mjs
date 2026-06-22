import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

  console.log('Navigating to https://vuttik.com...');
  try {
    await page.goto('https://vuttik.com', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.error('Failed to load page:', e);
  }

  console.log('Navigating to https://pos.vuttik.com...');
  try {
    await page.goto('https://pos.vuttik.com', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.error('Failed to load page:', e);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
  await browser.close();
  process.exit(0);
})();
