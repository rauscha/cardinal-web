// Test build 0.12: signal-flow card order, numbered wire ends, tap-a-label-to-jump.
const { chromium } = require('playwright'); const fs = require('fs'); const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const log = []; page.on('pageerror', e => log.push('[pageerror] ' + e));
  await page.goto('http://127.0.0.1:8766/spike-b/index.html'); for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0 && !!window.HELP)) break; await sleep(1000); }
  await page.tap('#start'); await sleep(800);
  const order = () => page.evaluate(() => Array.from(document.querySelectorAll('.card h2')).map(h => h.textContent).join(' › '));
  log.push('flow order: ' + await order());
  const spans = await page.evaluate(() => Array.from(document.querySelectorAll('#wires path:not(.wire-hit)')).map(p => { const m = p.getAttribute('d').match(/M40 ([\d.]+) H([\d.]+) V([\d.]+)/); return Math.abs(+m[3] - +m[1]) | 0; }));
  log.push('wire lengths (px): ' + spans.join(', ') + ' · total ' + spans.reduce((a, b) => a + b, 0));
  log.push('badges: ' + await page.evaluate(() => { const t = Array.from(document.querySelectorAll('#wires text')).map(e => e.textContent); const counts = {}; t.forEach(n => counts[n] = (counts[n] || 0) + 1); return Object.entries(counts).map(([n, c]) => n + '×' + c).join(' '); }));
  log.push('labels: ' + await page.evaluate(() => Array.from(document.querySelectorAll('.jack .lk')).map(l => l.closest('.jack').dataset.n + ' [' + l.querySelector('i').textContent + '] ' + l.textContent.slice(1)).join(' | ')));
  // numbers agree between label ends
  log.push('label numbers consistent per cable: ' + await page.evaluate(() => cables.every(c => { const ls = Array.from(document.querySelectorAll('.lk[data-cable="' + c.id + '"]')); return ls.length === 2 && ls[0].querySelector('i').textContent === ls[1].querySelector('i').textContent; })));
  await page.screenshot({ path: 'out/wires2-1-flow.png', fullPage: true });
  // tap a label: jumps to the other end and flashes both
  const vco = await page.evaluate(() => mods.find(m => m.model === 'VCO').id);
  await page.evaluate(id => document.getElementById('j-' + id + '-i0').scrollIntoView({ block: 'center' }), vco); await sleep(200);
  const y0 = await page.evaluate(() => scrollY);
  await page.tap('#j-' + vco + '-i0 .lk'); await sleep(900);
  log.push('tap pitch label: scrolled ' + (await page.evaluate(() => scrollY) - y0 | 0) + ' px · flashed: ' + await page.evaluate(() => Array.from(document.querySelectorAll('.jack.hover')).map(j => modName(+j.dataset.m) + ' · ' + j.dataset.n).join(', ')) + ' · arm null ' + await page.evaluate(() => !arm) + ' · chip shown ' + await page.evaluate(() => chip.classList.contains('show')));
  await page.screenshot({ path: 'out/wires2-2-jump.png' });
  // rack order toggle
  await page.tap('#more'); await sleep(150); await page.tap('#order'); await sleep(500);
  log.push('rack order: ' + await order() + ' · button: ' + await page.evaluate(() => document.getElementById('order').textContent) + ' · stored ' + await page.evaluate(() => localStorage.getItem('cw-order')));
  await page.tap('#order'); await sleep(500); log.push('back to flow: ' + await order());
  // adding a filter between VCO and VCA reorders by flow
  await page.evaluate(() => { const id = B.addModule('Fundamental', 'VCF'); const vco = mods.find(m => m.model === 'VCO'), vca = mods.find(m => m.model === 'VCA-1'); const c = cableOnInput(vca.id, 1); B.moveCable(c.id, id, 0, vca.id, 1); B.addCable(vco.id, 2, id, 3); rebuild(); }); await sleep(600);
  log.push('with VCF inserted: ' + await order());
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state));
  fs.writeFileSync('out/wires2-log.txt', log.join('\n')); console.log(log.join('\n')); await browser.close();
})();
