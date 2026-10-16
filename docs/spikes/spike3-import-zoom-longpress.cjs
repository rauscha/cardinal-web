const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/out3'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const log = [];
  const ctx = await browser.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (/patch|Patch|error|Error|fail/.test(t)) log.push('[console] ' + t.replace(/\x1b\[[0-9;]*m/g,'').slice(0,200)); });
  page.on('pageerror', e => log.push('pageerror ' + e));
  await page.goto('http://127.0.0.1:8765/index.html'); for (let i=0;i<120;i++){ if (await page.evaluate(()=>document.getElementById('canvas_wrapper').style.display==='block')) break; await sleep(1000);} await sleep(500);
  // 1) real touch: File -> Import patch..., then feed the file chooser
  await page.touchscreen.tap(422,300); await sleep(300);
  await page.touchscreen.tap(22,14); await sleep(600);
  const [chooser] = await Promise.all([ page.waitForEvent('filechooser', { timeout: 8000 }).catch(e => null), page.touchscreen.tap(54,78) ]);
  log.push('filechooser event: ' + (chooser ? 'yes' : 'no'));
  if (chooser) { await chooser.setFiles(__dirname + '/Moogy.vcv'); }
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/1-after-import.png` });
  const mods = await page.evaluate(() => { try { return Module.FS.readdir('/userfiles'); } catch(e) { return String(e); } });
  log.push('userfiles: ' + JSON.stringify(mods));
  // 2) synthetic ctrl+wheel in touch context (zoom)
  await page.evaluate(() => { const c = document.getElementById('canvas'); c.dispatchEvent(new WheelEvent('wheel', { bubbles:true, cancelable:true, clientX:400, clientY:200, deltaY:-300, deltaMode:0, ctrlKey:true })); });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/2-synth-ctrl-wheel.png` });
  // 3) synthetic long-press (touchstart, wait 2.3 s, no touchend) on empty rack -> expect right-click behaviour (module browser)
  await page.evaluate(() => { const c = document.getElementById('canvas'); const mk=(t,x,y)=>new TouchEvent(t,{bubbles:true,cancelable:true,touches:t==='touchend'?[]:[new Touch({identifier:7,target:c,clientX:x,clientY:y,pageX:x,pageY:y})],changedTouches:[new Touch({identifier:7,target:c,clientX:x,clientY:y,pageX:x,pageY:y})]}); c.dispatchEvent(mk('touchstart',700,330)); setTimeout(()=>c.dispatchEvent(mk('touchend',700,330)), 2300); });
  await sleep(3200);
  await page.screenshot({ path: `${OUT}/3-synth-longpress.png` });
  fs.writeFileSync(`${OUT}/log.txt`, log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
