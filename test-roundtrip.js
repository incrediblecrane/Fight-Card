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
var DB_LISTS=h.match(/var SESS_ENDED_KEEP=\d+;/)[0]+'\n'+h.match(/var DB_LISTS=\{[^}]*\};/)[0];
var sandbox={};
var SLOTS=h.match(/var SLOTS=\[[^\]]*\];/)[0];
new Function(DB_LISTS+'\n'+SLOTS+'\n'+grab('slotRank')+'\n'+grab('planOrder')+'\n'+
  grab('dbClone')+'\n'+grab('stripDerived')+'\n'+grab('isBlankDay')+'\n'+grab('dbDocs')+'\n'+grab('byDateId')+'\n'+grab('sessId')+'\n'+grab('liveSession')+'\n'+grab('dbApply')+
  '\nthis.dbDocs=dbDocs;this.dbApply=dbApply;').call(sandbox);

var seedRaw=JSON.stringify(require('./test-env.js').seedOf(h));
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
  cmp('the sessions that have ended stay ended', st.endedSessions||[], back.endedSessions);
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
              shopExtras:1,plan:1,activeSession:1,endedSessions:1,totalXp:1,waterTarget:1,weekTarget:1,deletedRecipes:1,
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
  var m={}; new Function(['stableJson','dbMerge','mergeKeyed','setKey','mergeSetLogs','sessId','liveSession','mergeSessionDoc','mergeActive','mergeSession'].map(grab).join('\n')+
    '\nvar SESS_ENDED_KEEP=20;\nthis.dbMerge=dbMerge;').call(m);
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
  function check(label,ok,got){ if(ok) console.log('  PASS  '+label); else { fails++; console.log('  FAIL  '+label+'\n        got '+JSON.stringify(got)); } }
  // Shopping: ticks and extras are sets, as deleted recipes are.
  var sh=m.dbMerge('state/shopping',{checked:['a','c'],extras:[{id:'x1',text:'Tea'}]},
    {checked:['a','b'],extras:[{id:'x1',text:'Tea'},{id:'x2',text:'Coffee'}]},
    {checked:['a','c','d'],extras:[{id:'x1',text:'Tea'},{id:'x3',text:'Bin bags'}]});
  check('ticks and extras from two views are both kept, an untick too',
    JSON.stringify(sh.checked.slice().sort())==='["a","b","d"]' &&
    JSON.stringify(sh.extras.map(function(x){ return x.id; }).sort())==='["x1","x2","x3"]', sh);
  // One session open in two views: sets are a union by when they were logged,
  // an exercise added here keeps its place before the cool-down.
  var S=function(ids,logs,extra){ var o={id:'s1',workoutId:'w6',t0:1,exIds:ids,targets:{},logs:logs}; Object.keys(extra||{}).forEach(function(k){ o[k]=extra[k]; }); return o; };
  var b0=S(['warmup','press_bench','cooldown'],{press_bench:[{v:8,w:60,t:10}]});
  var mine=S(['warmup','press_bench','dip','cooldown'],{press_bench:[{v:8,w:60,t:10},{v:7,w:60,t:30}]},{targets:{dip:{sets:3,reps:'8'}}});
  var theirs=S(['warmup','press_bench','cooldown'],{press_bench:[{v:8,w:60,t:10},{v:8,w:62.5,t:20}],press_ohp:[{v:8,w:40,t:25}]});
  var sm=m.dbMerge('state/session',{active:b0},{active:mine},{active:theirs}).active;
  check('sets logged on one session in two views are all kept, in order, once each',
    sm && JSON.stringify(sm.logs.press_bench.map(function(x){ return x.t; }))==='[10,20,30]' && sm.logs.press_ohp.length===1 &&
    JSON.stringify(sm.exIds)==='["warmup","press_bench","dip","cooldown"]' && sm.targets.dip.sets===3, sm);
  // Ended elsewhere: what this view holds of it does not bring it back.
  var en=m.dbMerge('state/session',{active:b0},{active:mine},{active:null,ended:['s1']});
  check('a session finished elsewhere stays finished whatever this view logged on it', en.active===null && en.ended[0]==='s1', en);
  var en2=m.dbMerge('state/session',{active:b0},{active:mine},{active:null});
  check('and so does one discarded or replaced elsewhere', en2.active===null, en2);
  // A view hidden straight after a set wrote it back without reading: still ended.
  var zb=m.dbMerge('state/session',{active:null,ended:['s1']},{active:null,ended:['s1']},{active:mine,ended:['s1']});
  check('a session written back by a view that had not heard is not live again', zb.active===null, zb);
  // Put back by Undo in one view: live again everywhere.
  var ub=m.dbMerge('state/session',{active:null,ended:['s1']},{active:null,ended:['s1']},{active:mine});
  check('a session put back on purpose is live again', ub.active && ub.active.id==='s1' && !ub.ended, ub);
  // An exercise taken out here, nothing logged on it elsewhere: it goes, rather
  // than staying as a list with no sets, which Undo and Progress read as there.
  var gone=S(['warmup','cooldown'],{});
  var rm=m.dbMerge('state/session',{active:b0},{active:gone},{active:b0}).active;
  check('an exercise taken out of the session is dropped, not left with no sets', rm && !('press_bench' in rm.logs), rm);
  var un=m.dbMerge('state/session',{active:b0},{active:S(b0.exIds,{press_bench:[]})},{active:b0}).active;
  check('and so is one whose only set was undone', un && !('press_bench' in un.logs), un);
  var kept2=m.dbMerge('state/session',{active:b0},{active:gone},{active:theirs}).active;
  check('a set logged elsewhere on an exercise taken out here is kept',
    kept2 && JSON.stringify(kept2.logs.press_bench.map(function(x){ return x.t; }))==='[20]', kept2);
  // A log for the same session from two views, one never seen here: both sets.
  var lg=m.dbMerge('workoutLogs/wl1',{},{id:'wl1',logs:{press_bench:[{v:8,t:10},{v:7,t:30}]}},{id:'wl1',logs:{press_bench:[{v:8,t:10},{v:8,t:20}]}});
  check('one session\'s log written in two views keeps every set once',
    JSON.stringify(lg.logs.press_bench.map(function(x){ return x.t; }))==='[10,20,30]', lg);
  // Two equal sets with no time are two sets, not one.
  var nt=m.dbMerge('workoutLogs/wl2',{},{logs:{a:[{v:8},{v:8}]}},{logs:{a:[{v:8},{v:8}]}});
  check('two equal sets from before set times are not merged into one', nt.logs.a.length===2, nt);
})();

