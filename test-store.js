// The Store seam and data export/import, headless against the shipped source.
// Export then import into an empty store must give back exactly what went out,
// and anything that is not an export must be refused with a reason before a
// byte of it becomes state.
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
function grabVar(decl){
  var m=h.match(new RegExp('var '+decl+'=[^\\n]*;\\n'));
  if(!m) throw new Error('could not find var '+decl);
  return m[0];
}
// readImport knows the exercises, so a session can lose one this version does not have.
var src=[grabVar('SESS_ENDED_KEEP'), grabVar('DB_LISTS'), grabVar('SLOTS'), grabVar('WORKOUT_TYPES'), grabVar('DB_COLLECTIONS'), grabVar('DB_STATE_DOCS'),
  grabVar('DAY_MAX'), h.match(/var EX=\[[\s\S]*?\n\];/)[0], grab('isSuperset'), grab('exDef'), grab('blankDay'), grab('wholeDay'),
  grabVar('EXPORT_SCHEMA'), h.match(/var EXPORT_KEYS=\[[^\]]*\];/)[0], grabVar('EXPORT_LISTS'), grabVar('IMPORT_SET'), h.match(/var IMPORT_FIELDS=\{[\s\S]*?\}\};/)[0],
  grab('slotRank'), grab('planOrder'), grab('dbClone'), grab('stripDerived'), grab('isBlankDay'), grab('dbDocs'), grab('byDateId'), grab('sessId'), grab('liveSession'), grab('dbApply'),
  grab('stableJson'), grab('mergeKeyed'), grab('setKey'), grab('mergeSetLogs'), grab('mergeSession'), grab('mergeActive'), grab('mergeSessionDoc'), grab('dbMerge'), grab('foldPend'),
  grabVar('DAY_COUNTS'), grab('mergeDay'), grab('profShape'), grab('dayPair'), grab('dayWx'), grab('dayXp'), grab('waterTgt'), 'var state=null, pendFix=0;',
  h.match(/var DUMP_COLL=[^\n]*\n/)[0], grab('readDump'),
  grabVar('DB_DOC_MAX'), grab('docBytes'), grab('docDepth'), grab('docFault'), grab('jsonDepth'), grabVar('ING_MAX'), grab('importLabel'),
  grab('MemoryStore'), grab('DbStore'), grab('exportData'), grab('exportText'), grab('readImport'), grab('readImportOf'), grabVar('XP_PER_WATER'), grab('hasId'), grab('mergeImport')].join('\n');
var box={};
new Function(src+'\nthis.MemoryStore=MemoryStore;this.exportData=exportData;this.exportText=exportText;'+
  'this.readImport=readImport;this.mergeImport=mergeImport;this.dbDocs=dbDocs;this.dbApply=dbApply;this.DbStore=DbStore;this.docFault=docFault;').call(box);

var fails=0, pending=[];
function t(name,fn){ pending.push([name,fn]); }

var seed=require('./test-env.js').seedOf(h);
// The seed has no plan, extras or session, so give it each, or the round trip
// compares empty lists.
function rich(){
  var st=JSON.parse(JSON.stringify(seed));
  st.shopExtras=[{id:'x1',text:'Bin bags'}]; st.shoppingChecked=['x|x1'];
  st.deletedRecipes=['p3']; st.weekTarget=4;
  var rid=st.recipes[0].id;
  st.plan=[{id:'pl1',recipeId:rid,date:'2026-09-07',slot:'dinner',portions:2},
           {id:'pl2',recipeId:rid,date:'2026-09-10',slot:'lunch',portions:1}];
  st.activeSession={workoutId:'w1',startedAt:'2026-09-05',exIds:['press_bench'],targets:{},logs:{press_bench:[{v:8,w:60,t:1}]}};
  st.recipes[1]._ings=[{n:'cached'}];
  return st;
}
function noStamp(o){ var c=JSON.parse(JSON.stringify(o)); delete c.exportedAt; return c; }

t('export then import into an empty store reproduces the state exactly', async function(){
  var st=rich(), out=box.exportText(st), ex=JSON.parse(out);
  assert.strictEqual(ex.schema,1); assert.ok(typeof ex.exportedAt==='string');
  assert.ok(!('_ings' in ex.recipes[1]),'a render cache was exported');
  var r=box.readImport(out); assert.ok(r.ok,r.msg);
  var s=box.MemoryStore(), docs=box.dbDocs(r.state);
  for(var p in docs) await s.put(p,docs[p]);
  var back=box.dbApply(await s.readAll());
  assert.deepStrictEqual(noStamp(box.exportData(back)),noStamp(ex));
  assert.deepStrictEqual(Object.keys(s.dump()).sort(),Object.keys(box.dbDocs(st)).sort());
  assert.deepStrictEqual(r.summary.days,Object.keys(st.days).length);
  assert.strictEqual(r.summary.sessions,st.workoutLogs.length);
  assert.strictEqual(r.summary.meals,2);
});

