// Help drawer test (test build 0.10): opens the drawer three ways, checks engine metadata + our text + live connections.
const { chromium } = require('playwright');
const fs = require('fs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const log = [];
  page.on('pageerror', e => log.push('[pageerror] ' + e)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push('[console] ' + m.text().slice(0, 160)); });
  await page.goto('http://127.0.0.1:8766/spike-b/index.html');
  for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0 && !!window.HELP)) break; await sleep(1000); }
  await page.tap('#start'); await sleep(1200);
  const q = (sel, fn) => page.evaluate(([s, f]) => { const el = document.querySelector(s); return el ? (new Function('el', 'return ' + f))(el) : null; }, [sel, fn]);
  log.push('help loaded: ' + await page.evaluate(() => !!window.HELP && Object.keys(HELP.modules).length + ' modules of text'));
  log.push('VCO card bars: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#card-' + mods.find(m => m.model === 'VCO').id + ' .bar label')).map(l => l.textContent).join(' | ')));
  log.push('Audio card jacks: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#card-' + mods.find(m => m.model === 'HostAudio2').id + ' .jack span:first-of-type')).map(l => l.textContent).join(' | ')));
  // 1. ? button on the VCO card
  const vco = await page.evaluate(() => mods.find(m => m.model === 'VCO').id);
  await page.evaluate(id => document.getElementById('card-' + id).scrollIntoView(), vco); await sleep(200);
  await page.tap('#card-' + vco + ' .menu.help'); await sleep(500);
  log.push('drawer open: ' + await page.evaluate(() => !document.getElementById('hsheet').hidden) + ' · title ' + await q('#h-name', 'el.textContent') + ' · plugin ' + await q('#h-plugin', 'el.textContent') + ' · manual ' + await q('#h-manual', 'el.hidden ? "hidden" : el.href'));
  log.push('sections: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#hbody h3')).map(h => h.textContent).join(', ')) + ' · knob rows ' + await page.evaluate(() => document.querySelectorAll('#hbody .hrow[data-pr]').length) + ' · jack rows ' + await page.evaluate(() => document.querySelectorAll('#hbody .hrow[data-jr]').length));
  log.push('has description: ' + await page.evaluate(() => !!document.querySelector('#hbody .hdesc')) + ' · has about: ' + await page.evaluate(() => !!document.querySelector('#hbody .habout')) + ' · has try: ' + await page.evaluate(() => !!document.querySelector('#hbody .htry')));
  log.push('knob rows: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#hbody .hrow[data-pr]')).map(r => r.querySelector('b').textContent + ' = ' + r.querySelector('.hv').textContent + (r.querySelector('p') ? ' ✓text' : ' ✗text')).join(' | ')));
  log.push('jack rows: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#hbody .hrow[data-jr]')).map(r => r.querySelector('b').textContent + ' [' + r.querySelector('.hty').textContent + '] ' + r.querySelector('.hconn').textContent.trim()).join(' | ')));
  await sleep(600); log.push('live jack values: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#hbody .hjv')).map(e => e.textContent).join(', ')));
  await page.screenshot({ path: 'out/help-1-vco.png' });
  // goto button → scroll to the other card and flash
  const gotoText = await page.evaluate(() => { const b = document.querySelector('#hbody button[data-goto]'); return b ? b.textContent : null; });
  await page.evaluate(() => document.querySelector('#hbody button[data-goto]').click()); await sleep(600);
  log.push('goto "' + gotoText + '": drawer hidden ' + await page.evaluate(() => document.getElementById('hsheet').hidden) + ', flashed card ' + await page.evaluate(() => { const c = document.querySelector('.card.flash'); return c ? c.querySelector('h2').textContent : 'none'; }));
  // 2. tap a bar label (ADSR Attack) -> drawer opens with that row highlighted
  const adsr = await page.evaluate(() => mods.find(m => m.model === 'ADSR').id);
  await page.evaluate(id => document.getElementById('card-' + id).scrollIntoView(), adsr); await sleep(200);
  await page.tap('#card-' + adsr + ' .bar[data-p="0"] label'); await sleep(500);
  log.push('bar label tap: title ' + await q('#h-name', 'el.textContent') + ' · highlighted row ' + await page.evaluate(() => { const r = document.querySelector('#hbody .hrow.hl'); return r ? r.querySelector('b').textContent + ' → ' + r.querySelector('p').textContent.slice(0, 60) : 'none'; }));
  await page.screenshot({ path: 'out/help-2-attack.png' });
  await page.tap('#h-close'); await sleep(200);
  // 3. press an OUT jack -> chip offers "What is this jack?"
  const seq = await page.evaluate(() => mods.find(m => m.model === 'SEQ3').id);
  await page.evaluate(id => document.getElementById('j-' + id + '-o1').scrollIntoView({ block: 'center' }), seq); await sleep(200);
  await page.tap('#j-' + seq + '-o1'); await sleep(300);
  log.push('chip buttons: ' + await page.evaluate(() => Array.from(document.querySelectorAll('#chip button')).filter(b => b.offsetParent).map(b => b.textContent).join(' | ')));
  await page.evaluate(() => Array.from(document.querySelectorAll('#chip button')).find(b => b.textContent === 'What is this jack?').click()); await sleep(500);
  log.push('jack help: title ' + await q('#h-name', 'el.textContent') + ' · highlighted ' + await page.evaluate(() => { const r = document.querySelector('#hbody .hrow.hl'); return r ? r.querySelector('b').textContent + ' [' + r.querySelector('.hty').textContent + '] ' + r.querySelector('.hconn').textContent.trim() + ' · ' + (r.querySelector('p') || {}).textContent : 'none'; }) + ' · arm cleared ' + await page.evaluate(() => !arm));
  await page.screenshot({ path: 'out/help-3-jack.png' });
  await page.tap('#h-close'); await sleep(200);
  // 4. a Surge module: grouped modulation depths, plugin-level manual fallback
  await page.tap('#add'); await sleep(300); await page.fill('#sheet-q', 'nimbus'); await sleep(300); await page.tap('.model[data-model="SurgeXTFXNimbus"]'); await sleep(900);
  const nim = await page.evaluate(() => mods.find(m => m.model === 'SurgeXTFXNimbus').id);
  await page.tap('#card-' + nim + ' .menu.help'); await sleep(500);
  log.push('Nimbus: manual ' + await q('#h-manual', 'el.hidden ? "hidden" : el.href') + ' · groups ' + await page.evaluate(() => Array.from(document.querySelectorAll('#hbody details.hgroup summary')).map(s => s.textContent).join(', ')) + ' · ungrouped knob rows ' + await page.evaluate(() => document.querySelectorAll('#hbody > .hrow[data-pr]').length) + ' · note ' + await page.evaluate(() => document.querySelector('#hbody .hfoot').textContent.slice(0, 70)));
  await page.screenshot({ path: 'out/help-4-nimbus.png' });
  await page.tap('#h-close'); await page.tap('#undo'); await sleep(600);
  log.push('after undo add: modules ' + await page.evaluate(() => mods.length) + ', drawer hidden ' + await page.evaluate(() => document.getElementById('hsheet').hidden));
  // 5. landscape
  await page.setViewportSize({ width: 844, height: 390 }); await sleep(400);
  await page.evaluate(id => openHelp(id), vco); await sleep(400); await page.screenshot({ path: 'out/help-5-landscape.png' });
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state) + ' · ' + await page.evaluate(() => document.getElementById('stats').textContent.slice(0, 70)));
  fs.writeFileSync('out/help-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})();
