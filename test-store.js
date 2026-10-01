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
var src=[grabVar('SESS_ENDED_KEEP'), grabVar('DB_LISTS'), grabVar('SLOTS'), grabVar('DB_COLLECTIONS'), grabVar('DB_STATE_DOCS'),
  grabVar('EXPORT_SCHEMA'), h.match(/var EXPORT_KEYS=\[[^\]]*\];/)[0], grabVar('EXPORT_LISTS'), grabVar('IMPORT_SET'), h.match(/var IMPORT_FIELDS=\{[\s\S]*?\}\};/)[0],
  grab('slotRank'), grab('planOrder'), grab('dbClone'), grab('stripDerived'), grab('dbDocs'), grab('byDateId'), grab('sessId'), grab('liveSession'), grab('dbApply'),
  grab('MemoryStore'), grab('exportData'), grab('exportText'), grab('readImport'), grab('mergeImport')].join('\n');
var box={};
new Function(src+'\nthis.MemoryStore=MemoryStore;this.exportData=exportData;this.exportText=exportText;'+
  'this.readImport=readImport;this.mergeImport=mergeImport;this.dbDocs=dbDocs;this.dbApply=dbApply;').call(box);

var fails=0, pending=[];
function t(name,fn){ pending.push([name,fn]); }

var seed=JSON.parse(h.slice(h.lastIndexOf(')({')+2, h.lastIndexOf(');</'+'script>')));
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
  assert.deepStrictEqual(m.days['2026-09-20'],{water:3});
  assert.strictEqual(m.totalXp,cur.totalXp); assert.strictEqual(m.weekTarget,cur.weekTarget);
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

(async function(){
  for(var i=0;i<pending.length;i++){
    try{ await pending[i][1](); console.log('  PASS  '+pending[i][0]); }
    catch(e){ fails++; console.log('  FAIL  '+pending[i][0]+'\n        '+e.message); }
  }
  console.log(fails?('\n'+fails+' FAILING'):'\nAll store checks pass.');
  process.exit(fails?1:0);
})();
