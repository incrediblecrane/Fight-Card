var http=require('http'),fs=require('fs'),assert=require('assert');
var {chromium}=require('/home/user/Fight-Card/node_modules/playwright');
var doc=fs.readFileSync('/tmp/publish.html','utf8');
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});
srv.listen(0,async function(){
  var b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  var p=await b.newPage({viewport:{width:420,height:900},hasTouch:true});
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.setDefaultTimeout(8000);
  var fails=0, ok=function(m){console.log('  PASS  '+m);}, bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForTimeout(500);
  var back=await p.$('[data-action="cancelsession"]'); if(back){await back.click(); await p.waitForTimeout(500);}
  await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);

  var count=function(){ return p.evaluate(function(){
    var h=document.body.innerHTML; var m=h.match(/data-action="delsauna"/g); return m?m.length/2:0; }); };
  var before=await count();
  console.log('sauna rows before:', before);

  try{
    // swipe left on the first sauna row
    var rows=await p.$$('[data-swipe]');
    var target=null;
    for(var i=0;i<rows.length;i++){ var t=await rows[i].$('[data-action="delsauna"]'); if(t){ target=rows[i]; break; } }
    assert.ok(target,'no sauna row found');
    var box=await target.boundingBox();
    await p.touchscreen.tap(box.x+box.width-30, box.y+box.height/2).catch(function(){});
    await target.dispatchEvent('touchstart',{touches:[{clientX:box.x+box.width-20,clientY:box.y+box.height/2}]}).catch(function(){});
    await p.evaluate(function(){
      var r=document.querySelector('[data-swipe]');
      var mk=function(t,x){ return new TouchEvent(t,{bubbles:true,cancelable:true,
        touches:t==='touchend'?[]:[new Touch({identifier:1,target:r,clientX:x,clientY:10})],
        changedTouches:[new Touch({identifier:1,target:r,clientX:x,clientY:10})]}); };
      r.dispatchEvent(mk('touchstart',300)); r.dispatchEvent(mk('touchend',180));
    });
    await p.waitForTimeout(400);
    var opened=await p.evaluate(function(){ return !!document.querySelector('.swipe.open'); });
    assert.ok(opened,'swipe left did not reveal Remove');
    ok('swiping a row left reveals Remove');
  }catch(e){ bad('swipe reveals Remove',e); }

  try{
    await p.click('.swipe.open .swipe-del'); await p.waitForTimeout(2600);
    var after=await count();
    assert.strictEqual(after, before-1, 'row count went '+before+' -> '+after);
    ok('tapping Remove deletes the entry and it survives the save');
  }catch(e){ bad('remove deletes',e); }

  try{
    var bar=await p.$('.undo-bar');
    assert.ok(bar,'undo bar missing after the save-reload');
    ok('the undo offer survives the republish-and-reload');
  }catch(e){ bad('undo survives reload',e); }

  try{
    await p.click('[data-action="undo"]'); await p.waitForTimeout(2600);
    var restored=await count();
    assert.strictEqual(restored, before, 'after undo count is '+restored+', expected '+before);
    assert.strictEqual(await p.$('.undo-bar'), null, 'undo bar should clear');
    ok('Undo puts the entry back and clears the offer');
  }catch(e){ bad('undo restores',e); }

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll removal checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
