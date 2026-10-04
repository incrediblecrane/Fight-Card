// The exercise and workout catalogues, checked as data.
//
// The failure this exists for: the Forearms workout was written with id "w17",
// which "Own session" already had. Nothing complained. The app looks a workout
// up by id, found the first match, and tapping Start on the custom session
// opened a fixed five-lift forearm plan instead. A duplicate id does not throw,
// it just quietly makes one of the two entries unreachable.
var fs=require('fs'), assert=require('assert');
var h=fs.readFileSync(__dirname+'/index.html','utf8');

function literal(decl){
  var i=h.indexOf('\n'+decl+'=[');
  if(i<0) throw new Error('could not find '+decl+' in index.html');
  i=h.indexOf('[', i);
  var depth=0;
  for(var k=i;k<h.length;k++){
    if(h[k]==='[') depth++;
    else if(h[k]===']'){ depth--; if(!depth) return eval('('+h.slice(i,k+1)+')'); }
  }
  throw new Error(decl+' never closed');
}
var EX=literal('var EX'), WORKOUTS=literal('var WORKOUTS');

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

function dupes(list){
  var seen={}, out=[];
  list.forEach(function(x){ if(seen[x.id]) out.push(x.id); seen[x.id]=1; });
  return out;
}

console.log('\nCATALOGUE');

t('no two workouts share an id', function(){
  var d=dupes(WORKOUTS);
  assert.deepStrictEqual(d,[], 'duplicated: '+d.map(function(id){
    return id+' ('+WORKOUTS.filter(function(w){return w.id===id;})
      .map(function(w){return w.title;}).join(' and ')+')'; }).join(', '));
});

t('no two exercises share an id', function(){
  var d=dupes(EX);
  assert.deepStrictEqual(d,[], 'duplicated: '+d.map(function(id){
    return id+' ('+EX.filter(function(e){return e.id===id;})
      .map(function(e){return e.name;}).join(' and ')+')'; }).join(', '));
});

t('every workout names exercises that exist', function(){
  var have={}; EX.forEach(function(e){ have[e.id]=1; });
  var missing=[];
  WORKOUTS.forEach(function(w){
    (w.plan||[]).forEach(function(s){ if(!have[s.ex]) missing.push(w.title+' -> '+s.ex); });
  });
  assert.deepStrictEqual(missing,[], 'planned but not in the library: '+missing.join(', '));
});

t('every workout has a title, a warm-up and a cool-down, unless it opts out of one', function(){
  var thin=WORKOUTS.filter(function(w){ var off=w.prep||{};
    return !w.title||(!w.warmup&&off.warmup!==false)||(!w.cooldown&&off.cooldown!==false); })
    .map(function(w){ return w.id; });
  assert.deepStrictEqual(thin,[], 'incomplete: '+thin.join(', '));
});

// A workout's warm-up and cool-down words are shown on a slide with that role:
// the generic step put into a session without one of its own, or the plan's
// own step (workoutProse). Words for a step no session has are never read, and
// Reset used to say "None needed" above a warm-up it then put in anyway.
t('every workout warm-up and cool-down is shown on some slide', function(){
  var byId={}; EX.forEach(function(e){ byId[e.id]=e; });
  var dead=[];
  WORKOUTS.forEach(function(w){
    ['warmup','cooldown'].forEach(function(r){
      var own=(w.plan||[]).some(function(p){ return byId[p.ex] && byId[p.ex].role===r; });
      var generic=!own && !(w.prep && w.prep[r]===false);
      if(w[r]!==undefined && !own && !generic) dead.push(w.id+' '+r+' "'+w[r]+'"');
    });
  });
  assert.deepStrictEqual(dead,[], 'never shown: '+dead.join(', '));
});

t('the app shows a plan step its workout words, and leaves the generic step out where asked', function(){
  assert.ok(/function workoutProse\(w,id\)[\s\S]{0,300}w\.plan\.some/.test(h), 'workoutProse no longer reads the plan');
  assert.ok(/off\.warmup!==false/.test(h) && /off\.cooldown!==false/.test(h), 'ensurePrep no longer reads the opt-out');
});