t('malformed input is refused with a message', function(){
  var good=JSON.parse(box.exportText(rich()));
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  [['',/Paste/],['{not json',/not valid JSON/],['[1,2]',/not a Fight Card/],['"text"',/not a Fight Card/],
   ['{}',/no schema/],[w(function(o){o.schema=2;}),/schema 2/],
   [w(function(o){o.days={'yesterday':{}};}),/not a date/],
   [w(function(o){o.days={'2026-01-01':5};}),/not a date/],
   [w(function(o){o.workoutLogs='x';}),/should be a list/],
   [w(function(o){o.workoutLogs[0].id='../state/profile';}),/no usable id/],
   [w(function(o){o.library.push(o.library[0]);}),/twice/],
   [w(function(o){delete o.workoutLogs[0].logs;}),/no sets/],
   [w(function(o){o.plan[0].date='soon';}),/no date/],
   [w(function(o){o.waterTarget=99;}),/waterTarget/],
   [w(function(o){o.totalXp=-1;}),/totalXp/],
   [w(function(o){o.shopExtras=[{id:'a'}];}),/shopExtras/],
   [w(function(o){o.activeSession='go';}),/activeSession/]
  ].forEach(function(c){
    var r=box.readImport(c[0]);
    assert.strictEqual(r.ok,false,'accepted: '+c[0].slice(0,60));
    assert.ok(c[1].test(r.msg),'message "'+r.msg+'" for '+c[0].slice(0,60));
  });
});

// One field of the wrong kind gets past a check on ids and keys and breaks
// render, which is where the way back is drawn, on every load after.
t('a field of the wrong kind is refused, and a real export still passes', function(){
  var good=JSON.parse(box.exportText(rich())), day=Object.keys(good.days)[0];
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  assert.ok(box.readImport(JSON.stringify(good)).ok,'a real export was refused');
  [[w(function(o){o.library[0].title=5;}),/title/],
   [w(function(o){o.workoutLogs[0].logs={press_bench:5};}),/logs/],
   [w(function(o){o.workoutLogs[0].logs={press_bench:[{v:'<b>'}]};}),/logs/],
   [w(function(o){o.recipes[0].ingredients=[5];}),/ingredients/],
   [w(function(o){o.days[day].water='lots';}),/water/],
   [w(function(o){o.days[day].workout={type:3};}),/workout/],
   [w(function(o){o.plan[0].portions='x';}),/portions/],
   [w(function(o){o.saunaSessions[0].mins='<img>';}),/mins/],
   [w(function(o){o.activeSession.logs={press_bench:'x'};}),/activeSession/],
   [w(function(o){o.activeSession.exIds=[1];}),/activeSession/],
   [w(function(o){delete o.activeSession.targets;}),/activeSession/]
  ].forEach(function(c){
    var r=box.readImport(c[0]);
    assert.strictEqual(r.ok,false,'accepted: '+c[1]);
    assert.ok(c[1].test(r.msg),'message "'+r.msg+'" for '+c[1]);
  });
});

// Ids and keys become document paths, attribute values and lookups in plain
// objects. One named after a built-in (__proto__, constructor, toString) found
// that name already taken, and one holding markup landed in an attribute.
t('an id or key that is a built-in name or holds markup is refused for what it is', function(){
  var good=JSON.parse(box.exportText(rich()));
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  ['__proto__','constructor','toString'].forEach(function(id){
    var r=box.readImport(w(function(o){ o.library[0].id=id; }));
    assert.ok(!/twice/.test(r.msg||''),'the id "'+id+'" was said to appear twice: '+r.msg);
    assert.strictEqual(r.ok,false,'the id "'+id+'" was accepted');
    assert.ok(r.msg.indexOf(id)>-1,'the message does not name the id: '+r.msg);
  });
  // JSON.parse keeps "__proto__" as a key of its own, which no object built
  // in code can hold, so it is written into the text.
  var proto=w(function(o){ o.workoutLogs[0].logs={KEYHERE:[{v:5,w:null,t:1}]}; }).replace('"KEYHERE"','"__proto__"');
  [[proto,/__proto__/],
   [w(function(o){ o.workoutLogs[0].logs={'x"><img id=pwn src=x onerror=alert(1)>':[{v:5}]}; }),/logs/],
   [w(function(o){ o.workoutLogs[0].logs={constructor:[{v:5}]}; }),/logs/],
   [w(function(o){ o.activeSession.exIds=['press_bench','a"b']; }),/activeSession/],
   [w(function(o){ o.activeSession.targets={'<b>':{sets:3,reps:'8'}}; }),/activeSession/],
   [w(function(o){ o.activeSession.logs={'<b>':[{v:5}]}; }),/activeSession/],
   [w(function(o){ o.shopExtras=[{id:'__proto__',text:'Milk'}]; }),/shopExtras/]
  ].forEach(function(c){
    var r=box.readImport(c[0]);
    assert.strictEqual(r.ok,false,'accepted: '+c[0].slice(c[0].indexOf('"logs"'),c[0].indexOf('"logs"')+60));
    assert.ok(c[1].test(r.msg),'message "'+r.msg+'"');
  });
});

