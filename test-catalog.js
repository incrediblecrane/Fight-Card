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

t('every workout has a title, a warm-up and a cool-down', function(){
  var thin=WORKOUTS.filter(function(w){ return !w.title||!w.warmup||!w.cooldown; })
    .map(function(w){ return w.id; });
  assert.deepStrictEqual(thin,[], 'incomplete: '+thin.join(', '));
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
    (e.type==='cardio'||e.type==='prep')?'min':'reps';
}
function targetUnit(r){
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

console.log(fails?('\n'+fails+' FAILING\n'):'\nCatalogue is consistent.\n');
process.exit(fails?1:0);
