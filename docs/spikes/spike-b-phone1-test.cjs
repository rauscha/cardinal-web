// Test build 0.11: fixes from Andrew's first phone test of the card UI.
const { chromium } = require('playwright');
const fs = require('fs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const log = [];
  page.on('pageerror', e => log.push('[pageerror] ' + e));
  await page.goto('http://127.0.0.1:8766/spike-b/index.html');
  for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0 && !!window.HELP)) break; await sleep(1000); }
  await page.tap('#start'); await sleep(1000);
  // 1. no selection
  log.push('user-select on a jack label: ' + await page.evaluate(() => getComputedStyle(document.querySelector('.jack span')).userSelect || getComputedStyle(document.querySelector('.jack span')).webkitUserSelect) + ' · in help body: ' + await page.evaluate(() => getComputedStyle(document.getElementById('hbody')).userSelect));
  // 4. header
  log.push('header height: ' + await page.evaluate(() => document.querySelector('header').getBoundingClientRect().height.toFixed(0)) + ' px · rows of buttons: ' + await page.evaluate(() => { const bs = Array.from(document.querySelectorAll('header .row:first-child .btn')); return new Set(bs.map(b => b.getBoundingClientRect().top | 0)).size; }) + ' · debug hidden ' + await page.evaluate(() => document.getElementById('debug').hidden) + ' · patch line: ' + await page.evaluate(() => document.getElementById('patchname').textContent.trim()));
  await page.screenshot({ path: 'out/phone1-1-header.png' });
  await page.tap('#more'); await sleep(200);
  log.push('after ⋯: debug hidden ' + await page.evaluate(() => document.getElementById('debug').hidden) + ' · stats: ' + await page.evaluate(() => document.getElementById('stats').textContent.slice(0, 50)) + ' · header height ' + await page.evaluate(() => document.querySelector('header').getBoundingClientRect().height.toFixed(0)));
  await page.tap('#more'); await sleep(200);
  // 3. connection labels
  const vco = await page.evaluate(() => mods.find(m => m.model === 'VCO').id), vca = await page.evaluate(() => mods.find(m => m.model === 'VCA-1').id);
  log.push('labels: VCO pitch "' + await page.evaluate(id => document.querySelector('#j-' + id + '-i0 .to').textContent, vco) + '" · VCO saw "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o2 .to').textContent, vco) + '" · VCO sine "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o0 .to').textContent, vco) + '" (hidden: ' + await page.evaluate(id => getComputedStyle(document.querySelector('#j-' + id + '-o0 .to')).display, vco) + ')');
  // lanes: overlapping spans must not share an x
  const lanes = await page.evaluate(() => { const ps = Array.from(document.querySelectorAll('#wires path:not(.wire-hit)')).map(p => p.getAttribute('d')); return ps.map(d => { const m = d.match(/M40 ([\d.]+) H([\d.]+) V([\d.]+)/); return m ? { y1: +m[1], x: +m[2], y2: +m[3] } : null; }).filter(Boolean); });
  let clash = 0; for (let i = 0; i < lanes.length; i++) for (let j = i + 1; j < lanes.length; j++) { const a = lanes[i], b = lanes[j]; const ov = Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2)) - Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2)); if (ov > 0 && a.x === b.x) clash++; }
  log.push('wires: ' + lanes.length + ' · lanes used x=' + [...new Set(lanes.map(l => l.x))].sort((a, b) => a - b).join(',') + ' · overlapping wires sharing a lane: ' + clash);
  await page.evaluate(id => document.getElementById('card-' + id).scrollIntoView(), vco); await sleep(300);
  await page.screenshot({ path: 'out/phone1-2-labels.png' });
  // dimming while a jack is pressed
  await page.evaluate(id => document.getElementById('j-' + id + '-o2').scrollIntoView({ block: 'center' }), vco); await sleep(200);
  await page.tap('#j-' + vco + '-o2'); await sleep(300);
  log.push('press Sawtooth (connected OUT): chip "' + await page.evaluate(() => document.querySelector('#chip .t').textContent) + '" · targets IN ' + await page.evaluate(() => document.querySelectorAll('.jack.in.target').length) + ' OUT ' + await page.evaluate(() => document.querySelectorAll('.jack.out.target').length) + ' · wire opacities ' + await page.evaluate(() => Array.from(document.querySelectorAll('#wires path:not(.wire-hit)')).map(p => p.getAttribute('opacity')).join(',')));
  await page.screenshot({ path: 'out/phone1-3-pressed.png' });
  // 2. tap Sine: cable moves from Sawtooth to Sine
  const before = await page.evaluate(() => JSON.parse(B.cablesJson()).length);
  await page.tap('#j-' + vco + '-o0'); await sleep(500);
  log.push('tap Sine: cables ' + before + ' → ' + await page.evaluate(() => JSON.parse(B.cablesJson()).length) + ' · VCA input fed by: ' + await page.evaluate(id => { const c = cableOnInput(id, 1); const o = jackEl(c.outputModuleId, 'o', c.outputId); return modName(c.outputModuleId) + ' · ' + o.dataset.n; }, vca) + ' · labels: sine "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o0 .to').textContent, vco) + '" saw "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o2 .to').textContent, vco) + '" · undo: ' + await page.evaluate(() => document.getElementById('hist').textContent));
  await page.screenshot({ path: 'out/phone1-4-moved.png' });
  await page.tap('#undo'); await sleep(500);
  log.push('undo: VCA fed by ' + await page.evaluate(id => { const c = cableOnInput(id, 1); return jackEl(c.outputModuleId, 'o', c.outputId).dataset.n; }, vca));
  // still able to add a second cable from a connected OUT by tapping an IN
  await page.tap('#j-' + vco + '-o2'); await sleep(200);
  const vcf = await page.evaluate(() => { const id = B.addModule('Fundamental', 'VCF'); rebuild(); return id; }); await sleep(400);
  await page.tap('#j-' + vco + '-o2'); await sleep(200);
  await page.evaluate(id => document.getElementById('j-' + id + '-i3').scrollIntoView({ block: 'center' }), vcf); await sleep(200); await page.tap('#j-' + vcf + '-i3'); await sleep(400);
  log.push('add second cable from Sawtooth to VCF Audio: cables ' + await page.evaluate(() => JSON.parse(B.cablesJson()).length) + ' · saw label "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o2 .to').textContent, vco) + '"');
  // move both at once
  await page.evaluate(id => document.getElementById('j-' + id + '-o2').scrollIntoView({ block: 'center' }), vco); await sleep(200);
  await page.tap('#j-' + vco + '-o2'); await sleep(200); log.push('chip with 2 cables: "' + await page.evaluate(() => document.querySelector('#chip .t').textContent) + '"');
  await page.tap('#j-' + vco + '-o1'); await sleep(500);
  log.push('moved both to Triangle: tri label "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o1 .to').textContent, vco) + '" saw "' + await page.evaluate(id => document.querySelector('#j-' + id + '-o2 .to').textContent, vco) + '"');
  log.push('SEQ3 readout: ' + await page.evaluate(() => document.querySelector('[id^=running-]').textContent) + ' · watched ' + await page.evaluate(() => watch.length));
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state) + ' · ' + await page.evaluate(() => document.getElementById('stats').textContent.slice(0, 60)));
  fs.writeFileSync('out/phone1-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})();