// Every field of a set is drawn on a chip, in the history and on the chart,
// so each has to be what logging a set writes, and the words a day or a
// session is filed under have to be ones the app has.
t('set fields, workout types, session tags and meal slots must be ones the app writes', function(){
  var good=JSON.parse(box.exportText(rich())), day=Object.keys(good.days)[0];
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  var ok=box.readImport(w(function(o){
    o.workoutLogs[0].logs={warmup:[{v:5,w:null,opt:'<b>Bike</b>',lvl:'6',lvlKind:'resistance',t:1}],
      cardio_gym_intervals:[{v:10,w:null,machine:'Rower',work:'Hard',rest:'Easy',wu:true,u:'min'}]};
    o.days[day].workout={done:true,type:'Boxing/MMA'}; o.workoutLogs[0].tag='Custom'; o.plan[0].slot='breakfast'; }));
  assert.ok(ok.ok,'a real set, type, tag and slot were refused: '+ok.msg);
  assert.strictEqual(ok.state.workoutLogs[0].logs.warmup[0].opt,'<b>Bike</b>','text in a set was changed rather than kept as text');
  [[w(function(o){ o.workoutLogs[0].logs={warmup:[{v:5,opt:5}]}; }),/logs/],
   [w(function(o){ o.workoutLogs[0].logs={cardio_gym_steady:[{v:5,machine:{}}]}; }),/logs/],
   [w(function(o){ o.workoutLogs[0].logs={press_bench:[{v:5,wu:'yes'}]}; }),/logs/],
   [w(function(o){ o.days[day].workout={done:true,type:'<img src=x onerror="window.__pwn=1">'}; }),/workout/],
   [w(function(o){ o.workoutLogs[0].tag='<img src=x>'; }),/tag/],
   [w(function(o){ o.plan[0].slot='constructor'; }),/meal/],
   [w(function(o){ delete o.plan[0].slot; }),/meal/]
  ].forEach(function(c){
    var r=box.readImport(c[0]);
    assert.strictEqual(r.ok,false,'accepted: '+c[1]);
    assert.ok(c[1].test(r.msg),'message "'+r.msg+'" for '+c[1]);
  });
});

