const { chromium } = require('playwright');
const fs = require('fs');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage(); const log = [];
  page.on('pageerror', e => log.push('[pageerror] ' + e));
  const boot = async () => { await page.goto('http://127.0.0.1:8766/spike-b/index.html'); for (let i = 0; i < 180; i++) { if (await page.evaluate(() => document.querySelectorAll('.card').length > 0)) break; await sleep(1000); } await sleep(1200); };
  await boot(); await page.tap('#start'); await sleep(500);
  const nmod = () => page.evaluate(() => JSON.parse(B.modulesJson()).length);
  log.push('fresh boot: modules ' + await nmod() + ', restore chip: ' + await page.evaluate(() => document.getElementById('chip').classList.contains('show')));
  // change the patch (add VCF), autosave should follow
  await page.evaluate(() => { B.addModule('Fundamental', 'VCF'); rebuild(); touched(); }); await sleep(1500);
  log.push('after add + autosave wait: modules ' + await nmod() + ', autosave stored: ' + await page.evaluate(async () => { const a = await DB.get('autosave'); return a ? (a.json.length + ' bytes, ' + JSON.parse(a.json).modules.length + ' modules') : 'none'; }));
  // reload: restore offer must appear; restore -> 7 modules
  await boot();
  log.push('after reload: modules ' + await nmod() + ', chip: ' + await page.evaluate(() => document.getElementById('chip').classList.contains('show') ? document.querySelector('#chip .t').textContent : 'none'));
  await page.screenshot({ path: 'out/save-1-restore-offer.png' });
  await page.evaluate(() => Array.from(document.querySelectorAll('#chip button')).find(b => b.textContent === 'Restore').click()); await sleep(1200);
  log.push('after restore: modules ' + await nmod() + ', cards ' + await page.evaluate(() => document.querySelectorAll('.card').length));
  // named save
  await page.tap('#save'); await sleep(300); await page.fill('#psheet-name', 'Arp with filter'); await page.tap('#psheet-save'); await sleep(600);
  log.push('saved: name shown ' + await page.evaluate(() => document.getElementById('pname').textContent + ' ' + document.getElementById('psaved').textContent) + '; library rows ' + await page.evaluate(() => document.querySelectorAll('#plist .prow[data-id]').length));
  await page.screenshot({ path: 'out/save-2-library.png' });
  await page.tap('#psheet-close'); await sleep(200);
  // New patch -> 6 modules, then load the saved one -> 7
  await page.tap('#patches'); await sleep(200); await page.tap('#p-new'); await sleep(1500);
  log.push('after New: modules ' + await nmod() + ' name ' + await page.evaluate(() => document.getElementById('pname').textContent));
  await page.tap('#patches'); await sleep(300); await page.tap('#plist .prow[data-id] button[data-act="load"]'); await sleep(1200);
  log.push('after Load: modules ' + await nmod() + ' name ' + await page.evaluate(() => document.getElementById('pname').textContent));
  // download
  await page.tap('#patches'); await sleep(200); const [dl] = await Promise.all([page.waitForEvent('download'), page.tap('#p-download')]);
  const path = await dl.path(); const txt = fs.readFileSync(path, 'utf8');
  log.push('download: ' + dl.suggestedFilename() + ', ' + txt.length + ' bytes, modules in file ' + JSON.parse(txt).modules.length);
  // import the startup patch file -> 6 modules
  await page.setInputFiles('#p-file', '/home/user/cardinal-web/shell/test-build-0/startup.vcv'); await sleep(1500);
  log.push('after import startup.vcv: modules ' + await nmod() + ' name ' + await page.evaluate(() => document.getElementById('pname').textContent));
  // the downloaded file loads in the stock engine format too: round-trip check via bridge
  log.push('round trip load of download: ' + await page.evaluate(t => B.loadPatch(t), txt) + ' -> modules ' + await nmod());
  log.push('audio: ' + await page.evaluate(() => Module.WebAudioBridge.audioContext.state));
  fs.writeFileSync('out/save-log.txt', log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