// A weight is one implement only where PER_IMPLEMENT says so. A cue offering
// dumbbells on a lift logged as one barbell is a pair logged as half of itself.
t('no lift logged as one weight tells you to use dumbbells', function(){
  var PER=eval('('+h.slice(h.indexOf('{',h.indexOf('\nvar PER_IMPLEMENT=')),h.indexOf('}',h.indexOf('\nvar PER_IMPLEMENT='))+1)+')');
  var bad=EX.filter(function(e){ return e.type==='load' && !PER[e.id] && /dumbbells/i.test(e.cue); })
    .map(function(e){ return e.id; });
  assert.deepStrictEqual(bad,[], 'cue offers dumbbells: '+bad.join(', '));
});

// Volume multiplies by `sides`, so a lift whose reps are per side and does not
// say so counts half.
t('every lift with reps per side says so with sides:2', function(){
  var bad=EX.filter(function(e){ return e.type==='load' && /each side/.test(e.reps||'')!==(e.sides===2); })
    .map(function(e){ return e.id+' "'+e.reps+'" sides '+e.sides; });
  assert.deepStrictEqual(bad,[], bad.join(', '));
});

t('no two workouts share a title, so a card can be told apart', function(){
  var seen={}, d=[];
  WORKOUTS.forEach(function(w){ if(seen[w.title]) d.push(w.title); seen[w.title]=1; });
  assert.deepStrictEqual(d,[], 'duplicated: '+d.join(', '));
});

console.log('\nTARGETS AND UNITS');

// What the target asks for has to be what the input logs: a target of 40s on
// an exercise whose box asks for reps, or "20-30 min" on one logged in
// seconds, is a number typed in one unit and read back in another.
function unitOf(e){
  return e.type==='time'?(e.unit==='min'?'min':'s'):e.type==='distance'?'m':
    (e.type==='cardio'||e.type==='prep')?'min':e.unit==='rounds'?'rounds':'reps';
}
function targetUnit(r){
  if(/\d\s*rounds?\b/.test(r)) return 'rounds';
  if(/\d\s*min\b/.test(r)) return 'min';
  if(/\d\s*s\b/.test(r)) return 's';
  if(/\d\s*m\b/.test(r)) return 'm';
  return 'reps';
}
t('every target is in the unit its exercise logs', function(){
  var byId={}; EX.forEach(function(e){ byId[e.id]=e; });
  var bad=[];
  EX.forEach(function(e){
    if(e.type==='superset'||!e.reps) return;
    if(targetUnit(e.reps)!==unitOf(e)) bad.push(e.id+' "'+e.reps+'" logs '+unitOf(e));
  });
  WORKOUTS.forEach(function(w){ (w.plan||[]).forEach(function(s){
    var e=byId[s.ex]; if(!e) return;
    if(targetUnit(s.reps)!==unitOf(e)) bad.push(w.id+' '+s.ex+' "'+s.reps+'" logs '+unitOf(e));
  }); });
  assert.deepStrictEqual(bad,[], 'mismatched: '+bad.join(', '));
});

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
var box={};
new Function('EX','state',
  'function perImplement(){ return null; }\n'+grab('exDef')+'\n'+grab('isSuperset')+'\n'+
  grab('setLabel')+'\n'+grab('bestUnit')+'\n'+grab('migrateMinutes')+'\n'+
  'this.setLabel=setLabel;this.bestUnit=bestUnit;this.exDef=exDef;'+
  'this.migrate=function(st){ state=st; return migrateMinutes(); };').call(box,EX,{});

t('a block logged in minutes reads back in minutes', function(){
  assert.strictEqual(box.setLabel(box.exDef('technique'),{v:25}),'25 min');
  assert.strictEqual(box.bestUnit('time',box.exDef('briskwalkjog')),'min');
  assert.strictEqual(box.setLabel(box.exDef('plank'),{v:45}),'45s');
});

t('old technique logs typed as seconds are converted once, minutes left alone', function(){
  // The box used to ask for seconds. Nobody drills for under two minutes, so
  // a small number was already minutes and a big one was seconds.
  var st={workoutLogs:[{id:'a',date:'2026-09-01',logs:{technique:[{v:25,w:null},{v:1800,w:null}],
    briskwalkjog:[{v:900,w:null}], plank:[{v:300,w:null}]}}],
    activeSession:{logs:{technique:[{v:20,w:null}]}}};
  assert.strictEqual(box.migrate(st),true,'nothing was migrated');
  var l=st.workoutLogs[0].logs;
  assert.deepStrictEqual(l.technique.map(function(x){return x.v;}),[25,30]);
  assert.strictEqual(l.briskwalkjog[0].v,15);
  assert.strictEqual(l.plank[0].v,300,'a seconds exercise was touched');
  assert.strictEqual(st.activeSession.logs.technique[0].v,20);
  assert.strictEqual(box.migrate(st),false,'it ran twice');
  assert.deepStrictEqual(l.technique.map(function(x){return x.v;}),[25,30],'a second run changed it');
});