// Each of these was taken as the right kind and then broke a render, hung
// one, or wrote a document no read finds: a count of a billion cups, a
// session dated 2026/10/01 or __proto__, a superset of 3e8 rounds or with no
// exercises in it, and macros that are not four numbers.
t('counts, a session\'s date, supersets and macros of the wrong shape are refused', function(){
  var good=JSON.parse(box.exportText(rich())), day=Object.keys(good.days)[0];
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  function ss(b){ return w(function(o){ o.activeSession.exIds.push('ss1'); o.activeSession.supersets={ss1:b}; }); }
  [[w(function(o){ o.days[day].water=1e9; }),/water/],
   [w(function(o){ o.days[day].water=-1; }),/water/],
   [w(function(o){ o.days[day].alcohol=2.5; }),/alcohol/],
   [w(function(o){ o.days[day].smoking=201; }),/smoking/],
   [w(function(o){ o.days[day].weed=-3; }),/weed/],
   [w(function(o){ o.days[day].wx='x'; }),/wx/],
   [w(function(o){ o.activeSession.startedAt='2026/10/01'; }),/activeSession/],
   [w(function(o){ o.activeSession.startedAt='__proto__'; }),/activeSession/],
   [w(function(o){ o.activeSession.startedAt='constructor'; }),/activeSession/],
   [ss({ex:['press_bench'],rounds:3e8}),/activeSession/],
   [ss({ex:['press_bench'],rounds:1.5}),/activeSession/],
   [ss({ex:'press_bench',rounds:1}),/activeSession/],
   [ss({rounds:1}),/activeSession/],
   [ss({ex:['press_bench','ss2'],rounds:0}),/activeSession/],
   [ss({ex:['press_bench'],rounds:1,roundLog:[['<b>']]}),/activeSession/],
   [ss({ex:['press_bench'],rounds:1,roundLog:'x'}),/activeSession/],
   [w(function(o){ o.activeSession.supersets={superset1:{ex:['press_bench'],rounds:0}}; }),/activeSession/],
   [w(function(o){ o.workoutLogs[0].supersets=[{rounds:2}]; }),/supersets/],
   [w(function(o){ o.workoutLogs[0].supersets=[{ex:'press_bench',rounds:2}]; }),/supersets/],
   [w(function(o){ o.workoutLogs[0].supersets=[{ex:['press_bench'],rounds:-1}]; }),/supersets/],
   [w(function(o){ o.recipes[0].macros=[500]; }),/macros/],
   [w(function(o){ o.recipes[0].macros=[500,30,40,-1]; }),/macros/],
   [w(function(o){ o.recipes[0].macros=[500,30,40,10,5]; }),/macros/]
  ].forEach(function(c){
    var r=box.readImport(c[0]);
    assert.strictEqual(r.ok,false,'accepted: '+c[1]+' in '+c[0].slice(-220));
    assert.ok(c[1].test(r.msg),'message "'+r.msg+'" for '+c[1]);
  });
  // What the app itself writes still goes in, a superset saved as a bare
  // list of its exercises included.
  [ss({ex:['press_bench','sq_goblet'],rounds:2,roundLog:[['press_bench'],['press_bench','sq_goblet']]}), ss(['press_bench','sq_goblet']),
   w(function(o){ o.days[day].water=100; o.days[day].alcohol=200; o.days[day].wx=8; o.activeSession.startedAt='2026-10-01';
     o.workoutLogs[0].supersets=[{ex:['press_bench','sq_goblet'],rounds:3}]; o.recipes[0].macros=[0,0,0,0]; delete o.recipes[1].macros; })
  ].forEach(function(c,i){ var r=box.readImport(c); assert.ok(r.ok,'case '+i+' was refused: '+r.msg); });
  assert.deepStrictEqual(box.readImport(ss(['press_bench'])).state.activeSession.supersets.ss1,{ex:['press_bench'],rounds:0});
});

// fits() lets a missing field through, so a day of {water:2} reached the
// render without the workout it reads on every draw.
t('a day with fields left out comes in as a whole day', function(){
  var r=box.readImport('{"schema":1,"days":{"2026-10-01":{"water":2,"alcohol":null},"2026-09-30":{"workout":{"done":true,"type":"Strength"}}}}');
  assert.ok(r.ok,r.msg);
  assert.deepStrictEqual(r.state.days['2026-10-01'],{water:2,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:false});
  assert.deepStrictEqual(r.state.days['2026-09-30'].workout,{done:true,type:'Strength'});
  assert.strictEqual(r.state.days['2026-09-30'].water,0);
  r=box.readImport('{"schema":1,"days":{"2026-10-01":{"workout":{"type":"Strength"}}}}'); assert.ok(r.ok,r.msg);
  assert.deepStrictEqual(r.state.days['2026-10-01'].workout,{done:false,type:'Strength'});
});

// The session slide reads the exercise's sets, type and figure, so one this
// version has never heard of stopped it drawing, and the reload with it.
t('an exercise this version does not know leaves the session, its sets kept for the log', function(){
  var good=JSON.parse(box.exportText(rich()));
  var r=box.readImport(JSON.stringify(Object.assign(good,{activeSession:{id:'sv2',workoutId:'w6',startedAt:'2026-10-01',t0:5,
    exIds:['press_bench_v2','press_bench','ss1'],targets:{press_bench_v2:{sets:3,reps:'8'},press_bench:{sets:3,reps:'8'}},
    logs:{press_bench_v2:[{v:8,w:60,t:2}]},supersets:{ss1:{ex:['press_bench_v2','sq_goblet'],rounds:0}}}})));
  assert.ok(r.ok,r.msg);
  var s=r.state.activeSession;
  assert.deepStrictEqual(s.exIds,['press_bench','ss1']);
  assert.deepStrictEqual(Object.keys(s.targets),['press_bench']);
  assert.deepStrictEqual(s.logs.press_bench_v2,[{v:8,w:60,t:2}],'the sets logged on it were dropped');
});

t('import only reads data: a script in it stays text', function(){
  var o=JSON.parse(box.exportText(rich()));
  o.library[0].title='<img src=x onerror=alert(1)>'; o.toString='function(){throw 1}'; o.__proto__x=1;
  var r=box.readImport(JSON.stringify(o)); assert.ok(r.ok,r.msg);
  assert.strictEqual(r.state.library[0].title,'<img src=x onerror=alert(1)>');
  assert.ok(!('__proto__x' in r.state) && typeof r.state.toString==='function','unknown keys were carried into state');
});

