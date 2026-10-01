// End-to-end checks for index.html against the REAL save cycle.
//
// The whole point of this file is the reload. claude.use('artifact').publish()
// saves a new version and every open view, this one included, reloads onto it,
// so a save happens after every tap and wipes anything held only in a variable.
// Testing on file:// hides that entirely, because persist() returns early at
// `if(!window.claude)`. This harness stubs the capability faithfully instead.
//
// Usage: node test-app.js   (expects the published document from build-publish.js)
var http=require('http'), fs=require('fs'), assert=require('assert');
var env=require('./test-env.js');

var doc=(process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):env.readDoc());

/* A warm-up whose ONLY entries are light sets at a weight. There is nothing to
   plot on a minutes chart, and reading the personal best off an empty series
   took the whole progress tab down. Seeded here because a suite that logs a
   few minutes along the way can never reach the empty case. */
(function seedOnlyLightSets(){
  var i=doc.lastIndexOf(')({')+2, j=doc.lastIndexOf(');</'+'script>');
  var st=JSON.parse(doc.slice(i,j));
  // Clear every existing warm-up first. Built against the repo seed the
  // premise held by luck; built against live state, which already has warm-up
  // minutes in it, the chart had something to plot and the empty case was
  // never reached. The check has to construct its own world.
  (st.workoutLogs||[]).forEach(function(l){ if(l.logs){ delete l.logs.warmup; delete l.logs.press_ohp; } });
  st.workoutLogs=(st.workoutLogs||[]).concat([{
    id:'wl-lightsets', workoutId:'w6', title:'Push', tag:'Strength', date:'2026-08-28',
    logs:{ warmup:[
      {v:10, w:20, opt:'Light sets of the first lift', lvl:'', lvlKind:'load'},
      {v:5,  w:40, opt:'Light sets of the first lift', lvl:'', lvlKind:'load'}
    ],
    // A lift whose every set was marked warm-up: no working set to chart.
    press_ohp:[{v:10, w:20, wu:true},{v:6, w:30, wu:true}]}
  }]);
  doc=doc.slice(0,i)+JSON.stringify(st)+doc.slice(j);
})();
/* A world of its own for the exercise history: every log replaced, so what the
   progress page counts is exactly what is below. A bench session with three
   working sets between a warm-up and a cool-down, goblet squats with no
   weight, and a plank session saved out of date order, the way a backfilled
   log lands on the end of the list. */
function localKey(o){ var d=new Date(); d.setDate(d.getDate()-o);
  var q=function(n){return String(n).padStart(2,'0');};
  return d.getFullYear()+'-'+q(d.getMonth()+1)+'-'+q(d.getDate()); }
var progDoc=(function(){
  var i=doc.lastIndexOf(')({')+2, j=doc.lastIndexOf(');</'+'script>');
  var st=JSON.parse(doc.slice(i,j));
  st.activeSession=null;
  st.workoutLogs=[
    {id:'wl-a', workoutId:'w6', title:'Push', tag:'Strength', date:localKey(2), logs:{
      warmup:[{v:8, w:null, opt:'Bike', lvl:'6', lvlKind:'resistance'}],
      press_bench:[{v:5,w:20},{v:5,w:22.5},{v:5,w:25}],
      sq_goblet:[{v:10,w:null},{v:12,w:null}],
      cooldown:[{v:5, w:null, opt:'Walk', lvl:'', lvlKind:'effort'}]}},
    {id:'wl-b', workoutId:'w1', title:'Strength', tag:'Strength', date:localKey(5), logs:{
      pullup:[{v:8,w:null}]}},
    {id:'wl-c', workoutId:'w1', title:'Strength', tag:'Strength', date:localKey(1), logs:{
      plank:[{v:40,w:null}]}},
    {id:'wl-d', workoutId:'w1', title:'Strength', tag:'Strength', date:localKey(9), logs:{
      plank:[{v:30,w:null}]}}
  ];
  return doc.slice(0,i)+JSON.stringify(st)+doc.slice(j);
})();
var SHIM='<script>(function(){var ns={publish:function(h){'+
  'return fetch("/publish",{method:"POST",body:h}).then(function(){setTimeout(function(){location.reload();},0);});}};'+
  'window.claude={use:function(n){return Promise.resolve(n==="artifact"||n==="self"?ns:null);}};})();<\/script>';

