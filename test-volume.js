// What counts as weight moved, and what a finished session remembers about
// supersets. Both are pure functions pulled out of the shipped index.html, so
// this tests the code that ships rather than a copy of it.
var fs=require('fs'), assert=require('assert');
var h=fs.readFileSync(__dirname+'/index.html','utf8');

function grab(name){
  var i=h.indexOf('function '+name+'(');
  if(i<0) throw new Error('could not find '+name+' in index.html');
  var depth=0, started=false;
  for(var k=i;k<h.length;k++){
    if(h[k]==='{'){ depth++; started=true; }
    else if(h[k]==='}'){ depth--; if(started&&!depth) return h.slice(i,k+1); }
  }
  throw new Error(name+' never closed');
}
function literal(decl){
  var i=h.indexOf('\n'+decl+'='); if(i<0) throw new Error('could not find '+decl);
  var open=h.indexOf(h[h.indexOf('=',i)+1]==='['?'[':'{', i);
  var oc=h[open], cc=oc==='['?']':'}', depth=0;
  for(var k=open;k<h.length;k++){
    if(h[k]===oc) depth++;
    else if(h[k]===cc){ depth--; if(!depth) return h.slice(open,k+1); }
  }
  throw new Error(decl+' never closed');
}

var box={};
new Function(
  'var EX='+literal('var EX')+';\n'+
  'var PER_IMPLEMENT='+literal('var PER_IMPLEMENT')+';\n'+
  'function esc(s){ return String(s); }\n'+
  'var state={};\n'+
  grab('perImplement')+'\n'+grab('volumeOf')+'\n'+
  grab('isSuperset')+'\n'+grab('supersetMembers')+'\n'+grab('exDef')+'\n'+
  grab('movesWeight')+'\n'+grab('supersetRecord')+'\n'+grab('supersetSummary')+'\n'+
  'this.volumeOf=volumeOf;this.movesWeight=movesWeight;this.exDef=exDef;'+
  'this.supersetRecord=supersetRecord;this.supersetSummary=supersetSummary;'
).call(box);

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

console.log('\nWHAT COUNTS AS WEIGHT MOVED');

t('an ordinary loaded set counts', function(){
  var st={w:100,v:5};
  assert.strictEqual(box.movesWeight('press_bench',st), true);
  assert.strictEqual(box.volumeOf('press_bench',st), 500);
});

t('a pair of dumbbells counts twice, because both moved', function(){
  var st={w:20,v:10};
  assert.strictEqual(box.volumeOf('curl_bicep',st), 400,
    'got '+box.volumeOf('curl_bicep',st));
});

t('a light set on the warm-up counts, because it is weight that moved', function(){
  // It is logged against the prep step rather than a lift, so it used to fall
  // out of a total labelled "weight moved" and a tile labelled "total lifted".
  var st={v:5, w:42.5, opt:'Light sets of the first lift', lvlKind:'load'};
  assert.strictEqual(box.movesWeight('warmup',st), true, 'the ramp was not counted');
  assert.strictEqual(box.volumeOf('warmup',st), 212.5);
});

t('a cool-down light set counts the same way', function(){
  var st={v:8, w:20, opt:'Light sets of the first lift', lvlKind:'load'};
  assert.strictEqual(box.movesWeight('cooldown',st), true);
});

t('minutes on a bike are not weight', function(){
  var st={v:10, opt:'Bike', lvl:'6', lvlKind:'resistance'};
  assert.strictEqual(box.movesWeight('warmup',st), false, 'ten minutes counted as lifting');
});

t('a warm-up with a level but no weight is not weight either', function(){
  assert.strictEqual(box.movesWeight('warmup',{v:10, w:null, lvlKind:'load'}), false);
});

t('reps with no weight are not weight', function(){
  assert.strictEqual(box.movesWeight('pullup',{v:8, w:null}), false);
});

t('a single-arm kettlebell lift counts per side, like a single-arm row', function(){
  // Logged per bell and done on both sides, so 16kg x 8 each side moved what
  // 16kg x 8 on a single-arm row moved, not half of it.
  ['kb_clean','kb_snatch','kb_press'].forEach(function(id){
    assert.strictEqual(box.volumeOf(id,{w:16,v:8}), box.volumeOf('row_single',{w:16,v:8}), id+' counted half');
  });
});

t('an unknown exercise id is refused rather than counted blind', function(){
  assert.strictEqual(box.movesWeight('nope',{w:100,v:5}), false);
});

console.log('\nA FINISHED SESSION REMEMBERS ITS SUPERSETS');

t('a superset that was actually done is kept', function(){
  var rec=box.supersetRecord({supersets:{ss1:{ex:['curl_bicep','row_bent'], rounds:4}}});
  assert.deepStrictEqual(rec, [{ex:['curl_bicep','row_bent'], rounds:4}]);
});

t('one that was set up and never used is not', function(){
  // Nothing happened, so nothing is recorded.
  assert.deepStrictEqual(box.supersetRecord({supersets:{ss1:{ex:['curl_bicep'], rounds:0}}}), []);
  assert.deepStrictEqual(box.supersetRecord({supersets:{ss1:{ex:[], rounds:3}}}), []);
});

t('a session with no supersets records none', function(){
  assert.deepStrictEqual(box.supersetRecord({}), []);
  assert.deepStrictEqual(box.supersetRecord({supersets:{}}), []);
});

t('an in-flight session saved under the old bare-array shape does not crash', function(){
  assert.deepStrictEqual(box.supersetRecord({supersets:{ss1:['curl_bicep','row_bent']}}), []);
});

t('the summary names the exercises and the rounds', function(){
  var s=box.supersetSummary({supersets:[{ex:['curl_bicep','row_bent'], rounds:4}]});
  assert.ok(/Bicep curl/.test(s) && /Bent-over row/.test(s), 'summary read: '+s);
  assert.ok(/4/.test(s), 'the rounds are missing: '+s);
});

t('two supersets are both named', function(){
  var s=box.supersetSummary({supersets:[
    {ex:['curl_bicep','row_bent'], rounds:4},
    {ex:['pullup','dip'], rounds:3}]});
  assert.ok(/Bicep curl/.test(s) && /Pull-up/.test(s), 'summary read: '+s);
});

t('more than two collapse to a count, so the row stays readable', function(){
  var s=box.supersetSummary({supersets:[
    {ex:['curl_bicep'], rounds:4}, {ex:['pullup'], rounds:3}, {ex:['dip'], rounds:2}]});
  assert.strictEqual(s, '3 supersets &middot; 9 rounds', 'summary read: '+s);
});

t('a session without supersets says nothing at all', function(){
  assert.strictEqual(box.supersetSummary({}), '');
  assert.strictEqual(box.supersetSummary({supersets:[]}), '');
});

console.log(fails?('\n'+fails+' FAILING\n'):'\nVolume and superset records are consistent.\n');
process.exit(fails?1:0);
