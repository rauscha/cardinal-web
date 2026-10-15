const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/out2'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const synthMouse = `(x,y,button,types)=>{const c=document.getElementById('canvas');for(const t of types){c.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button,buttons:t==='mousedown'?(button===2?2:1):0}));}}`;
const synthTouch = `(x,y)=>{const c=document.getElementById('canvas');const mk=(t)=>new TouchEvent(t,{bubbles:true,cancelable:true,touches:t==='touchend'?[]:[new Touch({identifier:1,target:c,clientX:x,clientY:y,pageX:x,pageY:y})],changedTouches:[new Touch({identifier:1,target:c,clientX:x,clientY:y,pageX:x,pageY:y})]});c.dispatchEvent(mk('touchstart'));setTimeout(()=>c.dispatchEvent(mk('touchend')),80);}`;
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const log = [];
  async function open(ctxOpts) { const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage(); page.on('pageerror', e => log.push('pageerror ' + e));
    await page.goto('http://127.0.0.1:8765/index.html'); for (let i=0;i<120;i++){ if (await page.evaluate(()=>document.getElementById('canvas_wrapper').style.display==='block')) break; await sleep(1000);} await sleep(500); return {ctx,page}; }
  // A: desktop, synthetic mouse only (no real input first)
  { const {ctx,page} = await open({ viewport:{width:1280,height:720} });
    await page.evaluate(`(${synthMouse})(900,500,2,['mousedown','mouseup','contextmenu'])`); await sleep(800);
    await page.screenshot({ path: `${OUT}/A-synth-rightclick-desktop.png` });
    await page.evaluate(`(${synthMouse})(22,14,0,['mousedown','mouseup'])`); await sleep(800);
    await page.screenshot({ path: `${OUT}/A2-synth-leftclick-filemenu.png` });
    await ctx.close(); }
  // B: desktop, real left click first, then synthetic right click
  { const {ctx,page} = await open({ viewport:{width:1280,height:720} });
    await page.mouse.click(640,600); await sleep(300);
    await page.evaluate(`(${synthMouse})(900,500,2,['mousedown','mouseup','contextmenu'])`); await sleep(800);
    await page.screenshot({ path: `${OUT}/B-real-then-synth-rightclick.png` });
    await ctx.close(); }
  // C: phone, real tap first, then synthetic TouchEvent tap on File menu
  { const {ctx,page} = await open({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
    await page.touchscreen.tap(422,300); await sleep(300);
    await page.evaluate(`(${synthTouch})(22,14)`); await sleep(800);
    await page.screenshot({ path: `${OUT}/C-phone-synth-touch-filemenu.png` });
    // real tap on File menu for comparison
    await page.touchscreen.tap(422,300); await sleep(300); await page.keyboard.press('Escape'); await sleep(200);
    await page.touchscreen.tap(22,14); await sleep(800);
    await page.screenshot({ path: `${OUT}/C2-phone-real-tap-filemenu.png` });
    // phone: synthetic mouse right click after real touch
    await page.keyboard.press('Escape'); await sleep(200);
    await page.evaluate(`(${synthMouse})(600,300,2,['mousedown','mouseup','contextmenu'])`); await sleep(800);
    await page.screenshot({ path: `${OUT}/C3-phone-synth-mouse-after-touch.png` });
    await ctx.close(); }
  fs.writeFileSync(`${OUT}/log.txt`, log.join('\n')); console.log(log.join('\n') || 'no page errors');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
