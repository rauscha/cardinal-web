const { chromium } = require('playwright');
const fs = require('fs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const log = [];
  page.on('pageerror', e => log.push('[pageerror] ' + e));
  await page.goto('http://127.0.0.1:8766/spike-b/index.html');
  for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0)) break; await sleep(1000); }
  await page.tap('#start'); await sleep(1000);
  const ncab = () => page.evaluate(() => JSON.parse(B.cablesJson()).length);
  const cab = () => page.evaluate(() => JSON.parse(B.cablesJson()).map(c => c.outputModuleId + ':' + c.outputId + '>' + c.inputModuleId + ':' + c.inputId).join(' '));
  log.push('cables at start: ' + await ncab() + ' [' + await cab() + ']');
  // 1. tap OUT (SEQ3 CV 2 = module 11 output 2), check armed + targets
  await page.locator('#j-11-o2').scrollIntoViewIfNeeded(); await page.tap('#j-11-o2'); await sleep(300);
  log.push('armed: ' + await page.evaluate(() => !!document.querySelector('.jack.armed')) + ', targets: ' + await page.evaluate(() => document.querySelectorAll('.jack.target').length) + ', matching: ' + await page.evaluate(() => document.querySelectorAll('.jack.target.match').length) + ', chip: ' + await page.evaluate(() => document.getElementById('chip').classList.contains('show')));
  await page.screenshot({ path: 'out/cables-1-armed.png' });
  // 2. scroll to VCO, tap its FM input (module 12 input 1): two-tap connect across distance
  await page.locator('#j-12-i1').scrollIntoViewIfNeeded(); await sleep(200); await page.tap('#j-12-i1'); await sleep(500);
  log.push('after tap-connect: ' + await ncab() + ' [' + await cab() + ']');
  await page.screenshot({ path: 'out/cables-2-connected.png' });
  // 3. tap the now-connected FM input with nothing armed -> chip with Disconnect
  await page.tap('#j-12-i1'); await sleep(300);
  log.push('disconnect offered: ' + await page.evaluate(() => getComputedStyle(document.getElementById('chip-disconnect')).display !== 'none') + ' chip text: ' + await page.evaluate(() => document.querySelector('#chip .t').textContent));
  await page.screenshot({ path: 'out/cables-3-disconnect-chip.png' });
  await page.tap('#chip-disconnect'); await sleep(400);
  log.push('after disconnect: ' + await ncab());
  // 4a. mouse drag within one card: SEQ3 Clock OUT (o13) to SEQ3 Reset IN (i2), both on screen
  await page.evaluate(() => { var r = document.getElementById('j-11-i2').getBoundingClientRect(); window.scrollTo(0, r.top + window.scrollY - document.querySelector('header').getBoundingClientRect().bottom - 30); }); await sleep(300);
  const a = await page.locator('#j-11-o13 svg').boundingBox(), b = await page.locator('#j-11-i2 svg').boundingBox();
  log.push('drag from ' + JSON.stringify(a && { x: a.x | 0, y: a.y | 0 }) + ' to ' + JSON.stringify(b && { x: b.x | 0, y: b.y | 0 }));
  if (a && b) { await page.mouse.move(a.x + 8, a.y + 8); await page.mouse.down(); for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + 8 + (b.x - a.x) * i / 12, a.y + 8 + (b.y - a.y) * i / 12); await sleep(30); } await page.screenshot({ path: 'out/cables-4-dragging.png' }); await page.mouse.up(); await sleep(500); }
  log.push('after drag-connect: ' + await ncab() + ' [' + await cab() + ']');
  // 4b. drag to the bottom edge and hold: the page must auto-scroll; lift on nothing keeps the jack armed
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(200);
  const c0 = await page.locator('#j-11-o2 svg').boundingBox();
  await page.mouse.move(c0.x + 8, c0.y + 8); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(c0.x + 8, c0.y + 8 + (800 - c0.y) * i / 10); await sleep(30); }
  const y0 = await page.evaluate(() => window.scrollY); for (let i = 0; i < 20; i++) { await page.mouse.move(200 + (i % 2), 810); await sleep(60); } const y1 = await page.evaluate(() => window.scrollY);
  await page.mouse.up(); await sleep(300);
  log.push('auto-scroll while holding at the bottom edge: scrollY ' + y0 + ' -> ' + y1 + '; still armed after lifting on nothing: ' + await page.evaluate(() => !!document.querySelector('.jack.armed')));
  await page.evaluate(() => { if (document.querySelector('.jack.armed')) document.querySelector('.jack.armed').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, clientX: 1, clientY: 1 })); }); await sleep(200);
  // 5. replace an occupied input: arm SEQ3 CV 2 then tap VCA CV (14 input 0, currently from ADSR)
  await page.locator('#j-11-o2').scrollIntoViewIfNeeded(); await page.tap('#j-11-o2'); await sleep(200);
  await page.locator('#j-14-i0').scrollIntoViewIfNeeded(); await sleep(200); await page.tap('#j-14-i0'); await sleep(500);
  log.push('after replace on VCA CV: ' + await ncab() + ' [' + await cab() + ']');
  // 6. cancel path: arm then tap background
  await page.tap('#j-11-o1'); await sleep(200); await page.tap('.card .hd'); await sleep(200);
  log.push('armed after background tap: ' + await page.evaluate(() => !!document.querySelector('.jack.armed')));
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state) + ' · stats: ' + await page.evaluate(() => document.getElementById('stats').textContent));
  await page.screenshot({ path: 'out/cables-5-final.png', fullPage: true });
  fs.writeFileSync('out/cables-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