// A view hidden straight after a change sends what it changed in a field that
// merges beside the document (pend_ and the view), not over it. A read folds
// another view's in as that view's change and leaves its own out.
(function(){
  var m={}; new Function(['stableJson','dbMerge','mergeKeyed','setKey','mergeSetLogs','sessId','liveSession','mergeSessionDoc','mergeActive','mergeSession','foldPend'].map(grab).join('\n')+
    '\nvar SESS_ENDED_KEEP=20;\nthis.foldPend=foldPend;this.liveSession=liveSession;').call(m);
  function check(label,ok,got){ if(ok) console.log('  PASS  '+label); else { fails++; console.log('  FAIL  '+label+'\n        got '+JSON.stringify(got)); } }
  var sh=m.foldPend('state/shopping',{checked:['a','b'],extras:[],pend_v2:{b:{checked:['a']},m:{checked:['a','c']}}},'pend_v1');
  check('a tick sent beside the list keeps the ticks stored since, and goes in once',
    JSON.stringify(sh.checked.slice().sort())==='["a","b","c"]' && !Object.keys(sh).some(function(k){ return k.indexOf('pend_')===0; }), sh);
  var un=m.foldPend('state/shopping',{checked:['a','b'],extras:[],pend_v2:{b:{checked:['a']},m:{checked:[]}}},'pend_v1');
  check('an untick sent beside it takes out only that tick', JSON.stringify(un.checked)==='["b"]', un);
  var xp=m.foldPend('state/profile',{totalXp:120,waterTarget:8,pend_v2:{b:{totalXp:100},m:{totalXp:102}}},'pend_v1');
  check('xp sent beside it adds what that view earned to what is stored', xp.totalXp===122 && xp.waterTarget===8, xp);
  var own=m.foldPend('state/profile',{totalXp:120,pend_v1:{b:{totalXp:100},m:{totalXp:102}}},'pend_v1');
  check('a view\'s own is left out of what it reads', own.totalXp===120 && !('pend_v1' in own), own);
  var dr=m.foldPend('state/profile',{totalXp:0,deletedRecipes:['p5'],pend_v2:{b:{deletedRecipes:null},m:{deletedRecipes:['p3']}}},'pend_v1');
  check('a recipe deleted in a view that had none deleted keeps the one deleted since',
    JSON.stringify((dr.deletedRecipes||[]).slice().sort())==='["p3","p5"]', dr);
  var S=function(logs){ return {id:'s1',workoutId:'w6',t0:1,exIds:['press_bench'],targets:{},logs:{press_bench:logs}}; };
  var se=m.foldPend('state/session',{active:S([{v:8,t:10},{v:8,t:20}]),pend_v2:{b:{active:S([{v:8,t:10}])},m:{active:S([{v:8,t:10},{v:6,t:30}])}}},'pend_v1');
  check('a set sent beside the session joins the sets stored since',
    se.active && JSON.stringify(se.active.logs.press_bench.map(function(x){ return x.t; }))==='[10,20,30]', se);
  var en=m.foldPend('state/session',{active:null,ended:['s1'],pend_v2:{b:{active:S([{v:8,t:10}])},m:{active:S([{v:8,t:10},{v:6,t:30}])}}},'pend_v1');
  check('a set sent on a session ended elsewhere leaves it ended, with that set kept beside it',
    !m.liveSession(en) && en.active && en.active.logs.press_bench.length===2 && en.ended[0]==='s1', en);
  var st=m.foldPend('state/session',{active:null,pend_v2:{b:{active:null},m:{active:S([])}}},'pend_v1');
  check('a session started in a view hidden at once is live for whoever reads it', m.liveSession(st) && m.liveSession(st).id==='s1', st);
})();

// A merged profile is put back into this view's state. Anything dbApply reads
// from the profile but dbPlace does not copy is lost on this view's next save.
(function(){
  var KEYS=h.match(/var DB_STATE_KEYS=\{[^}]*\};/)[0];
  var m={state:{waterTarget:8,totalXp:0,deletedRecipes:[]}};
  new Function('state',DB_LISTS+'\n'+SLOTS+'\n'+grab('slotRank')+'\n'+grab('planOrder')+'\n'+KEYS+'\nfunction ensurePrep(){}\n'+grab('dbClone')+'\n'+
    grab('byDateId')+'\n'+grab('dbApply')+'\n'+grab('dbPlace')+'\ndbPlace("state/profile",{waterTarget:9,totalXp:5,deletedRecipes:["p3"]});')
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
