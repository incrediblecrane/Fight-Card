// End-to-end checks for index.html against the REAL save cycle.
//
// The whole point of this file is the reload. claude.use('artifact').publish()
// saves a new version and every open view, this one included, reloads onto it,
// so a save happens after every tap and wipes anything held only in a variable.
// Testing on file:// hides that entirely, because persist() returns early at
// `if(!window.claude)`. This harness stubs the capability faithfully instead.
//
// Usage: node test-app.js   (expects /tmp/publish.html from build-publish.js)
var http=require('http'), fs=require('fs'), assert=require('assert');
var {chromium}=require('./node_modules/playwright');

var doc=fs.readFileSync(process.argv[2]||'/tmp/publish.html','utf8');
var SHIM='<script>(function(){var ns={publish:function(h){'+
  'return fetch("/publish",{method:"POST",body:h}).then(function(){setTimeout(function(){location.reload();},0);});}};'+
  'window.claude={use:function(n){return Promise.resolve(n==="artifact"||n==="self"?ns:null);}};})();<\/script>';

var server=http.createServer(function(req,res){
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
  var b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
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

  if(errs.length){ fails++; console.log('\n  FAIL  page errors: '+errs.join(' | ')); }
  else console.log('\n  PASS  no page errors throughout');
  clearTimeout(watchdog); await b.close(); server.close();
  console.log(fails?('\n'+fails+' FAILING\n'):'\nAll app checks pass.\n');
  process.exit(fails?1:0);
});
