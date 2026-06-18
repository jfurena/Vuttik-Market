import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  try {
    console.log('Logging in...');
    await page.type('input[type="email"]', 'admin@admin.com'); 
    await page.type('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
  } catch (e) {
    console.log('Could not login, maybe already logged in or different credentials', e.message);
  }
  
  console.log('Navigating to POS...');
  await page.goto('http://localhost:3000/pos', { waitUntil: 'networkidle2' });
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log('BODY TEXT LENGTH:', text.length);
  console.log('BODY TEXT SNIPPET:', text.substring(0, 500));
  
  console.log('Done.');
  await browser.close();
})();
