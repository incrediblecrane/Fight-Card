// A document round-trip must not quietly drop a field. This runs the app's own
// dbDocs/dbApply over real state and compares every key, because the migration
// is a one-way door: whatever does not survive this is simply gone.
var fs=require('fs'), assert=require('assert');
var h=fs.readFileSync(__dirname+'/index.html','utf8');

// Pull the two functions and their helper out of the app, so this tests the
// shipped code rather than a copy of it that can drift.
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
var DB_LISTS=h.match(/var DB_LISTS=\{[^}]*\};/)[0];
var sandbox={};
var SLOTS=h.match(/var SLOTS=\[[^\]]*\];/)[0];
new Function(DB_LISTS+'\n'+SLOTS+'\n'+grab('slotRank')+'\n'+grab('planOrder')+'\n'+
  grab('dbClone')+'\n'+grab('stripDerived')+'\n'+grab('dbDocs')+'\n'+grab('dbApply')+
  '\nthis.dbDocs=dbDocs;this.dbApply=dbApply;').call(sandbox);

var seedRaw=h.slice(h.lastIndexOf(')({')+2, h.lastIndexOf(');</'+'script>'));
var cases=[['the repo seed', JSON.parse(seedRaw)]];
// The seed carries no hand-added shopping, so the round-trip for it would be a
// comparison of two empty arrays. Give it some, or the check proves nothing.
(function(){
  var st=JSON.parse(seedRaw);
  st.shopExtras=[{id:'x1',text:'Bin bags'},{id:'x2',text:'Coffee'}];
  st.shoppingChecked=['x|x2'];
  st.deletedRecipes=['p3'];
  // Same reasoning for the plan: an empty one round-trips trivially. Two
  // meals of the SAME recipe on different days, because that pair is the whole
  // reason the model changed and is the pair a careless save would collapse.
  var rid=(st.recipes&&st.recipes[0]||{}).id||'r1';
  st.plan=[{id:'pl1', recipeId:rid, date:'2026-09-07', slot:'dinner', portions:2},
           {id:'pl2', recipeId:rid, date:'2026-09-10', slot:'lunch', portions:1}];
  // A superset lives on the in-flight session, so it only survives a reload if
  // activeSession round-trips whole. The seed's session is usually null, which
  // would make that check vacuous.
  st.activeSession={workoutId:'w_custom', startedAt:'2026-09-05',
    exIds:['warmup','ss1','cooldown'],
    supersets:{ss1:['press_bench','row_bent']},
    targets:{ss1:{sets:3,reps:'rounds'}},
    logs:{press_bench:[{v:10,w:60}], row_bent:[{v:12,w:50}]}};
  cases.push(['the seed with your own shopping', st]);
})();
var live=__dirname+'/../live-state.json';
try{ cases.push(['live artifact state', JSON.parse(fs.readFileSync(process.env.FC_LIVE_STATE||live,'utf8'))]); }catch(e){}

