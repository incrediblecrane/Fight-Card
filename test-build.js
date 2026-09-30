// build-publish.js and the document it writes: that the build does not depend
// on accidents of the source (a first key, a line ending), and that the page
// ends up with exactly one stylesheet, the current CSS.
var fs=require('fs'), os=require('os'), path=require('path'), assert=require('assert');
var cp=require('child_process');
var env=require('./test-env.js');
var h=fs.readFileSync(__dirname+'/index.html','utf8');
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fc-build-'));
var CSS=eval('"'+h.match(/var CSS = "([\s\S]*?)";\r?\n/)[1]+'"');
function build(args){
  return cp.execFileSync(process.execPath,[__dirname+'/build-publish.js'].concat(args),{encoding:'utf8',stdio:'pipe'});
}
var fails=0;
async function t(name,fn){
  try{ await fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+String(e.stderr||e.message).split('\n').slice(0,4).join('\n        ')); }
}

(async function(){
  console.log('\nTHE BUILD FINDS ITS INPUTS BY STRUCTURE');
  await t('a document whose seed does not start with waterTarget builds again', function(){
    // Live state pulled off the artifact has its keys in whatever order the
    // store gave them; the build used to search for `)({"waterTarget"`.
    var seed=JSON.parse(h.slice(h.lastIndexOf(')({')+2, h.lastIndexOf(');</'+'script>')));
    var st={days:seed.days}; Object.keys(seed).forEach(function(k){ if(k!=='days') st[k]=seed[k]; });
    fs.writeFileSync(tmp+'/state.json',JSON.stringify(st));
    build([tmp+'/one.html','--state',tmp+'/state.json']);
    assert.ok(fs.readFileSync(tmp+'/one.html','utf8').indexOf(')({"days"')>0,'the reordered seed did not ship');
    build([tmp+'/two.html','--src',tmp+'/one.html']);
    assert.ok(fs.readFileSync(tmp+'/two.html','utf8')===fs.readFileSync(tmp+'/one.html','utf8'),
      'feeding a build back in did not reproduce it');
  });
  await t('an index.html checked out with CRLF line endings builds', function(){
    fs.writeFileSync(tmp+'/crlf.html',h.replace(/\r?\n/g,'\r\n'));
    build([tmp+'/crlf-out.html','--src',tmp+'/crlf.html']);
  });

  console.log('\nONE STYLESHEET, AND IT IS THE CURRENT ONE');
  var b=await env.launch(), p=await b.newPage();
  var errs=[]; p.on('pageerror',function(e){ errs.push(e.message); });
  var STUB='<script>window.claude={use:function(n){ return Promise.resolve(n==="artifact"?'+
    '{publish:function(d){ window.__pub=d; return Promise.resolve(); }}:null); }};<\/script>';
  var load=async function(doc){
    await p.setContent(doc.replace(/<link rel="stylesheet"[^>]*>/,'').replace('<body>','<body>'+STUB));
    await p.waitForSelector('#app *');
  };
  var styles=function(){ return p.evaluate(function(){
    return [].map.call(document.querySelectorAll('style'),function(s){ return s.textContent; }); }); };
  var one=async function(where){
    var s=await styles();
    assert.strictEqual(s.length,1,where+' has '+s.length+' <style> elements');
    assert.ok(s[0]===CSS,where+'\'s stylesheet is not the current CSS ('+s[0].length+' chars, CSS is '+CSS.length+')');
  };
  await t('the published document', async function(){ await load(env.readDoc()); await one('the published document'); });
  await t('index.html as it sits in the repo', async function(){ await load(h); await one('index.html'); });
  await t('the document the app writes when it saves itself', async function(){
    // No db, so a tap goes the old way: the app regenerates its own document.
    await load(env.readDoc());
    await p.click('[data-action="tab"][data-tab="today"]');
    await p.click('[data-action="water"][data-d="1"]');
    await p.waitForFunction(function(){ return !!window.__pub; });
    var doc=await p.evaluate(function(){ return window.__pub; });
    await load(doc); await one('the self-saved document');
  });
  await t('no page errors', function(){ assert.deepStrictEqual(errs,[],errs.join(' | ')); });

  console.log('\nUSER TEXT CANNOT END THE SCRIPT');
  // The state is inlined in a <script>. A note holding `</script` ended it
  // early, and `<!--` then `<script` made the parser swallow the real closing
  // tag: either way the regenerated page came up blank.
  var NOTES=['End </script> x','<!-- a <script> b'];
  var notesShown=async function(where){
    await p.click('[data-action="tab"][data-tab="training"]');
    var txt=await p.evaluate(function(){ return document.body.innerText; });
    NOTES.forEach(function(n){ assert.ok(txt.indexOf(n)>-1,where+' lost the note '+JSON.stringify(n)); });
  };
  var loadQuick=async function(doc){
    errs=[];
    await p.setContent(doc.replace(/<link rel="stylesheet"[^>]*>/,'').replace('<body>','<body>'+STUB));
    await p.waitForTimeout(300);
    var n=await p.evaluate(function(){ var a=document.getElementById('app'); return a?a.children.length:-1; });
    assert.ok(n>0,'#app is empty; page errors: '+errs.join(' | '));
    assert.deepStrictEqual(errs,[],errs.join(' | '));
  };
  var built=tmp+'/notes.html';
  await t('a build --state whose notes hold </script and <!-- loads with the notes intact', async function(){
    var seed=JSON.parse(h.slice(h.lastIndexOf(')({')+2, h.lastIndexOf(');</'+'script>')));
    seed.library=[{id:'n1',title:'Close',tag:'Note',notes:NOTES[0]},{id:'n2',title:'Open',tag:'Note',notes:NOTES[1]}];
    fs.writeFileSync(tmp+'/notes.json',JSON.stringify(seed));
    build([built,'--state',tmp+'/notes.json']);
    await loadQuick(fs.readFileSync(built,'utf8')); await notesShown('the build');
  });
  await t('the document the app writes for itself keeps them too', async function(){
    // Typed in on a clean page, so only the app's own fullDocument writes them.
    await loadQuick(env.readDoc());
    await p.click('[data-action="tab"][data-tab="training"]');
    for(var ni=0;ni<NOTES.length;ni++){
      await p.fill('#lib-title','Note '+ni); await p.fill('#lib-notes',NOTES[ni]);
      await p.click('[data-action="addlib"]');
      await p.waitForFunction(function(k){ return (window.__pub||'').indexOf('Note '+k)>-1; },ni,{timeout:8000});
    }
    var doc=await p.evaluate(function(){ return window.__pub; });
    await loadQuick(doc); await notesShown('the self-saved document');
  });
  await b.close();
  fs.rmSync(tmp,{recursive:true,force:true});
  console.log(fails?('\n'+fails+' FAILING'):'\nAll build checks pass.');
  process.exit(fails?1:0);
})();
