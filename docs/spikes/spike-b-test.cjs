const { chromium } = require('playwright');
const fs = require('fs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const log = [];
  page.on('pageerror', e => log.push('[pageerror] ' + e));
  page.on('console', m => { const t = m.text(); if (/cardinalweb|error|Error/.test(t) && !/^\[INFO/.test(t)) log.push('[console] ' + t.slice(0, 200)); });
  await page.goto('http://127.0.0.1:8766/spike-b/index.html');
  for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0)) break; await sleep(1000); }
  await page.tap('#start'); await sleep(1500);
  const cards = await page.evaluate(() => Array.from(document.querySelectorAll('.card h2')).map(h => h.textContent));
  log.push('cards: ' + cards.join(' | '));
  const steps = []; for (let i = 0; i < 12; i++) { steps.push(await page.evaluate(() => { const s = document.querySelector('.steps'); return s ? Array.from(s.children).findIndex(d => d.classList.contains('cur')) : -2; })); await sleep(120); }
  log.push('SEQ3 current step over 1.4 s: ' + steps.join(','));
  const env = await page.evaluate(() => { const c = document.querySelector('[id^="pic-"]'); return c ? c.id : 'none'; });
  log.push('first glyph canvas: ' + env);
  await page.screenshot({ path: 'out/spikeb-1-cards.png', fullPage: true });
  await page.tap('#latency'); await sleep(1500);
  log.push('stats: ' + await page.evaluate(() => document.getElementById('stats').textContent));
  // drag the TEMPO bar of SEQ3 to the right and read its display
  const bar = await page.$('.bar[data-p="0"] .track'); if (bar) { const bb = await bar.boundingBox(); await page.touchscreen.tap(bb.x + bb.width * 0.9, bb.y + bb.height / 2); await sleep(400); log.push('tempo after tap at 90%: ' + await page.evaluate(() => document.querySelector('.bar[data-p="0"] .val').textContent)); }
  // show the stock UI for a CPU comparison
  await page.tap('#toggle-ui'); await sleep(4000);
  log.push('stats with stock UI shown: ' + await page.evaluate(() => document.getElementById('stats').textContent));
  await page.screenshot({ path: 'out/spikeb-2-stock-ui-shown.png' });
  await page.tap('#toggle-ui'); await sleep(3000);
  log.push('stats hidden again: ' + await page.evaluate(() => document.getElementById('stats').textContent));
  // reload patch through the bridge
  await page.tap('#reload'); await sleep(2500);
  log.push('cards after reload: ' + (await page.evaluate(() => document.querySelectorAll('.card').length)));
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state));
  fs.writeFileSync('out/spikeb-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
