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
  await page.tap('#start'); await sleep(800);
  const ncab = () => page.evaluate(() => JSON.parse(B.cablesJson()).length);
  const undoBtn = () => page.evaluate(() => { const u = document.getElementById('undo'), r = document.getElementById('redo'); return (u.disabled ? '[-]' : '[' + u.textContent + ']') + ' ' + (r.disabled ? '[-]' : '[' + r.textContent + ']'); });
  log.push('start: cables ' + await ncab() + ' buttons ' + await undoBtn());
  // connect, undo, redo
  await page.locator('#j-11-o2').scrollIntoViewIfNeeded(); await page.tap('#j-11-o2'); await sleep(200);
  await page.locator('#j-12-i1').scrollIntoViewIfNeeded(); await sleep(150); await page.tap('#j-12-i1'); await sleep(400);
  log.push('after connect: cables ' + await ncab() + ' buttons ' + await undoBtn());
  await page.tap('#undo'); await sleep(400); log.push('after undo: cables ' + await ncab() + ' buttons ' + await undoBtn());
  await page.tap('#redo'); await sleep(400); log.push('after redo: cables ' + await ncab() + ' buttons ' + await undoBtn());
  // disconnect, undo
  await page.tap('#j-12-i1'); await sleep(200); await page.tap('#chip-disconnect'); await sleep(400);
  log.push('after disconnect: cables ' + await ncab() + ' buttons ' + await undoBtn());
  await page.tap('#undo'); await sleep(400); log.push('after undo disconnect: cables ' + await ncab());
  // parameter: tap TEMPO bar at 90%, undo, check value
  const t0 = await page.evaluate(() => B.getParam(11, 0));
  const bar = await page.$('.bar[data-m="11"][data-p="0"] .track'); await bar.scrollIntoViewIfNeeded(); const bb = await bar.boundingBox();
  await page.touchscreen.tap(bb.x + bb.width * 0.9, bb.y + bb.height / 2); await sleep(400);
  const t1 = await page.evaluate(() => B.getParam(11, 0));
  log.push('tempo param ' + t0.toFixed(3) + ' -> ' + t1.toFixed(3) + ' buttons ' + await undoBtn());
  await page.tap('#undo'); await sleep(500);
  const t2 = await page.evaluate(() => B.getParam(11, 0)); const shown = await page.evaluate(() => document.querySelector('.bar[data-m="11"][data-p="0"] .val').textContent);
  log.push('after undo: param ' + t2.toFixed(3) + ' bar shows ' + shown + ' buttons ' + await undoBtn());
  // keyboard
  await page.keyboard.press('Control+Shift+Z'); await sleep(400); log.push('after ctrl+shift+z: param ' + (await page.evaluate(() => B.getParam(11, 0))).toFixed(3));
  await page.keyboard.press('Control+Z'); await sleep(400); log.push('after ctrl+z: param ' + (await page.evaluate(() => B.getParam(11, 0))).toFixed(3));
  await page.screenshot({ path: 'out/undo-1.png' });
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state));
  fs.writeFileSync('out/undo-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
