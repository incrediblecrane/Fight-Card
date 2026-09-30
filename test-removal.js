var http=require('http'),fs=require('fs'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});
srv.listen(0,async function(){
  var b=await env.launch();
  var p=await b.newPage({viewport:{width:420,height:900},hasTouch:true});
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.setDefaultTimeout(8000);
  var fails=0, ok=function(m){console.log('  PASS  '+m);}, bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForTimeout(500);
  var back=await p.$('[data-action="cancelsession"]'); if(back){await back.click(); await p.waitForTimeout(500);}
  await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);

  // The list renders only the first six, so counting rows proves nothing once
  // there are more than six sessions: deleting one just promotes the seventh.
  // Follow the id of the row that was actually removed instead.
  var ids=function(){ return p.evaluate(function(){
    return [].slice.call(document.querySelectorAll('[data-action="delsauna"]'))
      .map(function(e){ return e.getAttribute('data-id'); })
      .filter(function(v,i,a){ return a.indexOf(v)===i; }); }); };
  var before=await ids();
  console.log('sauna rows before:', before.length);

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
    var goneId=await p.evaluate(function(){
      var b=document.querySelector('.swipe.open [data-action="delsauna"]');
      return b?b.getAttribute('data-id'):null; });
    assert.ok(goneId,'no id on the row about to be removed');
    await p.click('.swipe.open .swipe-del'); await p.waitForTimeout(2600);
    var after=await ids();
    assert.ok(after.indexOf(goneId)<0,'the removed entry is still listed: '+goneId);
    ok('tapping Remove deletes the entry and it survives the save');
  }catch(e){ bad('remove deletes',e); }

  try{
    var bar=await p.$('.undo-bar');
    assert.ok(bar,'undo bar missing after the save-reload');
    ok('the undo offer survives the republish-and-reload');
  }catch(e){ bad('undo survives reload',e); }

  try{
    await p.click('[data-action="undo"]'); await p.waitForTimeout(2600);
    var restored=await ids();
    assert.ok(restored.indexOf(goneId)>-1,'undo did not put '+goneId+' back: '+restored.join(', '));
    assert.deepStrictEqual(restored, before, 'undo changed the list rather than restoring it');
    assert.strictEqual(await p.$('.undo-bar'), null, 'undo bar should clear');
    ok('Undo puts the entry back and clears the offer');
  }catch(e){ bad('undo restores',e); }

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll removal checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