t('merge by id replaces matches, adds the rest and keeps this view\'s profile', function(){
  var cur=box.dbApply(box.dbDocs(rich())), inc=JSON.parse(box.exportText(rich()));
  inc.workoutLogs[0].title='Changed'; inc.workoutLogs.push({id:'wlnew',date:'2026-09-20',logs:{}});
  inc.days['2026-09-20']={water:3}; inc.totalXp=1; inc.weekTarget=7; inc.deletedRecipes=['zz'];
  var r=box.readImport(JSON.stringify(inc)); assert.ok(r.ok,r.msg);
  var m=box.mergeImport(cur,r.state);
  assert.strictEqual(m.workoutLogs.length,cur.workoutLogs.length+1);
  assert.strictEqual(m.workoutLogs.filter(function(l){return l.id===inc.workoutLogs[0].id;})[0].title,'Changed');
  assert.deepStrictEqual(m.days['2026-09-20'],{water:3,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:false});
  // The XP of what it brings in, 3 cups on a new day, and nothing for days it replaces with the same.
  assert.strictEqual(m.totalXp,cur.totalXp+6); assert.strictEqual(m.weekTarget,cur.weekTarget);
  assert.deepStrictEqual(m.deletedRecipes.sort(),['p3','zz']);
});

// A backup that could not be written to localStorage still holds the newest
// copy; the older one left there would put back data from two imports ago.
t('put back gives the latest backup even when only the first one reached localStorage', function(){
  var ls={n:0, v:{}, getItem:function(k){ return this.v[k]||null; },
    setItem:function(k,v){ if(this.n++) throw new Error('quota'); this.v[k]=v; },
    removeItem:function(k){ delete this.v[k]; }};
  var b={};
  new Function('localStorage',grabVar('dataPane')+grab('readBackup')+grab('writeBackup')+
    'this.read=readBackup;this.write=writeBackup;').call(b,ls);
  b.write('first'); b.write('second');
  assert.strictEqual(b.read(),'second');
  assert.deepStrictEqual(ls.v,{},'the older backup was left for the next load to offer');
});

t('MemoryStore keeps the db contract: copies out, update needs the document', async function(){
  var s=box.MemoryStore({'state/profile':{a:{b:1},c:[1]}}), heard=[];
  var off=s.subscribe(function(p,v){ heard.push(p); });
  var v=await s.get('state/profile'); v.a.b=9;
  assert.deepStrictEqual(await s.get('state/profile'),{a:{b:1},c:[1]},'a read body reached back into the store');
  await s.update('state/profile',{a:{d:2},c:[2]});
  assert.deepStrictEqual(await s.get('state/profile'),{a:{b:1,d:2},c:[2]});
  await assert.rejects(s.update('days/2026-01-01',{water:1}),function(e){ return e.code==='invalid_argument'; });
  await s.remove('state/profile'); off(); await s.put('state/profile',{});
  assert.strictEqual(await s.get('nope/x'),undefined);
  assert.deepStrictEqual(heard,['state/profile','state/profile']);
});

/* A dump of the old artifact's store, as ArtifactData reads it out: every
   document under its path. OLD_DOCS is dbDocs as it was at 5aba0f6, the
   handoff, verbatim, so the documents are shaped exactly as that version
   wrote them: the profile carrying the view's tab and slide, no week target,
   a session with no id or ended list, recipes holding a render cache and the
   old inPlan/day, drills in seconds. */
