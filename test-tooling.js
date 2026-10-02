// The dev tools that write files: build-publish.js and pose/emit-rig.js. Both
// overwrite something that matters (a live state export, index.html), so a
// slip on the command line or an editor's line endings must not cost data.
var fs=require('fs'), os=require('os'), path=require('path'), assert=require('assert');
var cp=require('child_process');
var env=require('./test-env.js');
var h=fs.readFileSync(__dirname+'/index.html','utf8');
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fc-tool-'));
var fails=0;
function t(name,fn){
  try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+String(e.message).split('\n').slice(0,4).join('\n        ')); }
}
// Run in tmp so a stray positional lands there; FC_PUBLISH keeps the default
// outfile away from the document the other suites read.
function run(script,args,cwd){
  var e={}; Object.keys(process.env).forEach(function(k){ e[k]=process.env[k]; });
  e.FC_PUBLISH=tmp+'/default.html';
  return cp.spawnSync(process.execPath,[script].concat(args),{cwd:cwd||tmp,encoding:'utf8',env:e});
}
var BUILD=__dirname+'/build-publish.js';
var seed=env.seedOf(h);
seed.library=[{id:'live1',title:'LIVE MARKER',tag:'Note',notes:''}];
var LIVE=JSON.stringify(seed);

console.log('\nA MISTYPED BUILD FLAG STOPS BEFORE IT WRITES');
[ ['--stat','live.json'], ['--state'], ['--src'], ['--state='], ['out.html','--state'],
  ['-s','live.json'], ['--state','live.json','live.json'], ['live.json','--state','live.json'],
  ['out.json','--state','live.json'], ['--state','live.json','--bogus']
].forEach(function(args){
  t('build-publish '+args.join(' ')+' exits non-zero and leaves live.json alone', function(){
    fs.writeFileSync(tmp+'/live.json',LIVE);
    try{ fs.unlinkSync(tmp+'/default.html'); }catch(e){}
    var r=run(BUILD,args);
    assert.notStrictEqual(r.status,0,'exited 0: '+r.stdout);
    assert.ok(fs.readFileSync(tmp+'/live.json','utf8')===LIVE,'live.json was overwritten');
    assert.ok(!fs.existsSync(tmp+'/default.html'),'it still wrote the default document');
    assert.ok(!/ERR_INVALID_ARG_TYPE|at Object\.<anonymous>/.test(r.stderr),'crashed instead of explaining: '+r.stderr.split('\n')[0]);
  });
});
['--state=live.json','--state live.json'].forEach(function(form){
  t('build-publish out.html '+form+' ships the live state', function(){
    fs.writeFileSync(tmp+'/live.json',LIVE);
    var r=run(BUILD,['out.html'].concat(form.split(' ')));
    assert.strictEqual(r.status,0,r.stderr);
    assert.strictEqual(env.seedOf(fs.readFileSync(tmp+'/out.html','utf8')).library[0].title,'LIVE MARKER','the live state did not ship');
  });
});
t('build-publish --src=<file> reads that file', function(){
  fs.writeFileSync(tmp+'/live.json',LIVE);
  assert.strictEqual(run(BUILD,['a.html','--state=live.json']).status,0);
  var r=run(BUILD,['b.html','--src='+tmp+'/a.html']);
  assert.strictEqual(r.status,0,r.stderr);
  assert.strictEqual(env.seedOf(fs.readFileSync(tmp+'/b.html','utf8')).library[0].title,'LIVE MARKER','--src= was ignored');
});

console.log('\nAN EXPORT WITH A BYTE ORDER MARK BUILDS');
t('build-publish --state on a BOM-prefixed export', function(){
  fs.writeFileSync(tmp+'/bom.json','﻿'+LIVE);
  var r=run(BUILD,['bom.html','--state','bom.json']);
  assert.strictEqual(r.status,0,r.stderr.split('\n').slice(0,5).join(' '));
  assert.strictEqual(env.seedOf(fs.readFileSync(tmp+'/bom.html','utf8')).library[0].title,'LIVE MARKER');
});
t('build-publish --src on a BOM-prefixed index.html', function(){
  fs.writeFileSync(tmp+'/bom-src.html','﻿'+h);
  var r=run(BUILD,['bom-src-out.html','--src','bom-src.html']);
  assert.strictEqual(r.status,0,r.stderr.split('\n').slice(0,5).join(' '));
});
t('a state file that is not JSON is named in the error', function(){
  fs.writeFileSync(tmp+'/broken.json','{"days":');
  var r=run(BUILD,['x.html','--state','broken.json']);
  assert.notStrictEqual(r.status,0);
  assert.ok(r.stderr.indexOf('broken.json')>-1,'the error does not name the file: '+r.stderr.split('\n')[0]);
});

console.log('\nEMIT-RIG RESPECTS CRLF');
// A copy of the tree, so the real index.html is never touched.
var tree=tmp+'/tree'; fs.mkdirSync(tree+'/pose',{recursive:true});
fs.readdirSync(__dirname+'/pose').forEach(function(f){ if(/\.js$/.test(f)) fs.copyFileSync(__dirname+'/pose/'+f,tree+'/pose/'+f); });
var crlf=h.replace(/\r?\n/g,'\r\n');
t('--check on a CRLF index.html reports in sync', function(){
  fs.writeFileSync(tree+'/index.html',crlf);
  var r=run(tree+'/pose/emit-rig.js',['--check'],tree);
  assert.strictEqual(r.status,0,r.stdout+r.stderr);
  assert.ok(/in sync/.test(r.stdout),r.stdout);
});
t('a rewrite of a CRLF index.html keeps CRLF throughout', function(){
  fs.writeFileSync(tree+'/index.html',crlf.replace(/var RIGFRAMES=[^\r\n]*/,'var RIGFRAMES={}'));
  var r=run(tree+'/pose/emit-rig.js',[],tree);
  assert.strictEqual(r.status,0,r.stdout+r.stderr);
  var w=fs.readFileSync(tree+'/index.html','utf8');
  assert.ok(/rewrote/.test(r.stdout),r.stdout);
  assert.ok(!/[^\r]\n/.test(w),'the rewrite left bare LF line endings');
  assert.ok(w===crlf,'the rewrite did not reproduce the CRLF file');
});
t('an LF index.html still checks and rewrites as LF', function(){
  fs.writeFileSync(tree+'/index.html',h.replace(/var RIGFRAMES=[^\r\n]*/,'var RIGFRAMES={}'));
  var r=run(tree+'/pose/emit-rig.js',[],tree);
  assert.strictEqual(r.status,0,r.stdout+r.stderr);
  assert.ok(fs.readFileSync(tree+'/index.html','utf8')===h,'the LF rewrite did not reproduce index.html');
});

fs.rmSync(tmp,{recursive:true,force:true});
console.log(fails?('\n'+fails+' FAILING'):'\nAll tooling checks pass.');
process.exit(fails?1:0);