var fails=0;
cases.forEach(function(pair){
  var name=pair[0], st=pair[1];
  function deepFreeze(v){
    if(v===null||typeof v!=='object') return v;
    Object.keys(v).forEach(function(k){ deepFreeze(v[k]); });
    return Object.freeze(v);
  }
  var docs0=sandbox.dbDocs(st);
  Object.keys(docs0).forEach(function(k){ deepFreeze(docs0[k]); });
  var back=sandbox.dbApply(docs0);
  // What comes out must be writable: the app mutates all of it in place.
  var stillFrozen=[];
  ['days','workoutLogs','saunaSessions','recipes','library'].forEach(function(key){
    var v=back[key]; if(!v) return;
    Object.keys(v).forEach(function(k){ if(v[k]&&Object.isFrozen(v[k])) stillFrozen.push(key+'/'+k); });
  });
  if(back.activeSession&&Object.isFrozen(back.activeSession)) stillFrozen.push('activeSession');
  if(stillFrozen.length){ fails++; console.log('  FAIL  '+name+': frozen after load -> '+stillFrozen.slice(0,5).join(', ')); }
  else console.log('  PASS  '+name+': everything loaded is writable, not frozen');
  function cmp(label,a,b){
    if(JSON.stringify(a)===JSON.stringify(b)){ console.log('  PASS  '+name+': '+label); return; }
    fails++;
    console.log('  FAIL  '+name+': '+label+'\n        was '+JSON.stringify(a).slice(0,160)+
                '\n        now '+JSON.stringify(b).slice(0,160));
  }
  cmp('every day survives', st.days, back.days);
  cmp('workout logs survive in order', st.workoutLogs, back.workoutLogs);
  cmp('sauna sessions survive in order', st.saunaSessions, back.saunaSessions);
  function bare(r){ var o={}; Object.keys(r).forEach(function(k){ if(k!=='_ings'&&k!=='_ingsFor') o[k]=r[k]; }); return o; }
  cmp('recipes survive (minus the derived parse cache, which is rebuilt)',
      (st.recipes||[]).slice().sort(byId).map(bare), (back.recipes||[]).slice().sort(byId).map(bare));
  var kept=(back.recipes||[]).filter(function(r){ return r._ings!==undefined; });
  if(kept.length){ fails++; console.log('  FAIL  '+name+': the parse cache came back in '+kept.length+' recipes'); }
  else console.log('  PASS  '+name+': the derived parse cache is not carried through storage');
  cmp('library survives', (st.library||[]).slice().sort(byId), (back.library||[]).slice().sort(byId));
  cmp('the planned meals survive', (st.plan||[]).slice().sort(byId), (back.plan||[]).slice().sort(byId));
  cmp('the shopping ticks survive', st.shoppingChecked||[], back.shoppingChecked);
  cmp('your own shopping items survive', st.shopExtras||[], back.shopExtras);
  cmp('an in-flight session survives', st.activeSession||null, back.activeSession);
  cmp('xp survives', st.totalXp||0, back.totalXp);
  cmp('the water target survives', st.waterTarget||8, back.waterTarget);
  cmp('deleted meal-prep recipes stay deleted', st.deletedRecipes||[], back.deletedRecipes);
  // Which tab and slide a view is on belongs to that device. Stored in the
  // profile, every tab change dirtied the document that holds the xp, so the
  // next save of anything wrote this view's stale xp over another view's.
  var UI_KEYS=['uiTab','uiSlide','uiProgRange','uiViewingSession'];
  var prof=sandbox.dbDocs(st)['state/profile']||{};
  cmp('the ui position is not written to the store', [], UI_KEYS.filter(function(k){ return k in prof; }));
  cmp('nor read back from it', [], UI_KEYS.filter(function(k){ return k in back; }));

  // Nothing in state may be silently unmapped.
  var mapped={days:1,workoutLogs:1,saunaSessions:1,recipes:1,library:1,shoppingChecked:1,
              shopExtras:1,plan:1,activeSession:1,totalXp:1,waterTarget:1,weekTarget:1,deletedRecipes:1,
              // Device-only, kept in localStorage: an old seed may still carry them.
              uiTab:1,uiSlide:1,uiProgRange:1,uiViewingSession:1};
  var unmapped=Object.keys(st).filter(function(k){ return !mapped[k]; });
  if(unmapped.length){ fails++; console.log('  FAIL  '+name+': unmapped state keys -> '+unmapped.join(', ')); }
  else console.log('  PASS  '+name+': no state key is left unmapped');

  // Every document must be a plain object, small enough, and legally addressed.
  var docs=sandbox.dbDocs(st), bad=[];
  var SEG=/^[A-Za-z0-9_\-.~:@+]{1,200}$/;
  Object.keys(docs).forEach(function(path){
    var segs=path.split('/');
    if(segs.length%2!==0) bad.push(path+' (odd segment count, not a document path)');
    if(!segs.every(function(x){return SEG.test(x)&&x!=='.'&&x!=='..';})) bad.push(path+' (illegal characters in a segment)');
    var body=docs[path];
    if(!body||typeof body!=='object'||Array.isArray(body)) bad.push(path+' (body is not a plain object)');
    if(JSON.stringify(body).length>256*1024) bad.push(path+' (over the 256KiB document cap)');
  });
  if(bad.length){ fails++; console.log('  FAIL  '+name+': bad documents ->\n        '+bad.join('\n        ')); }
  else console.log('  PASS  '+name+': all '+Object.keys(docs).length+' documents are legal and within caps');
});
function byId(a,b){ return a.id<b.id?-1:a.id>b.id?1:0; }