console.log('\nEXERCISE SEARCH');

// The picker's own matcher, run against the real library. Names are
// hyphenated, so "pushups" found nothing, and the plural fallback let "ab"
// land inside "cable" and "jab".
var pick=(function(){
  var a=h.indexOf('\nvar PICK_ALIAS'); if(a<0) a=h.indexOf('\nfunction pickerMatches(');
  var b=h.indexOf('\nfunction pickerResults(');
  var state={activeSession:null};
  return eval('(function(){'+h.slice(a,b)+'\nreturn pickerMatches;})()');
})();
function ids(q){ return pick(q).map(function(e){ return e.id; }); }
var CORE=EX.filter(function(e){ return e.area==='Core & rotation'; }).map(function(e){ return e.id; });

t('plural and hyphen-free names find the hyphenated exercise', function(){
  [['pushups','pushup'],['pushup','pushup'],['push ups','pushup'],['push-ups','pushup'],['pullups','pullup'],
   ['chinups','chinup'],['situps','situpwallthrow'],['farmers carry','farmerscarry'],['shrugs','shrug']]
    .forEach(function(c){ assert.ok(ids(c[0]).indexOf(c[1])>-1,'"'+c[0]+'" found: '+(ids(c[0]).join(',')||'nothing')); });
});

t('swim finds all four swim exercises', function(){
  var r=ids('swim');
  ['swim_warmup','swim_drill','swim_main','swim_cooldown'].forEach(function(id){
    assert.ok(r.indexOf(id)>-1,'"swim" missed '+id+': '+r.join(','));
  });
});

t('short names and ids find the lift: rdl, ohp, tgu, jump rope', function(){
  assert.ok(ids('rdl').indexOf('dl_rdl')>-1,'rdl: '+ids('rdl'));
  assert.ok(ids('ohp').indexOf('press_ohp')>-1,'ohp: '+ids('ohp'));
  assert.ok(ids('tgu').indexOf('kb_tgu')>-1,'tgu: '+ids('tgu'));
  assert.ok(ids('jump rope').indexOf('skipping')>-1,'jump rope: '+ids('jump rope'));
});

t('rows finds the rows and not the throws', function(){
  var r=ids('rows');
  ['row_bent','row_single','invertedrow'].forEach(function(id){ assert.ok(r.indexOf(id)>-1,'rows missed '+id+': '+r); });
  ['medballthrow','situpwallthrow'].forEach(function(id){ assert.ok(r.indexOf(id)<0,'rows hit '+id); });
});

t('abs finds the core work and no cable fly or jab drill', function(){
  var r=ids('abs');
  ['plank','deadbug','hollowhold','sideplank'].forEach(function(id){ assert.ok(r.indexOf(id)>-1,'abs missed '+id+': '+r); });
  r.forEach(function(id){ assert.ok(CORE.indexOf(id)>-1,'abs found '+id+', which is not core work'); });
});

t('bike, treadmill, rower and run find their machines', function(){
  ['bike','treadmill','run'].forEach(function(q){
    assert.ok(ids(q).indexOf('cardio_gym_intervals')>-1,q+' found: '+(ids(q).join(',')||'nothing'));
  });
  assert.ok(ids('rower').indexOf('rowerg')>-1,'rower found: '+ids('rower'));
  assert.ok(ids('run').indexOf('briskwalkjog')>-1,'run missed the walk or jog');
  assert.ok(ids('running').indexOf('sprint')>-1,'running missed the sprint');
});

t('words still land anywhere and a part word still narrows', function(){
  assert.ok(ids('fly reverse').indexOf('fly_cable_rev')>-1);
  assert.deepStrictEqual(ids('shrug'),['shrug']);
  assert.ok(ids('lift').indexOf('dl_conv')>-1,'lift no longer finds the deadlift');
  assert.strictEqual(ids('').length,EX.length,'an empty search should list everything');
});

console.log(fails?('\n'+fails+' FAILING\n'):'\nCatalogue is consistent.\n');
process.exit(fails?1:0);
