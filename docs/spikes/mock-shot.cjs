const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const shots = [];
  for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto('file:///home/user/cardinal-web/shell/mock/index.html'); await page.waitForTimeout(600);
    await page.screenshot({ path: `out/mock-${name}-cards.png`, fullPage: name === 'portrait' });
    await page.click('#tab-glyphs'); await page.waitForTimeout(900);
    await page.screenshot({ path: `out/mock-${name}-glyphs.png`, fullPage: name === 'portrait' });
    console.log(name, 'errors:', errs.join(' | ') || 'none');
    await ctx.close();
  }
  await b.close();
})();