var OLD_DOCS=function dbDocs(st){
  var out={};
  out['state/profile']={waterTarget:st.waterTarget, totalXp:st.totalXp,
    uiTab:st.uiTab||'today', uiSlide:st.uiSlide||0, uiProgRange:st.uiProgRange||14,
    uiViewingSession:!!st.uiViewingSession};
  // A document body is an object, so a list or a nullable session is wrapped.
  out['state/shopping']={checked:(st.shoppingChecked||[]).slice(), extras:(st.shopExtras||[]).slice()};
  out['state/session']={active:st.activeSession||null};
  Object.keys(st.days||{}).forEach(function(k){ out['days/'+k]=st.days[k]; });
  (st.workoutLogs||[]).forEach(function(l){ if(l&&l.id) out['workoutLogs/'+l.id]=l; });
  (st.saunaSessions||[]).forEach(function(x){ if(x&&x.id) out['sauna/'+x.id]=x; });
  (st.library||[]).forEach(function(x){ if(x&&x.id) out['library/'+x.id]=x; });
  (st.recipes||[]).forEach(function(x){ if(x&&x.id) out['recipes/'+x.id]=box.stripDerived(x); });
  (st.plan||[]).forEach(function(x){ if(x&&x.id) out['plan/'+x.id]=x; });
  return out;
};
box.stripDerived=function(r){
  if(!r||(r._ings===undefined&&r._ingsFor===undefined)) return r;
  var out={}; Object.keys(r).forEach(function(k){ if(k!=='_ings'&&k!=='_ingsFor') out[k]=r[k]; });
  return out;
};
// State as 5aba0f6 held it, each entry as that version's code made it.
function oldState(){
  return {waterTarget:10, totalXp:420, uiTab:'progress', uiSlide:3, uiProgRange:30, uiViewingSession:true,
    days:{'2026-08-29':{water:6,workout:{done:true,type:'Conditioning'},rest:false,alcohol:2,smoking:0,weed:0,touched:true},
          '2026-08-30':{water:0,workout:{done:false,type:null},rest:true,alcohol:0,smoking:3,weed:1,touched:true}},
    workoutLogs:[{id:'wl1788070912139',workoutId:'w12',title:'Cardio \u2014 gym',tag:'Conditioning',date:'2026-08-30',
        logs:{cardio_gym_warmup:[{v:5,w:null}],cardio_gym_intervals:[{v:15,w:null}]}},
      {id:'wl1788000000000',workoutId:'w1',title:'Boxing technical',tag:'Boxing/MMA',date:'2026-08-29',
        logs:{technique:[{v:1500,w:null}],press_bench:[{v:8,w:60},{v:6,w:62.5}]},supersets:[{ex:['press_bench','sq_goblet'],rounds:3}]}],
    saunaSessions:[{date:'2026-09-01',mins:20,temp:70,position:'Top',id:'sa0-2026-09-01-20'},
      {id:'sa1788200000000',date:'2026-09-02',mins:25,temp:null,position:'Middle',stints:[{mins:10,position:'Top'},{mins:15,position:'Middle'}]}],
    library:[{id:'t1',title:'Weekly training template',tag:'Overview',notes:'Mon: Boxing.\nSun: Full rest.'}],
    recipes:[{id:'r1',title:'Overnight oats',tag:'Breakfast',ingredients:['Porridge oats (80g)','Honey (drizzle)'],instructions:'Stir.',
        inPlan:true,day:'Mon',base:1,macros:[620,24,78,22],portions:6,_ings:[{n:'Porridge oats',q:80,u:'g',raw:'Porridge oats (80g)'}]},
      {id:'r1788300000000',title:'Chilli',tag:'Recipe',ingredients:['Beef mince (500g)'],base:4,portions:4,instructions:''}],
    plan:[{id:'pl1788400000000-ab12',recipeId:'r1788300000000',date:'2026-09-03',slot:'dinner',portions:4}],
    shoppingChecked:['beef mince|g'], shopExtras:[{id:'x1788500000000',text:'Bin bags'}],
    activeSession:{workoutId:'w6',startedAt:'2026-09-03',exIds:['press_bench','ss1'],targets:{press_bench:{sets:3,reps:'8'}},
      logs:{press_bench:[{v:8,w:60}]},supersets:{ss1:['press_bench','sq_goblet']}}};
}
function oldDump(){ return JSON.parse(JSON.stringify(OLD_DOCS(oldState()))); }
t('a dump of the old artifact\'s store reads as a load of that store does', function(){
  var d=oldDump(); d['state/meta']={seeded:true,seededAt:'2026-08-29T10:00:00.000Z',docs:12};
  var r=box.readImport(JSON.stringify(d)); assert.ok(r.ok,r.msg);
  var st=r.state, want=box.dbApply(oldDump());
  assert.deepStrictEqual(Object.keys(st.days).sort(),['2026-08-29','2026-08-30']);
  assert.deepStrictEqual(st.days['2026-08-30'],want.days['2026-08-30']);
  assert.deepStrictEqual(st.workoutLogs.map(function(l){ return l.id; }),['wl1788000000000','wl1788070912139'],'sessions are not in the order they happened');
  assert.strictEqual(st.waterTarget,10); assert.strictEqual(st.totalXp,420); assert.strictEqual(st.weekTarget,3);
  assert.ok(!('uiTab' in st) && !('uiSlide' in st),'the old view state came in as data');
  assert.ok(!('_ings' in st.recipes[0]) && st.recipes[0].inPlan===true,'the recipe was not read as a load reads it');
  assert.deepStrictEqual(st.activeSession.supersets.ss1,{ex:['press_bench','sq_goblet'],rounds:0},'the old superset shape was not converted');
  assert.deepStrictEqual(st.shopExtras,[{id:'x1788500000000',text:'Bin bags'}]);
  assert.deepStrictEqual(r.summary,{days:2,sessions:2,meals:1,recipes:2,notes:1,sauna:2,exportedAt:'',docs:13,unused:0});
});
t('a dump as a list of {path, data} or of {collection, doc_id, data} reads the same', function(){
  var d=oldDump(), want=box.readImport(JSON.stringify(d));
  var byPath=Object.keys(d).map(function(p){ return {path:p, data:d[p]}; });
  var byColl=Object.keys(d).map(function(p){ var c=p.lastIndexOf('/');
    return {collection:p.slice(0,c), doc_id:p.slice(c+1), version:3, data:d[p]}; });
  [byPath,byColl].forEach(function(list,i){
    var r=box.readImport(JSON.stringify(list)); assert.ok(r.ok,'shape '+i+' was refused: '+r.msg);
    assert.deepStrictEqual(r.state,want.state,'shape '+i+' read differently');
    assert.deepStrictEqual(r.summary,want.summary);
  });
});
t('a dump folds in what a closed view sent beside a document, and fills an id from its path', function(){
  var d=oldDump();
  d['state/profile'].pend_abc={b:{totalXp:420},m:{totalXp:450}};
  delete d['library/t1'].id;
  d['notes/x']={a:1};
  var r=box.readImport(JSON.stringify(d)); assert.ok(r.ok,r.msg);
  assert.strictEqual(r.state.totalXp,450,'the XP sent beside the profile was lost');
  assert.strictEqual(r.state.library[0].id,'t1');
  assert.strictEqual(r.summary.unused,1,'a document this app does not use was not counted as left out');
});
t('a dump that cannot be read is refused with a reason', function(){
  var d=oldDump();
  [[JSON.stringify([{path:'days/2026-08-29'}]),/Entry 1 in that list/],
   [JSON.stringify([{collection:'days',data:{water:1}}]),/Entry 1 in that list/],
   [JSON.stringify({'state/meta':{seeded:true}}),/holds no Fight Card documents/],
   [JSON.stringify(Object.assign(d,{'days/2026-08-31/x':{water:1}})),/is not a date/],
   [JSON.stringify({'days/2026-08-29':{water:'lots'}}),/wrong kind/]
  ].forEach(function(c){ var r=box.readImport(c[0]); assert.ok(!r.ok,'took '+c[0].slice(0,80)); assert.ok(c[1].test(r.msg),r.msg); });
});