var server=http.createServer(function(req,res){
  // /capture: publish only records the document, so a page with a fake clock
  // is never reloaded out from under it.
  if(req.url==='/capture'){
    var cap=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'')
      .replace('<body>','<body><script>window.claude={use:function(n){return Promise.resolve(n==="artifact"?'+
        '{publish:function(h){window.__pub=h;return Promise.resolve();}}:null);}};<\/script>');
    res.setHeader('content-type','text/html; charset=utf-8'); res.end(cap); return;
  }
  if(req.url==='/prog'){
    var pd=progDoc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'')
      .replace('<body>','<body><script>window.claude={use:function(n){return Promise.resolve(n==="artifact"?'+
        '{publish:function(h){return Promise.resolve();}}:null);}};<\/script>');
    res.setHeader('content-type','text/html; charset=utf-8'); res.end(pd); return;
  }
  if(req.url==='/publish'&&req.method==='POST'){
    var c=[]; req.on('data',function(x){c.push(x);});
    req.on('end',function(){ doc=Buffer.concat(c).toString('utf8'); res.end('ok'); });
    return;
  }
  // No egress in CI: a font stylesheet that never resolves leaves the document
  // in readyState 'loading' and looks exactly like an app bug.
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'')
             .replace('<body>','<body>'+SHIM);
  res.setHeader('content-type','text/html; charset=utf-8');
  res.setHeader('content-length',Buffer.byteLength(out));
  res.end(out);
});

var fails=0;
function ok(label){ console.log('  PASS  '+label); }
function bad(label,e){ fails++; console.log('  FAIL  '+label+'\n        '+e.message); }

