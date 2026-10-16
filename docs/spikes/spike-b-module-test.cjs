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
  const nmod = () => page.evaluate(() => JSON.parse(B.modulesJson()).length);
  const names = () => page.evaluate(() => Array.from(document.querySelectorAll('.card h2')).map(h => h.textContent).join(' | '));
  log.push('models available: ' + await page.evaluate(() => { const m = JSON.parse(B.modelsJson()); return m.length + ' (' + [...new Set(m.map(x => x.plugin))].join(', ') + '); sample: ' + JSON.stringify(m.find(x => x.model === 'VCF')); }));
  await page.tap('#add'); await sleep(400);
  log.push('sheet open: ' + await page.evaluate(() => !document.getElementById('sheet').hidden) + ', rows ' + await page.evaluate(() => document.querySelectorAll('#sheet-list .model').length) + ', tags ' + await page.evaluate(() => document.querySelectorAll('#sheet-tags button').length));
  await page.screenshot({ path: 'out/module-1-sheet.png' });
  await page.fill('#sheet-q', 'filter'); await sleep(300);
  log.push('search "filter": ' + await page.evaluate(() => Array.from(document.querySelectorAll('#sheet-list .model b')).map(b => b.firstChild.textContent.trim()).join(', ')));
  await page.tap('.model[data-model="VCF"]'); await sleep(800);
  log.push('after adding VCF: modules ' + await nmod() + ' cards: ' + await names() + ' | undo: ' + await page.evaluate(() => document.getElementById('undo').textContent));
  await page.screenshot({ path: 'out/module-2-added.png', fullPage: true });
  // connect VCO saw -> VCF in, VCF out -> VCA in (replace) using tap-tap
  const vcf = await page.evaluate(() => JSON.parse(B.modulesJson()).find(m => m.model === 'VCF').id);
  await page.locator('#j-12-o2').scrollIntoViewIfNeeded(); await page.tap('#j-12-o2'); await sleep(200);
  const vcfIn = await page.evaluate(id => { const m = JSON.parse(B.modulesJson()).find(x => x.id === id); return m.inputs.find(p => /audio|^in/i.test(p.name)).id; }, vcf);
  await page.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), '#j-' + vcf + '-i' + vcfIn); await sleep(250); await page.tap('#j-' + vcf + '-i' + vcfIn); await sleep(400);
  log.push('cables after VCO -> VCF: ' + await page.evaluate(() => JSON.parse(B.cablesJson()).length));
  // remove via the card's × then confirm
  await page.tap('#card-' + vcf + ' .menu'); await sleep(300);
  log.push('remove chip: ' + await page.evaluate(() => document.querySelector('#chip .t').textContent));
  await page.evaluate(() => Array.from(document.querySelectorAll('#chip button')).find(b => b.textContent === 'Remove').click()); await sleep(600);
  log.push('after remove: modules ' + await nmod() + ', cables ' + await page.evaluate(() => JSON.parse(B.cablesJson()).length) + ' | undo: ' + await page.evaluate(() => document.getElementById('undo').textContent));
  await page.tap('#undo'); await sleep(800);
  log.push('after undo remove: modules ' + await nmod() + ', cables ' + await page.evaluate(() => JSON.parse(B.cablesJson()).length) + ', cards ' + await page.evaluate(() => document.querySelectorAll('.card').length));
  await page.tap('#undo'); await sleep(600); await page.tap('#undo'); await sleep(800);
  log.push('after two more undos (cable, add): modules ' + await nmod() + ', cards ' + await page.evaluate(() => document.querySelectorAll('.card').length));
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state) + ' · ' + await page.evaluate(() => document.getElementById('stats').textContent.slice(0, 60)));
  fs.writeFileSync('out/module-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
