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
  const cab = () => page.evaluate(() => JSON.parse(B.cablesJson()).map(c => c.outputModuleId + ':' + c.outputId + '>' + c.inputModuleId + ':' + c.inputId).sort().join(' '));
  const undoName = () => page.evaluate(() => document.getElementById('undo').textContent);
  // wire alignment: compare a wire endpoint y with its jack centre, then open "More" on VCO and compare again
  const align = async () => page.evaluate(() => { const c = JSON.parse(B.cablesJson()).find(x => x.inputModuleId === 13); const j = document.getElementById('j-13-i' + c.inputId + '').querySelector('svg').getBoundingClientRect(); const mr = document.getElementById('main').getBoundingClientRect();
    const hit = document.querySelector('.wire-hit[data-cable="' + c.id + '"]'); const d = hit.getAttribute('d'); const ys = d.match(/-?\d+(\.\d+)?/g).map(Number); const yEnd = ys[ys.length - 1]; return { jackY: Math.round(j.top + j.height/2 - mr.top), wireY: Math.round(yEnd) }; });
  log.push('alignment before: ' + JSON.stringify(await align()));
  await page.evaluate(() => document.querySelector('#card-12 details').open = true); await sleep(400);
  log.push('alignment after opening VCO More: ' + JSON.stringify(await align()));
  await page.evaluate(() => document.querySelector('#card-12 details').open = false); await sleep(300);
  log.push('start: ' + await cab());
  // 1. pick up the plug in VCO 1V/oct (fed by SEQ3 CV1) and drop it on VCO FM input -> cable moved, count same
  await page.locator('#j-12-i0').scrollIntoViewIfNeeded(); await page.tap('#j-12-i0'); await sleep(300);
  log.push('holding: armed=' + await page.evaluate(() => document.querySelector('.jack.armed') && document.querySelector('.jack.armed').id) + ' targets=' + await page.evaluate(() => document.querySelectorAll('.jack.target').length) + ' chip=' + await page.evaluate(() => document.querySelector('#chip .t').textContent.slice(0, 60)));
  await page.screenshot({ path: 'out/move-1-holding-input-plug.png' });
  await page.tap('#j-12-i1'); await sleep(400);
  log.push('after moving IN end to FM: ' + await cab() + ' | ' + await undoName());
  // 2. pick it up again and tap an OUT (SEQ3 CV 3) -> source changed
  await page.tap('#j-12-i1'); await sleep(200); await page.locator('#j-11-o3').scrollIntoViewIfNeeded(); await sleep(150); await page.tap('#j-11-o3'); await sleep(400);
  log.push('after re-sourcing to CV 3: ' + await cab() + ' | ' + await undoName());
  // 3. undo twice -> original
  await page.tap('#undo'); await sleep(300); await page.tap('#undo'); await sleep(300);
  log.push('after two undos: ' + await cab());
  // 4. tap a drawn cable (portrait margin) -> chip with Move OUT end; move it to SEQ3 CV 2
  const hit = await page.evaluate(() => { const c = JSON.parse(B.cablesJson()).find(x => x.inputModuleId === 12 && x.inputId === 0); const h = document.querySelector('.wire-hit[data-cable="' + c.id + '"]'); const r = h.getBoundingClientRect(); window.scrollTo(0, r.top + window.scrollY - 300); return { id: c.id }; }); await sleep(300);
  const pt = await page.evaluate(() => { const c = JSON.parse(B.cablesJson()).find(x => x.inputModuleId === 12 && x.inputId === 0); const h = document.querySelector('.wire-hit[data-cable="' + c.id + '"]'); const d = h.getAttribute('d'); const m = d.match(/M40 (-?\d+\.?\d*) H(-?\d+\.?\d*) V(-?\d+\.?\d*)/); const mr = document.getElementById('main').getBoundingClientRect(); return { x: mr.left + Number(m[2]), y: mr.top + (Number(m[1]) + Number(m[3])) / 2 }; });
  await page.touchscreen.tap(pt.x, pt.y); await sleep(300);
  log.push('tapped cable: chip=' + await page.evaluate(() => document.querySelector('#chip .t').textContent) + ' buttons=' + await page.evaluate(() => Array.from(document.querySelectorAll('#chip button')).filter(b => b.offsetParent).map(b => b.textContent).join('/')));
  await page.screenshot({ path: 'out/move-2-cable-chip.png' });
  await page.evaluate(() => Array.from(document.querySelectorAll('#chip button')).find(b => b.textContent === 'Move OUT end').click()); await sleep(200);
  log.push('moving OUT end: targets=' + await page.evaluate(() => Array.from(document.querySelectorAll('.jack.target')).map(t => t.dataset.k).join('')));
  await page.locator('#j-11-o2').scrollIntoViewIfNeeded(); await sleep(150); await page.tap('#j-11-o2'); await sleep(400);
  log.push('after moving OUT end to CV 2: ' + await cab() + ' | ' + await undoName());
  // 5. replace with history: arm ADSR Envelope (13 o0) onto VCO FM (occupied? no) -> use VCA CV (occupied by ADSR itself)... arm SEQ3 CV1 onto VCA CV, then undo restores ADSR->VCA
  await page.locator('#j-11-o1').scrollIntoViewIfNeeded(); await page.tap('#j-11-o1'); await sleep(200); await page.locator('#j-14-i0').scrollIntoViewIfNeeded(); await sleep(150); await page.tap('#j-14-i0'); await sleep(400);
  log.push('after replace on VCA CV: ' + await cab() + ' | ' + await undoName());
  await page.tap('#undo'); await sleep(400); log.push('after undo replace: ' + await cab());
  // 6. pressing an OUT that already has cables starts a new cable (chip mentions the count)
  await page.locator('#j-14-o0').scrollIntoViewIfNeeded(); await page.tap('#j-14-o0'); await sleep(200);
  log.push('press busy OUT: chip=' + await page.evaluate(() => document.querySelector('#chip .t').textContent));
  await page.tap('#chip-cancel'); await sleep(200);
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state));
  fs.writeFileSync('out/move-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
