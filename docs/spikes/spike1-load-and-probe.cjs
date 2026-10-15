const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/out'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', '--enable-features=WebAssemblySimd'] });
  const log = [];
  async function run(name, ctxOpts, body) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    page.on('console', m => log.push(`[${name}][console.${m.type()}] ${m.text().slice(0, 300)}`));
    page.on('pageerror', e => log.push(`[${name}][pageerror] ${String(e).slice(0, 300)}`));
    const t0 = Date.now();
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
    let ready = false;
    for (let i = 0; i < 180; i++) {
      ready = await page.evaluate(() => { const w = document.getElementById('canvas_wrapper'); return !!w && w.style.display === 'block'; });
      if (ready) break; await sleep(1000);
    }
    log.push(`[${name}] canvas ready=${ready} after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await body(page, name);
    await ctx.close();
  }
  await run('desktop', { viewport: { width: 1280, height: 720 } }, async (page, name) => {
    const diag = await page.evaluate(() => {
      const r = {};
      try { r.moduleType = typeof Module; r.calledRun = Module.calledRun; } catch (e) { r.moduleErr = String(e); }
      try { const W = Module.WebAudioBridge; r.wab = !!W; r.audioState = W && W.audioContext && W.audioContext.state; r.sampleRate = W && W.audioContext && W.audioContext.sampleRate; r.processor = !!(W && W.processor); r.bufferSize = W && W.processor && W.processor.bufferSize; } catch (e) { r.wabErr = String(e); }
      try { r.root = Module.FS.readdir('/'); } catch (e) { r.fsErr = String(e); }
      try { const m = Module.FS.readdir('/resources/PluginManifests'); r.manifestCount = m.length; r.manifests = m.filter(x => x.endsWith('.json')); } catch (e) { r.manErr = String(e); }
      try { r.userfiles = Module.FS.analyzePath('/userfiles').exists; } catch (e) { r.ufErr = String(e); }
      try { r.requestMIDI = typeof navigator.requestMIDIAccess; } catch (e) {}
      return r;
    });
    log.push(`[${name}] diag ${JSON.stringify(diag)}`);
    await page.screenshot({ path: `${OUT}/desktop-1-loaded.png` });
    // click to dismiss welcome / focus, then check audio state
    await page.mouse.click(640, 360); await sleep(800);
    const st = await page.evaluate(() => { const W = Module.WebAudioBridge; return W && W.audioContext && W.audioContext.state; });
    log.push(`[${name}] audio state after click: ${st}`);
    await page.screenshot({ path: `${OUT}/desktop-2-after-click.png` });
    // right-click on empty rack area -> expect module browser / context menu
    await page.mouse.click(900, 500, { button: 'right' }); await sleep(800);
    await page.screenshot({ path: `${OUT}/desktop-3-right-click.png` });
    await page.keyboard.press('Escape'); await sleep(300);
    // ctrl+wheel zoom
    await page.mouse.move(640, 360); await page.keyboard.down('Control'); await page.mouse.wheel(0, -400); await page.keyboard.up('Control'); await sleep(800);
    await page.screenshot({ path: `${OUT}/desktop-4-ctrl-wheel.png` });
    // try manifest content sample
    const sample = await page.evaluate(() => { try { const m = Module.FS.readdir('/resources/PluginManifests').filter(x => x.endsWith('.json'))[0]; return Module.FS.readFile('/resources/PluginManifests/' + m, { encoding: 'utf8' }).slice(0, 400); } catch (e) { return String(e); } });
    log.push(`[${name}] manifest sample: ${sample.replace(/\s+/g, ' ')}`);
  });
  await run('phone', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, async (page, name) => {
    await page.screenshot({ path: `${OUT}/phone-1-loaded.png` });
    await page.touchscreen.tap(422, 195); await sleep(800);
    await page.screenshot({ path: `${OUT}/phone-2-after-tap.png` });
    const st = await page.evaluate(() => { const W = Module.WebAudioBridge; return W && W.audioContext && W.audioContext.state; });
    log.push(`[${name}] audio state after tap: ${st}`);
    // synthetic contextmenu via dispatched mouse event (what a gesture layer would do)
    await page.evaluate(() => { const c = document.getElementById('canvas'); const r = c.getBoundingClientRect(); const x = r.left + r.width * 0.75, y = r.top + r.height * 0.6;
      for (const type of ['mousedown', 'mouseup', 'contextmenu']) c.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: type === 'mousedown' ? 2 : 0 })); });
    await sleep(800);
    await page.screenshot({ path: `${OUT}/phone-3-synthetic-rightclick.png` });
  });
  fs.writeFileSync(`${OUT}/log.txt`, log.join('\n'));
  console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