server.listen(0, async function(){
  var URL='http://127.0.0.1:'+server.address().port+'/';
  var b=await env.launch();
  var ctx=await b.newContext({viewport:{width:420,height:900}});
  var p=await ctx.newPage(), errs=[];
  ctx.setDefaultTimeout(8000);
  // A hang must surface as a failure, never as a silent stall.
  var watchdog=setTimeout(function(){ console.log('\n  FAIL  suite timed out'); process.exit(1); },150000);
  p.on('pageerror',function(e){errs.push(e.message);});

  var toToday=async function(pg){ pg=pg||p; var t=await pg.$('[data-action="tab"][data-tab="today"]');
    if(t){ await t.click(); await pg.waitForTimeout(250);} };
  var key=function(o){ return p.evaluate(function(oo){ var d=new Date(); d.setDate(d.getDate()-oo);
    var q=function(n){return String(n).padStart(2,'0');};
    return d.getFullYear()+'-'+q(d.getMonth()+1)+'-'+q(d.getDate()); },o); };
  var pick=async function(v){ await toToday(); await p.$eval('#logdate',function(el,x){
    el.value=x; el.dispatchEvent(new Event('change',{bubbles:true})); },v); await p.waitForTimeout(250); };
  var bar=function(pg){ return (pg||p).$('.backfill-bar'); };
  var tap=async function(sel){ await toToday(); await p.click(sel); await p.waitForTimeout(2300); };

  console.log('\nA WARM-UP OF NOTHING BUT LIGHT SETS');
  try{
    await p.goto(URL); await p.waitForTimeout(700);
    var back0=await p.$('[data-action="cancelsession"]');
    if(back0){ await back0.click(); await p.waitForTimeout(400); }
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(700);
    var before=errs.length;
    var opened=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.exrow .top h4'));
      for(var i=0;i<rows.length;i++){
        if(rows[i].textContent.trim()==='Warm-up'){ rows[i].closest('.top').click(); return true; }
      }
      return false;
    });
    assert.ok(opened,'the warm-up is not in the exercise history');
    await p.waitForTimeout(700);
    assert.strictEqual(errs.length,before,'opening it threw: '+errs.slice(before).join(' | '));
    var detail=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.exrow'));
      for(var i=0;i<rows.length;i++){
        var h=rows[i].querySelector('.top h4');
        if(h && h.textContent.trim()==='Warm-up') return rows[i].innerText;
      }
      return '';
    });
    assert.ok(/40kg × 5/.test(detail),'the light set is not listed: '+detail.slice(0,200));
    assert.ok(/sets at a weight/i.test(detail),
      'no explanation of why there is no time trend: '+detail.slice(0,200));
    ok('it opens, explains why there is no time trend, and lists the sets');
  }catch(e){ bad('light-sets-only warm-up',e); }
  try{
    var before2=errs.length;
    var opened2=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.exrow .top h4'));
      for(var i=0;i<rows.length;i++){
        if(rows[i].textContent.trim()==='Overhead press'){ rows[i].closest('.top').click(); return true; }
      }
      return false;
    });
    assert.ok(opened2,'the overhead press is not in the exercise history');
    await p.waitForTimeout(700);
    assert.strictEqual(errs.length,before2,'opening it threw: '+errs.slice(before2).join(' | '));
    var detail2=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.exrow'));
      for(var i=0;i<rows.length;i++){
        var h=rows[i].querySelector('.top h4');
        if(h && h.textContent.trim()==='Overhead press') return rows[i].innerText;
      }
      return '';
    });
    assert.ok(/30kg/.test(detail2),'the warm-up sets are not listed: '+detail2.slice(0,200));
    assert.ok(!/rather than minutes/i.test(detail2),'it says these were not minutes: '+detail2.slice(0,200));
    assert.ok(/warm-up/i.test(detail2) && /no working set|only warm-up|all warm-up/i.test(detail2),
      'no explanation that every set was a warm-up: '+detail2.slice(0,200));
    ok('a lift logged only as warm-ups says so, not that it was not minutes');
  }catch(e){ bad('warm-ups-only lift',e); }

  console.log('\nEXERCISE HISTORY');
  var pctx=await b.newContext({viewport:{width:420,height:900}}), pp=await pctx.newPage();
  pctx.setDefaultTimeout(8000); pp.on('pageerror',function(e){errs.push(e.message);});
  var exRow=function(name){ return pp.evaluate(function(n){
    var rows=[].slice.call(document.querySelectorAll('.exrow'));
    for(var i=0;i<rows.length;i++){ var h=rows[i].querySelector('.top h4');
      if(h && h.textContent.trim()===n) return {last:rows[i].querySelector('.last').textContent, text:rows[i].innerText}; }
    return null; },name); };
  var openEx=async function(name){ await pp.evaluate(function(n){
    [].slice.call(document.querySelectorAll('.exrow .top')).forEach(function(t){
      if(t.querySelector('h4').textContent.trim()===n) t.click(); }); },name); await pp.waitForTimeout(300); };
  try{
    await pp.goto(URL+'prog'); await pp.waitForSelector('#app *');
    await pp.click('[data-action="tab"][data-tab="progress"]'); await pp.waitForTimeout(400);
  }catch(e){ bad('the progress page opens',e); }
  try{
    var bench=await exRow('Bench press');
    assert.ok(bench,'no bench press row');
    assert.ok(/^25kg × 5/.test(bench.last),'the row leads with '+bench.last);
    ok('an exercise row leads with the last set logged, not the first');
  }catch(e){ bad('latest set on the row',e); }
  try{
    await openEx('Goblet squat');
    var gob=await exRow('Goblet squat');
    assert.ok(/Personal best\s*12 reps/.test(gob.text),'goblet squat read: '+gob.text.replace(/\s+/g,' ').slice(0,200));
    assert.ok(!/0kg/.test(gob.text),'a weightless lift reads as 0kg');
    ok('a lift never logged with a weight charts its reps, not 0kg');
  }catch(e){ bad('best set with no weight',e); }
  try{
    var order=await pp.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.exrow .top h4')).map(function(h){ return h.textContent.trim(); }); });
    assert.ok(order.indexOf('Plank')>-1 && order.indexOf('Pull-up')>-1,'order: '+order.join(', '));
    assert.ok(order.indexOf('Plank')<order.indexOf('Pull-up'),
      'a log saved out of date order sank the plank below an older pull-up: '+order.join(', '));
    ok('the exercise list is ordered by the newest date, whatever order the logs were saved in');
  }catch(e){ bad('exercise list order',e); }
  try{
    var tile=await pp.evaluate(function(){
      var tiles=[].slice.call(document.querySelectorAll('.stat-tile'));
      for(var i=0;i<tiles.length;i++){ var l=tiles[i].querySelector('.l');
        if(l && l.textContent.trim()==='sets logged') return tiles[i].querySelector('.n').textContent.trim(); }
      return null; });
    // 3 bench + 2 goblet + 1 pull-up + 2 planks; the warm-up and cool-down are not sets.
    assert.strictEqual(tile,'8','the sets tile read '+tile);
    var recent=await pp.evaluate(function(){ return document.body.innerText; });
    assert.ok(/Push[\s\S]{0,40}5 sets/.test(recent),'the recent row did not say 5 sets');
    ok('the sets tile and the recent row leave out the warm-up and cool-down');
  }catch(e){ bad('prep steps are not sets',e); }
  try{
    var body=await pp.evaluate(function(){ return document.body.innerText; });
    assert.ok(/Day streak/.test(body) && !/Days tracked/.test(body),'the streak is still labelled "Days tracked"');
    ok('the streak is labelled a streak');
  }catch(e){ bad('streak label',e); }
  await pctx.close();

  console.log('\nBACKFILL');
  await p.goto(URL); await p.waitForTimeout(400); await toToday();
  var back=await key(3);

  try{
    assert.strictEqual(await p.$eval('#logdate',function(e){return e.min;}), await key(13));
    assert.strictEqual(await p.$eval('#logdate',function(e){return e.max;}), await key(0));
    ok('the picker offers a 14-day window and no future dates');
  }catch(e){ bad('14-day window',e); }

  try{
    await pick(await key(40)); assert.strictEqual(await bar(), null);
    await pick('2030-01-01'); assert.strictEqual(await bar(), null);
    ok('dates outside the window are rejected by the handler, not just the input');
  }catch(e){ bad('out-of-range rejected',e); }

  try{
    await pick(back);
    for(var i=0;i<4;i++){ await tap('[data-action="water"][data-d="1"]');
      assert.ok(await bar(),'lost the date after entry '+(i+1)); }
    ok('the date survives four saves in a row (each one republishes and reloads)');
  }catch(e){ bad('date survives repeated entries',e); }

  try{
    await toToday(); await p.fill('#sauna-mins','15');
    await p.click('[data-action="logsauna"]'); await p.waitForTimeout(2300);
    assert.ok(await bar()); ok('a sauna entry keeps the date too');
  }catch(e){ bad('sauna keeps the date',e); }

  try{
    await p.reload(); await p.waitForTimeout(500);
    assert.ok(await bar(),'a reload in the same tab must keep the date');
    ok('a reload in the same tab keeps the date');
  }catch(e){ bad('reload keeps the date',e); }

  try{
    await toToday(); await p.click('.backfill-bar button'); await p.waitForTimeout(500);
    assert.strictEqual(await bar(), null); ok('Back to today clears it on demand');
  }catch(e){ bad('manual clear',e); }

  try{
    await pick(back); await tap('[data-action="water"][data-d="1"]');
    assert.ok(await bar());
    await ctx.close();
    ctx=await b.newContext({viewport:{width:420,height:900}});
    ctx.setDefaultTimeout(8000);
    p=await ctx.newPage(); p.on('pageerror',function(e){errs.push(e.message);});
    await p.goto(URL); await p.waitForTimeout(500); await toToday();
    assert.strictEqual(await bar(), null,'closing the app must clear the date');
    ok('closing and reopening the app returns to today');
  }catch(e){ bad('app close clears the date',e); }

  try{
    await toToday();
    var dots=await p.$$('.dot.pickable');
    assert.ok(dots.length>=7,'week dots should be tappable');
    await dots[1].click(); await p.waitForTimeout(400);
    assert.ok(await bar()); ok('tapping a week dot jumps to that day');
  }catch(e){ bad('week dot shortcut',e); }

  try{
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    assert.ok(await bar(),'the bar must follow onto Training, where sessions start');
    ok('the bar follows you onto every tab');
  }catch(e){ bad('bar on every tab',e); }

  console.log('\nDATA LANDS ON THE RIGHT DAY');
  try{
    await pick(back); await tap('[data-action="water"][data-d="1"]');
    await toToday(); await p.click('.backfill-bar button'); await p.waitForTimeout(600);
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);
    var tips=await p.$$eval('.chart svg title',function(n){return n.map(function(x){return x.textContent;});});
    var onBack=tips.filter(function(t){return t.indexOf(back)===0 && t.indexOf('L')>-1;});
    var today=await key(0);
    var onToday=tips.filter(function(t){return t.indexOf(today)===0 && t.indexOf('L')>-1;});
    assert.ok(onBack.length,'backdated water missing from '+back);
    console.log('        '+back+': '+onBack.join(' | '));
    console.log('        '+today+': '+onToday.join(' | '));
    ok('backdated entries land on the picked day, today is untouched');
  }catch(e){ bad('backdated data lands correctly',e); }

  console.log('\nSESSION DATE');
  try{
    var start=await key(4);
    await pick(start);
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(300);
    await p.click('[data-action="startworkout"]'); await p.waitForTimeout(450);
    await p.fill('input[id^="log-v-"]','10');
    var w=await p.$('input[id^="log-w-"]'); if(w) await w.fill('40');
    await p.click('[data-action="logset"]'); await p.waitForTimeout(300);
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await toToday(); await p.click('.backfill-bar button'); await p.waitForTimeout(600);
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    await p.click('[data-action="resumesession"]'); await p.waitForTimeout(450);
    for(var k=0;k<25;k++){ var n=await p.$('[data-action="nextslide"]'); if(!n) break;
      await n.click(); await p.waitForTimeout(80); }
    var fin=await p.$('[data-action="finishworkout"]'); assert.ok(fin,'never reached Finish');
    await fin.click(); await p.waitForTimeout(2500);
    var rows=await p.evaluate(function(){ return Array.prototype.slice.call(
      document.querySelectorAll('.recent-log')).map(function(e){return e.textContent;}); });
    assert.ok(rows.some(function(r){return r.indexOf(start)>-1;}),
      'a session must carry its START date '+start+', got: '+rows.slice(0,4).join(' / '));
    ok('a session is logged against the day it STARTED, not the day it finished');
  }catch(e){ bad('session start date',e); }

  console.log('\nA TAB LEFT OPEN PAST MIDNIGHT');
  var mctx=null, mp=null, seedOf=null, day0=null;
  // Today mode used to hold the date string read at load, so after midnight a
  // tap still went to yesterday, with the backfill bar claiming it was chosen.
  try{
    seedOf=function(d){ return JSON.parse(d.slice(d.lastIndexOf(')({')+2, d.lastIndexOf(');</'+'script>'))); };
    day0=JSON.stringify(seedOf(doc).days['2026-09-30']||null);
    mctx=await b.newContext({viewport:{width:420,height:900},timezoneId:'UTC'});
    mctx.setDefaultTimeout(8000);
    mp=await mctx.newPage(); mp.on('pageerror',function(e){errs.push(e.message);});
    await mp.clock.install({time:new Date('2026-09-30T23:58:00Z')});
    await mp.goto(URL+'capture'); await mp.waitForSelector('#app *');
    var mb=await mp.$('[data-action="cancelsession"]'); if(mb){ await mb.click(); }
    await mp.click('[data-action="tab"][data-tab="today"]');
    assert.strictEqual(await mp.$eval('#logdate',function(e){return e.value;}),'2026-09-30');
    await mp.clock.fastForward('05:00');
    await mp.evaluate(function(){ document.dispatchEvent(new Event('visibilitychange')); });
    assert.strictEqual(await mp.$eval('#logdate',function(e){return e.value;}),'2026-10-01',
      'looking at the tab again after midnight did not move the cards to the new day');
    ok('looking at the tab again after midnight moves the cards to the new day');
  }catch(e){ bad('past midnight, on looking again',e); }
  try{
    await mp.click('[data-action="water"][data-d="1"]');
    await mp.waitForFunction(function(){ return !!window.__pub; });
    var got=seedOf(await mp.evaluate(function(){ return window.__pub; })).days;
    assert.ok(!(await mp.$('.backfill-bar')),'the backfill bar is up though nobody picked a day');
    assert.strictEqual((got['2026-10-01']||{}).water,1,'the tap did not land on 2026-10-01');
    // An untouched blank day for the day the tab was opened is not a write to
    // it; whether the seed already has one depends on the real date the suite runs.
    var y0=got['2026-09-30']||null; if(day0==='null' && y0 && !y0.touched && !y0.water) y0=null;
    assert.strictEqual(JSON.stringify(y0),day0,'yesterday was written to');
    ok('after midnight a tap lands on the new day, not yesterday');
  }catch(e){ bad('past midnight, on the next tap',e); }
  if(mctx) await mctx.close();

  if(errs.length){ fails++; console.log('\n  FAIL  page errors: '+errs.join(' | ')); }
  else console.log('\n  PASS  no page errors throughout');
  clearTimeout(watchdog); await b.close(); server.close();
  console.log(fails?('\n'+fails+' FAILING\n'):'\nAll app checks pass.\n');
  process.exit(fails?1:0);
});
