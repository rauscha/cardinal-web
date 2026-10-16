// Headless touch tests for the cardinal-web touch backend (phone viewport, synthetic TouchEvents).
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/out'; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PHASE = process.env.PHASE || '1';
const C = JSON.parse(process.env.COORDS || '{}');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--enable-features=WebAssemblySimd'] });
  const log = [];
  const ctx = await browser.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (!/^\[INFO/.test(t) || /patch|Loading/.test(t)) log.push('[console] ' + t.slice(0,200)); });
  page.on('pageerror', e => log.push('[pageerror] ' + e));
  await page.goto('http://127.0.0.1:8766/index.html');
  for (let i=0;i<180;i++){ if (await page.evaluate(()=>document.getElementById('canvas_wrapper').style.display==='block')) break; await sleep(1000);} await sleep(1500);
  // install synthetic touch helper
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    window.__touch = (type, active, changed) => {
      const mk = (p) => new Touch({ identifier: p.id, target: c, clientX: p.x, clientY: p.y, pageX: p.x, pageY: p.y, screenX: p.x, screenY: p.y });
      c.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: active.map(mk), targetTouches: active.map(mk), changedTouches: changed.map(mk) }));
    };
  });
  const T = (type, active, changed) => page.evaluate(([t,a,ch]) => window.__touch(t,a,ch), [type, active, changed || active]);
  const shot = (n) => page.screenshot({ path: `${OUT}/${PHASE}-${n}.png` });
  const audioState = () => page.evaluate(() => { const W = Module.WebAudioBridge; return W && W.audioContext && W.audioContext.state; });

  // real tap on the start button
  await page.tap('#start-btn').catch(()=>{}); await sleep(1000);
  log.push('audio ' + await audioState());
  await shot('0-loaded');

  if (PHASE === '1') {
    // 1. long-press on empty rack (below the module row) -> module browser should open after 450 ms
    const bg = { id: 1, x: 700, y: 330 };
    await T('touchstart', [bg]); await sleep(250); await shot('1a-hold-250ms-nothing-yet');
    await sleep(450); await shot('1b-hold-700ms-browser-open');
    await T('touchend', [], [bg]); await sleep(400); await shot('1c-lift-in-place-browser-stays');
    await page.keyboard.press('Escape'); await sleep(400); await shot('1d-escape');
    // 2. jittery long-press (3 px wobble) still opens
    const j = { id: 2, x: 700, y: 330 };
    await T('touchstart', [j]);
    for (let i = 0; i < 10; i++) { await sleep(50); const p = { id: 2, x: 700 + (i % 2 ? 3 : -3), y: 330 + (i % 3 ? 2 : -2) }; await T('touchmove', [p]); }
    await sleep(200); await shot('2a-jitter-hold-browser-open');
    await T('touchend', [], [j]); await sleep(300); await page.keyboard.press('Escape'); await sleep(400);
    // 3. one-finger drag beyond slop on empty rack = selection box (stock behaviour), must not open a menu
    const d = { id: 3, x: 650, y: 330 };
    await T('touchstart', [d]); await sleep(100);
    for (let i = 1; i <= 8; i++) { await T('touchmove', [{ id: 3, x: 650 + i * 15, y: 330 - i * 5 }]); await sleep(40); }
    await shot('3a-drag-selection-box');
    await T('touchend', [], [{ id: 3, x: 770, y: 290 }]); await sleep(600); await shot('3b-after-drag-no-menu');
    // 4. two-finger pan right by 200 px
    let a = { id: 4, x: 350, y: 300 }, b = { id: 5, x: 450, y: 300 };
    await T('touchstart', [a], [a]); await sleep(30); await T('touchstart', [a, b], [b]); await sleep(50);
    for (let i = 1; i <= 10; i++) { a = { id: 4, x: 350 + i * 20, y: 300 }; b = { id: 5, x: 450 + i * 20, y: 300 }; await T('touchmove', [a, b]); await sleep(30); }
    await T('touchend', [b], [a]); await T('touchend', [], [b]); await sleep(600); await shot('4-after-pan-right-200');
    // 5. pinch out x2 around (420,200)
    a = { id: 6, x: 370, y: 200 }; b = { id: 7, x: 470, y: 200 };
    await T('touchstart', [a], [a]); await sleep(30); await T('touchstart', [a, b], [b]); await sleep(50);
    for (let i = 1; i <= 10; i++) { a = { id: 6, x: 370 - i * 5, y: 200 }; b = { id: 7, x: 470 + i * 5, y: 200 }; await T('touchmove', [a, b]); await sleep(30); }
    await T('touchend', [b], [a]); await T('touchend', [], [b]); await sleep(600); await shot('5-after-pinch-out-x2');
    // 6. pinch in back
    a = { id: 8, x: 320, y: 200 }; b = { id: 9, x: 520, y: 200 };
    await T('touchstart', [a], [a]); await sleep(30); await T('touchstart', [a, b], [b]); await sleep(50);
    for (let i = 1; i <= 10; i++) { a = { id: 8, x: 320 + i * 5, y: 200 }; b = { id: 9, x: 520 - i * 5, y: 200 }; await T('touchmove', [a, b]); await sleep(30); }
    await T('touchend', [b], [a]); await T('touchend', [], [b]); await sleep(600); await shot('6-after-pinch-in');
  }
  if (PHASE === '2') {
    // a. quick tap on the module title: must NOT open a menu
    await T('touchstart', [{ id: 20, x: C.mx, y: C.my }]); await sleep(120); await T('touchend', [], [{ id: 20, x: C.mx, y: C.my }]); await sleep(1500); await shot('a-after-quick-tap-no-menu');
    // b. tap RUN: toggles the RUN light
    await T('touchstart', [{ id: 21, x: C.runx, y: C.runy }]); await sleep(100); await T('touchend', [], [{ id: 21, x: C.runx, y: C.runy }]); await sleep(1500); await shot('b-after-tap-run');
    log.push('audio after RUN tap ' + await audioState());
    await T('touchstart', [{ id: 22, x: C.runx, y: C.runy }]); await sleep(100); await T('touchend', [], [{ id: 22, x: C.runx, y: C.runy }]); await sleep(1200);
    // c. knob drag: TEMPO up 60 px
    await T('touchstart', [{ id: 23, x: C.knobx, y: C.knoby }]); await sleep(60);
    for (let i = 1; i <= 10; i++) { await T('touchmove', [{ id: 23, x: C.knobx, y: C.knoby - i * 6 }]); await sleep(30); }
    await T('touchend', [], [{ id: 23, x: C.knobx, y: C.knoby - 60 }]); await sleep(1500); await shot('c-after-knob-drag-up');
    // d. jittery long-press on module title, wait long enough for the renderer
    await T('touchstart', [{ id: 24, x: C.mx, y: C.my }]);
    for (let i = 0; i < 10; i++) { await sleep(50); await T('touchmove', [{ id: 24, x: C.mx + (i % 2 ? 3 : -3), y: C.my + (i % 3 ? 2 : -2) }]); }
    await sleep(1500); await shot('d-jitter-hold-menu-open');
    await T('touchend', [], [{ id: 24, x: C.mx, y: C.my }]); await sleep(1500); await shot('e-lift-in-place-menu-stays');
    // menu stays open here for row coordinate reading
  }
  if (PHASE === '3') {
    // long-press, slide to a row, lift -> row activates
    await T('touchstart', [{ id: 30, x: C.mx, y: C.my }]); await sleep(900);
    const steps = 10;
    for (let i = 1; i <= steps; i++) { await T('touchmove', [{ id: 30, x: C.mx + C.rowdx * i / steps, y: C.my + C.rowdy * i / steps }]); await sleep(40); }
    await sleep(1500); await shot('f-slid-to-row-highlight');
    await T('touchend', [], [{ id: 30, x: C.mx + C.rowdx, y: C.my + C.rowdy }]); await sleep(1500); await shot('g-after-lift-row-activated');
    // tap a row after a lift-in-place menu
    await T('touchstart', [{ id: 31, x: C.mx, y: C.my }]); await sleep(900); await T('touchend', [], [{ id: 31, x: C.mx, y: C.my }]); await sleep(800);
    await T('touchstart', [{ id: 32, x: C.mx + C.rowdx, y: C.my + C.rowdy }]); await sleep(100); await T('touchend', [], [{ id: 32, x: C.mx + C.rowdx, y: C.my + C.rowdy }]); await sleep(1500); await shot('h-after-tap-row');
  }
  fs.writeFileSync(`${OUT}/log-${PHASE}.txt`, log.join('\n')); console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