// Ids become document paths, and the store throws on a '.' or '..' segment.
t('an id that is "." or ".." is refused, and one with dots in it is not', function(){
  var good=JSON.parse(box.exportText(rich()));
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  [['library','.'],['library','..'],['workoutLogs','..'],['recipes','.'],['plan','..']].forEach(function(c){
    var r=box.readImport(w(function(o){ o[c[0]][0].id=c[1]; }));
    assert.strictEqual(r.ok,false,'the id "'+c[1]+'" in '+c[0]+' was accepted');
    assert.ok(/no usable id/.test(r.msg),r.msg);
  });
  ['...','.x','a.b','__x__'].forEach(function(id){
    var r=box.readImport(w(function(o){ o.library[0].id=id; })); assert.ok(r.ok,'the id "'+id+'" was refused: '+r.msg); });
});
// The store refuses a document nested past 32 levels, and stableJson
// overflowed on one thousands deep: in a field the shape check ignores it got
// through, and every save after threw. Deeper still, Check itself threw.
t('a value nested deeper than the store takes is refused at Check, however deep', function(){
  var good=JSON.parse(box.exportText(rich())), day=Object.keys(good.days)[0];
  function nest(n){ var t='1'; for(var i=0;i<n;i++) t='{"a":'+t+'}'; return t; }
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  [[w(function(o){ o.days[day].junk='DEEP'; }),3000],[w(function(o){ o.days[day].junk='DEEP'; }),6000],
   [w(function(o){ o.library[0].extra='DEEP'; }),40],[w(function(o){ o.days[day].junk='DEEP'; }),31],
   [w(function(o){ o.activeSession.supersets={ss1:{ex:['press_bench'],rounds:0,more:'DEEP'}}; o.activeSession.exIds.push('ss1'); }),40]
  ].forEach(function(c){
    var txt=c[0].replace('"DEEP"',nest(c[1])), r;
    assert.doesNotThrow(function(){ r=box.readImport(txt); },'Check threw at '+c[1]+' levels');
    assert.strictEqual(r.ok,false,c[1]+' levels were accepted');
    assert.ok(/nested/.test(r.msg),r.msg);
  });
  // As deep as an export goes is fine, with room for what a view closing sends.
  var r=box.readImport(w(function(o){ o.days[day].junk='DEEP'; }).replace('"DEEP"',nest(20)));
  assert.ok(r.ok,r.msg);
});
// The store takes 256 KiB a document: an import past it said "Imported." and
// was then refused on every save.
t('an entry too large for the store is refused at Check, by name', function(){
  var good=JSON.parse(box.exportText(rich()));
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  var r=box.readImport(w(function(o){ o.recipes[0].title='Big stew'; o.recipes[0].instructions='x'.repeat(300000); }));
  assert.strictEqual(r.ok,false,'a 300 KB recipe was accepted');
  assert.ok(/The recipe "Big stew" is too large to store/.test(r.msg),r.msg);
  // Measured in bytes, not characters: 100k characters of three bytes each.
  r=box.readImport(w(function(o){ o.library[0].title='Diary'; o.library[0].notes='☃'.repeat(100000); }));
  assert.strictEqual(r.ok,false,'a 300 KB note was accepted'); assert.ok(/The note "Diary" is too large/.test(r.msg),r.msg);
  r=box.readImport(w(function(o){ o.library[0].notes='x'.repeat(200000); }));
  assert.ok(r.ok,'a 200 KB note was refused: '+r.msg);
  var day=Object.keys(good.days)[0];
  r=box.readImport(w(function(o){ o.days[day].junk='x'.repeat(270000); }));
  assert.strictEqual(r.ok,false); assert.ok(r.msg.indexOf('The day '+day+' is too large')===0,r.msg);
  // {"a":"..."} is eight characters around the text.
  assert.strictEqual(box.docFault({a:'x'.repeat(262144-7)}),'large');
  assert.strictEqual(box.docFault({a:'x'.repeat(262144-8)}),'');
});
t('an ingredient line over 500 characters is refused at Check', function(){
  var good=JSON.parse(box.exportText(rich()));
  function w(f){ var o=JSON.parse(JSON.stringify(good)); f(o); return JSON.stringify(o); }
  var r=box.readImport(w(function(o){ o.recipes[0].title='Soup'; o.recipes[0].ingredients.push('x'+'('.repeat(600)); }));
  assert.strictEqual(r.ok,false,'a 601 character line was accepted');
  assert.ok(/The recipe "Soup" has an ingredient line over 500/.test(r.msg),r.msg);
  r=box.readImport(w(function(o){ o.recipes[0].ingredients.push('y'.repeat(500)); }));
  assert.ok(r.ok,'a 500 character line was refused: '+r.msg);
});
// The db throws a TypeError as the reference to a bad path is made. Thrown
// out of a batch, it stopped the rest of it, and with no code it was retried
// for ever.
t('a path the store throws on is one refused document, not a throw', async function(){
  var landed=[];
  var db={doc:function(path){ if(path.split('/').some(function(x){ return x==='.'||x==='..'; })) throw new TypeError('bad segment in '+path);
    return {set:function(){ landed.push(path); return Promise.resolve(); }, update:function(){ return Promise.resolve(); },
      delete:function(){ return Promise.resolve(); }, get:function(){ return Promise.resolve({exists:false}); }}; },
    collection:function(){ return {get:function(){ return Promise.resolve({docs:[]}); }}; }};
  var s=box.DbStore(db), errs=[];
  var jobs=['library/..','library/a','library/.'].map(function(p){
    var pr; assert.doesNotThrow(function(){ pr=s.put(p,{id:'x'}); },'put threw for '+p);
    return pr.then(function(){},function(e){ errs.push(e.code); }); });
  ['update','remove','get'].forEach(function(op){ var pr;
    assert.doesNotThrow(function(){ pr=op==='update'?s.update('plan/..',{a:1}):s[op]('plan/..'); },op+' threw');
    jobs.push(pr.then(function(){ errs.push('ok '+op); },function(e){ errs.push(e.code); })); });
  await Promise.all(jobs);
  assert.deepStrictEqual(landed,['library/a'],'the good document did not land');
  assert.deepStrictEqual(errs,['invalid_argument','invalid_argument','invalid_argument','invalid_argument','invalid_argument']);
});

(async function(){
  for(var i=0;i<pending.length;i++){
    try{ await pending[i][1](); console.log('  PASS  '+pending[i][0]); }
    catch(e){ fails++; console.log('  FAIL  '+pending[i][0]+'\n        '+e.message); }
  }
  console.log(fails?('\n'+fails+' FAILING'):'\nAll store checks pass.');
  process.exit(fails?1:0);
})();
