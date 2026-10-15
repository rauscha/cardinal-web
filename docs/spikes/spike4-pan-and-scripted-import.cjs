const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/out4'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const T = `(t,x,y,id)=>{const c=document.getElementById('canvas');const tp=new Touch({identifier:id||1,target:c,clientX:x,clientY:y,pageX:x,pageY:y});c.dispatchEvent(new TouchEvent(t,{bubbles:true,cancelable:true,touches:t==='touchend'?[]:[tp],changedTouches:[tp]}));}`;
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const log = [];
  const ctx = await browser.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const page = await ctx.newPage(); page.on('pageerror', e => log.push('pageerror ' + e));
  page.on('console', m => { const t = m.text(); if (/Loading patch/.test(t)) log.push('[console] ' + t.replace(/\x1b\[[0-9;]*m/g,'').slice(0,160)); });
  await page.goto('http://127.0.0.1:8765/index.html'); for (let i=0;i<120;i++){ if (await page.evaluate(()=>document.getElementById('canvas_wrapper').style.display==='block')) break; await sleep(1000);} await sleep(500);
  await page.touchscreen.tap(422,300); await sleep(300);
  await page.screenshot({ path: `${OUT}/0-start.png` });
  // A: synthetic wheel without ctrl -> scroll (pan) vertically and horizontally
  await page.evaluate(() => { const c = document.getElementById('canvas'); c.dispatchEvent(new WheelEvent('wheel', { bubbles:true, cancelable:true, clientX:400, clientY:250, deltaX:300, deltaY:0, deltaMode:0 })); });
  await sleep(700); await page.screenshot({ path: `${OUT}/A-wheel-deltaX.png` });
  await page.evaluate(() => { const c = document.getElementById('canvas'); c.dispatchEvent(new WheelEvent('wheel', { bubbles:true, cancelable:true, clientX:400, clientY:250, deltaX:0, deltaY:200, deltaMode:0 })); });
  await sleep(700); await page.screenshot({ path: `${OUT}/A2-wheel-deltaY.png` });
  // B: synthetic single-touch drag on empty rack area (bottom row), to see what a drag does
  await page.evaluate(`(async()=>{const T=${T};T('touchstart',500,330,3);for(let i=1;i<=10;i++){await new Promise(r=>setTimeout(r,30));T('touchmove',500-i*20,330-i*8,3);}T('touchend',300,250,3);})()`);
  await sleep(900); await page.screenshot({ path: `${OUT}/B-touch-drag-empty.png` });
  // C: fully scripted patch import: synthetic taps File -> Import patch..., then assign the file to the created input via DataTransfer
  const vcv = fs.readFileSync(__dirname + '/Moogy.vcv', 'utf8');
  await page.evaluate(`(${T})('touchstart',22,14,5)`); await sleep(60); await page.evaluate(`(${T})('touchend',22,14,5)`); await sleep(500);
  await page.evaluate(`(${T})('touchstart',54,78,6)`); await sleep(60); await page.evaluate(`(${T})('touchend',54,78,6)`); await sleep(600);
  const assigned = await page.evaluate((text) => { const inputs = [...document.querySelectorAll('input[type=file]')]; const inp = inputs[inputs.length-1]; if (!inp) return 'no input'; const dt = new DataTransfer(); dt.items.add(new File([text], 'Lesson.vcv', { type: 'application/octet-stream' })); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); return 'assigned to #' + inp.id + ' (' + inputs.length + ' inputs)'; }, vcv);
  log.push('C: ' + assigned); await sleep(2500);
  await page.screenshot({ path: `${OUT}/C-scripted-import.png` });
  log.push('userfiles: ' + JSON.stringify(await page.evaluate(() => Module.FS.readdir('/userfiles'))));
  fs.writeFileSync(`${OUT}/log.txt`, log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