// Two views of the app, each merging what the store holds into its own copy
// before it saves. A field one view changed keeps that view's value, the rest
// take the store's, and xp adds both views' changes rather than picking one.
(function(){
  var m={}; new Function(grab('stableJson')+'\n'+grab('dbMerge')+'\nthis.dbMerge=dbMerge;').call(m);
  var got=m.dbMerge('days/2026-09-30',{water:0,smoking:0,workout:{done:false,type:null}},
    {water:0,smoking:1,workout:{done:false,type:null}},
    {water:3,smoking:0,workout:{done:true,type:'Strength'}});
  if(got.water===3 && got.smoking===1 && got.workout.done===true && got.workout.type==='Strength')
    console.log('  PASS  a day merges field by field: their water and workout, my smoking');
  else { fails++; console.log('  FAIL  a day merges field by field\n        got '+JSON.stringify(got)); }
  var xp=m.dbMerge('state/profile',{totalXp:100,waterTarget:8},{totalXp:115,waterTarget:8},{totalXp:103,waterTarget:10});
  if(xp.totalXp===118 && xp.waterTarget===10) console.log('  PASS  xp adds both views\' gains; an untouched target takes theirs');
  else { fails++; console.log('  FAIL  profile merge\n        got '+JSON.stringify(xp)); }
  // Two views each deleting a different built-in recipe: both stay deleted,
  // and one view putting its own back does not bring back the other's.
  var dr=m.dbMerge('state/profile',{totalXp:0,deletedRecipes:['p1']},
    {totalXp:0,deletedRecipes:['p1','p3']},{totalXp:0,deletedRecipes:['p1','p5']});
  if(JSON.stringify((dr.deletedRecipes||[]).slice().sort())==='["p1","p3","p5"]')
    console.log('  PASS  recipes deleted in two views both stay deleted');
  else { fails++; console.log('  FAIL  deleted recipes merge\n        got '+JSON.stringify(dr)); }
  var ud=m.dbMerge('state/profile',{totalXp:0,deletedRecipes:['p1','p3']},
    {totalXp:0,deletedRecipes:['p3']},{totalXp:0,deletedRecipes:['p1','p3','p5']});
  if(JSON.stringify(ud.deletedRecipes)==='["p3","p5"]')
    console.log('  PASS  an undone delete merges as a removal, the other view\'s delete kept');
  else { fails++; console.log('  FAIL  undone delete merge\n        got '+JSON.stringify(ud)); }
})();

// A merged profile is put back into this view's state. Anything dbApply reads
// from the profile but dbPlace does not copy is lost on this view's next save.
(function(){
  var KEYS=h.match(/var DB_STATE_KEYS=\{[^}]*\};/)[0];
  var m={state:{waterTarget:8,totalXp:0,deletedRecipes:[]}};
  new Function('state',DB_LISTS+'\n'+SLOTS+'\n'+grab('slotRank')+'\n'+grab('planOrder')+'\n'+KEYS+'\nfunction ensurePrep(){}\n'+grab('dbClone')+'\n'+
    grab('dbApply')+'\n'+grab('dbPlace')+'\ndbPlace("state/profile",{waterTarget:9,totalXp:5,deletedRecipes:["p3"]});')
    .call(m,m.state);
  if(JSON.stringify(m.state.deletedRecipes)==='["p3"]' && m.state.totalXp===5)
    console.log('  PASS  a merged profile brings another view\'s deleted recipes into state');
  else { fails++; console.log('  FAIL  dbPlace dropped the deleted recipes\n        got '+JSON.stringify(m.state)); }
})();

// Number boxes: a comma decimal is a decimal, but "1,000" is a thousands
// comma and must not be read as 1.
(function(){
  var m={}; new Function(grab('parseNum')+'\nthis.parseNum=parseNum;').call(m);
  var got=['22,5','1,000','2,500','0,125','12,50','1000'].map(function(x){ return m.parseNum(x); });
  if(got[0]===22.5 && isNaN(got[1]) && isNaN(got[2]) && got[3]===0.125 && got[4]===12.5 && got[5]===1000)
    console.log('  PASS  a comma decimal reads as a decimal; a thousands comma is refused, not scaled down');
  else { fails++; console.log('  FAIL  parseNum\n        got '+JSON.stringify(got.map(String))); }
})();

console.log(fails?('\n'+fails+' FAILING'):'\nRound-trip is lossless.');
process.exit(fails?1:0);
