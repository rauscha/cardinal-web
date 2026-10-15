const { chromium } = require('playwright');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8766/spike-b/index.html');
    for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0)) break; await sleep(1000); }
    await sleep(500);
    const align = () => page.evaluate(() => { const c = JSON.parse(B.cablesJson()).find(x => x.inputModuleId === 13); const j = document.getElementById('j-13-i' + c.inputId).querySelector('svg').getBoundingClientRect(); const main = document.getElementById('main'), mr = main.getBoundingClientRect();
      const d = document.querySelector('.wire-hit[data-cable="' + c.id + '"]').getAttribute('d'); const land = matchMedia('(orientation: landscape) and (min-width: 700px)').matches;
      let wireY; if (land) { const nums = d.match(/-?\d+(\.\d+)?/g).map(Number); wireY = nums[nums.length - 1]; } else { wireY = Number(d.match(/V(-?\d+\.?\d*)/)[1]); }
      return { land, jackY: Math.round(j.top + j.height / 2 - mr.top), wireY: Math.round(wireY) }; });
    console.log(JSON.stringify(vp), 'before:', JSON.stringify(await align()));
    await page.evaluate(() => document.querySelector('#card-12 details').open = true); await sleep(500);
    console.log(JSON.stringify(vp), 'after opening VCO More:', JSON.stringify(await align()));
    await ctx.close();
  }
  await browser.close();
})();
