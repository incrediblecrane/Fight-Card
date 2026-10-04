// The coaching layer, headless: what a lift slide says about last time, what
// it prefills, warm-up sets, rest and session length, streaks that forgive a
// day not logged, the weekly target and the corrected form cues. Pure
// functions pulled out of the shipped index.html, so this tests what ships.
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

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

var box={};
var NAMES=['pad','dateKey','realToday','lastNKeys','last7Keys','hasOwn','perImplement','isSuperset','supersetMembers',
  'supersetBox','exDef','setLabel','computeStreaks','lastSetsFor','topReps','aimFor','lastTimeLine','prefillFor',
  'countsAsSet','restGoal','clock','sessionMinutes','lastDoneAgo','weekSessions','stepTarget','waterStep','minLogDate','unloggedYesterday'];
var loaded=null;
try{
  new Function(
    'var EX='+literal('var EX')+';\n'+
    'var WORKOUTS='+literal('var WORKOUTS')+';\n'+
    'var PER_IMPLEMENT='+literal('var PER_IMPLEMENT')+';\n'+
    'var BACKFILL_DAYS='+h.match(/BACKFILL_DAYS=(\d+)/)[1]+';\n'+
    'var XP_PER_WATER='+h.match(/XP_PER_WATER=(\d+)/)[1]+';\n'+
    'var DAY_MAX='+literal('var DAY_MAX')+';\n'+
    'var state={days:{},workoutLogs:[],activeSession:null};\n'+
    NAMES.map(grab).join('\n')+'\n'+
    'this.state=function(s){ state=s; };\n'+
    NAMES.map(function(n){ return 'this.'+n+'='+n+';'; }).join('')
  ).call(box);
  loaded=true;
}catch(e){ loaded=e; }

function keyAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return box.dateKey(d); }
function day(touched,use){ return {water:0,workout:{done:false,type:null},rest:false,alcohol:use||0,smoking:0,weed:0,touched:touched}; }

console.log('\nTHE APP CARRIES THE COACHING HELPERS');
t('every helper this suite needs is in index.html', function(){
  if(loaded!==true) throw loaded;
});

if(loaded===true){
  console.log('\nSTREAKS THAT FORGIVE A DAY NOT LOGGED');

  t('a day not logged between clean days is skipped, not a reset', function(){
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(1)]=day(true); days[keyAgo(3)]=day(true); days[keyAgo(4)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.computeStreaks().cleanStreak,4);
  });

  t('a day with something used still ends the clean streak', function(){
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(1)]=day(true,2); days[keyAgo(2)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.computeStreaks().cleanStreak,1);
  });

  t('the day streak lets one missed day go, but not two in a row', function(){
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(2)]=day(true); days[keyAgo(3)]=day(true);
    days[keyAgo(6)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.computeStreaks().dayStreak,3);
  });

  t('today not logged yet does not cost the day streak', function(){
    var days={}; days[keyAgo(1)]=day(true); days[keyAgo(2)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.computeStreaks().dayStreak,2);
  });

  t('logged days months ago are not a current clean streak', function(){
    var days={}; days[keyAgo(90)]=day(true); days[keyAgo(91)]=day(true); days[keyAgo(92)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.computeStreaks().cleanStreak,0);
  });

  t('a gap of more than a week not logged ends the clean streak', function(){
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(1)]=day(true); days[keyAgo(10)]=day(true); days[keyAgo(11)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.computeStreaks().cleanStreak,2);
  });

  t('a streak longer than 400 days is counted in full, and stops at the oldest day held', function(){
    var days={}; for(var i=0;i<450;i++) days[keyAgo(i)]=day(true);
    box.state({days:days,workoutLogs:[]});
    var s=box.computeStreaks();
    assert.strictEqual(s.dayStreak,450); assert.strictEqual(s.cleanStreak,450);
    box.state({days:{},workoutLogs:[]});
    assert.deepStrictEqual(box.computeStreaks(),{dayStreak:0,cleanStreak:0});
  });

  console.log('\nLAST TIME, PREFILL AND DOUBLE PROGRESSION');

  var logs=[
    {id:'a',workoutId:'w6',date:keyAgo(9),logs:{press_bench:[{v:8,w:55},{v:8,w:55}]}},
    {id:'b',workoutId:'w6',date:keyAgo(2),logs:{press_bench:[{v:10,w:20,wu:true},{v:8,w:60},{v:8,w:60},{v:8,w:60},{v:8,w:60}]}},
    {id:'c',workoutId:'w7',date:keyAgo(5),logs:{curl_bicep:[{v:12,w:12},{v:10,w:12},{v:9,w:12}]}}
  ];
  box.state({days:{},workoutLogs:logs,activeSession:null});

  t('last time is the newest session that did the lift, warm-ups left out', function(){
    var l=box.lastSetsFor('press_bench');
    assert.strictEqual(l.date,keyAgo(2));
    assert.strictEqual(l.sets.length,4);
    assert.ok(l.sets.every(function(s){ return !s.wu; }));
  });

  t('the top of a rep range is what progression aims at', function(){
    assert.strictEqual(box.topReps('8-10'),10);
    assert.strictEqual(box.topReps('8'),8);
    assert.strictEqual(box.topReps('8 each side'),8);
    assert.strictEqual(box.topReps('30-40m'),null);
    assert.strictEqual(box.topReps('30-45s'),null);
  });

  t('every set at the top of the range last time suggests adding weight', function(){
    var line=box.lastTimeLine(box.exDef('press_bench'),{sets:4,reps:'8'},box.lastSetsFor('press_bench'));
    assert.ok(/60kg × 8/.test(line),line);
    assert.ok(/4×8/.test(line) && /\+2\.5kg/.test(line),line);
  });

  t('short of the top, it says to build the reps first', function(){
    var line=box.lastTimeLine(box.exDef('curl_bicep'),{sets:3,reps:'12'},box.lastSetsFor('curl_bicep'));
    assert.ok(/12 on every set/.test(line),line);
    assert.ok(!/\+/.test(line),line);
  });

  t('a pair of dumbbells goes up in smaller steps, per dumbbell', function(){
    var l={date:keyAgo(1),sets:[{v:12,w:12},{v:12,w:12},{v:12,w:12}]};
    var line=box.lastTimeLine(box.exDef('curl_bicep'),{sets:3,reps:'12'},l);
    assert.ok(/\+2kg ea/.test(line),line);
  });

  t('nothing last time, nothing said', function(){
    assert.strictEqual(box.lastTimeLine(box.exDef('dip'),{sets:3,reps:'8-10'},null),'');
  });

  t('the boxes prefill from the first working set last time', function(){
    var p=box.prefillFor('press_bench',{logs:{}});
    assert.deepStrictEqual([p.w,p.v],[60,8]);
  });

  t('a ramp last time prefills the working weight at the reps the aim line asks for', function(){
    var l=[{id:'r',workoutId:'w6',date:keyAgo(1),logs:{press_bench:[{v:12,w:50},{v:6,w:80},{v:7,w:80}]}}];
    box.state({days:{},workoutLogs:l,activeSession:null});
    var line=box.lastTimeLine(box.exDef('press_bench'),{sets:3,reps:'8'},box.lastSetsFor('press_bench'));
    var p=box.prefillFor('press_bench',{logs:{}},{sets:3,reps:'8'});
    box.state({days:{},workoutLogs:logs,activeSession:null});
    assert.ok(/Aim for 8 on every set at 80kg/.test(line),line);
    assert.deepStrictEqual([p.w,p.v],[80,8]);
  });

  t('every set at the top last time prefills the weight up a step, at the bottom of the range', function(){
    var l=[{id:'r',workoutId:'w6',date:keyAgo(1),logs:{press_bench:[{v:10,w:60},{v:10,w:60},{v:10,w:60}],curl_bicep:[{v:12,w:12},{v:12,w:12},{v:12,w:12}]}}];
    box.state({days:{},workoutLogs:l,activeSession:null});
    var line=box.lastTimeLine(box.exDef('press_bench'),{sets:3,reps:'8-10'},box.lastSetsFor('press_bench'));
    var p=box.prefillFor('press_bench',{logs:{}},{sets:3,reps:'8-10'});
    var q=box.prefillFor('curl_bicep',{logs:{}},{sets:3,reps:'10-12'});
    box.state({days:{},workoutLogs:logs,activeSession:null});
    assert.ok(/try \+2\.5kg/.test(line),line);
    assert.deepStrictEqual([p.w,p.v],[62.5,8]);
    assert.deepStrictEqual([q.w,q.v],[14,10],'dumbbells go up 2kg each');
  });

  t('then from the previous set in this session', function(){
    var p=box.prefillFor('press_bench',{logs:{press_bench:[{v:8,w:62.5},{v:7,w:62.5}]}});
    assert.deepStrictEqual([p.w,p.v],[62.5,7]);
  });

  t('a warm-up set in this session is not what the next working set copies', function(){
    var p=box.prefillFor('press_bench',{logs:{press_bench:[{v:10,w:20,wu:true}]}});
    assert.deepStrictEqual([p.w,p.v],[60,8]);
  });

  console.log('\nWARM-UP SETS');

  t('a warm-up set is not a set for the counts', function(){
    assert.strictEqual(box.countsAsSet('press_bench',{v:8,w:60}),true);
    assert.strictEqual(box.countsAsSet('press_bench',{v:10,w:20,wu:true}),false);
  });

  t('a prep step is not a set unless it was sets at a weight', function(){
    assert.strictEqual(box.countsAsSet('warmup',{v:5}),false);
    assert.strictEqual(box.countsAsSet('warmup',{v:5,w:40,lvlKind:'load'}),true);
  });

  console.log('\nREST AND SESSION LENGTH');

  t('a heavy lift rests longer than a light one, and a stretch has no rest line', function(){
    assert.strictEqual(box.restGoal(box.exDef('press_bench'),{reps:'5'}),150);
    assert.strictEqual(box.restGoal(box.exDef('curl_bicep'),{reps:'12'}),90);
    assert.strictEqual(box.restGoal(box.exDef('pushup'),{reps:'12-15'}),60);
    assert.strictEqual(box.restGoal(box.exDef('hipflexor'),{reps:'30s'}),0);
    assert.strictEqual(box.restGoal(box.exDef('warmup'),{reps:'5-10 min'}),0);
  });

  t('the rest clock reads minutes and seconds', function(){
    assert.strictEqual(box.clock(102),'1:42');
    assert.strictEqual(box.clock(150),'2:30');
    assert.strictEqual(box.clock(5),'0:05');
  });

  t('a session is timed from its start to the finish', function(){
    var t0=Date.UTC(2026,8,1,10,0,0);
    var s={t0:t0,logs:{press_bench:[{v:8,w:60,t:t0+300000}]}};
    assert.strictEqual(box.sessionMinutes(s,t0+52*60000),52);
  });

  t('a session left open for hours ends at its last set', function(){
    var t0=Date.UTC(2026,8,1,10,0,0);
    var s={t0:t0,logs:{press_bench:[{v:8,w:60,t:t0+40*60000}]}};
    assert.strictEqual(box.sessionMinutes(s,t0+9*3600000),40);
  });

  t('a session opened hours before its first set is timed from that set', function(){
    var t0=Date.UTC(2026,8,1,8,0,0), f=t0+9*3600000;
    var s={t0:t0,logs:{press_bench:[{v:8,w:60,t:f},{v:8,w:60,t:f+30*60000}]}};
    assert.strictEqual(box.sessionMinutes(s,f+45*60000),45);
    assert.strictEqual(box.sessionMinutes(s,f+20*3600000),30);
  });

  t('a session from before timestamps has no length rather than a wrong one', function(){
    assert.strictEqual(box.sessionMinutes({logs:{press_bench:[{v:8,w:60}]}},Date.now()),null);
  });

  console.log('\nWORKOUT CARDS AND THE WEEK');

  t('a workout card says when it was last done', function(){
    assert.strictEqual(box.lastDoneAgo('w6'),'last done 2 days ago');
    assert.strictEqual(box.lastDoneAgo('w7'),'last done 5 days ago');
    assert.strictEqual(box.lastDoneAgo('w1'),'');
  });

  t('today and yesterday read as words', function(){
    box.state({days:{},workoutLogs:[{id:'x',workoutId:'w8',date:keyAgo(0),logs:{}},{id:'y',workoutId:'w9',date:keyAgo(1),logs:{}}]});
    assert.strictEqual(box.lastDoneAgo('w8'),'last done today');
    assert.strictEqual(box.lastDoneAgo('w9'),'last done yesterday');
  });

  t('the week counts trained days in the last seven, quick logs included', function(){
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(0)].workout={done:true,type:'Strength'};
    days[keyAgo(3)]=day(true); days[keyAgo(3)].workout={done:true,type:'Cardio'};
    days[keyAgo(8)]=day(true); days[keyAgo(8)].workout={done:true,type:'Strength'};
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.weekSessions(),2);
  });

  t('two sessions on one day count as two', function(){
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(0)].workout={done:true,type:'Strength'};
    days[keyAgo(2)]=day(true); days[keyAgo(2)].workout={done:true,type:'Cardio'};
    box.state({days:days,workoutLogs:[{id:'p',workoutId:'w6',date:keyAgo(0),logs:{}},{id:'q',workoutId:'w7',date:keyAgo(0),logs:{}},
      {id:'r',workoutId:'w7',date:keyAgo(9),logs:{}}]});
    assert.strictEqual(box.weekSessions(),3);
  });

  console.log('\nYESTERDAY NOT LOGGED');

  t('a gap after recent logging is offered', function(){
    var days={}; days[keyAgo(3)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.unloggedYesterday(),keyAgo(1));
  });

  t('a first open, or a return after a long break, is not asked about yesterday', function(){
    box.state({days:{},workoutLogs:[]});
    assert.strictEqual(box.unloggedYesterday(),'');
    var days={}; days[keyAgo(0)]=day(true); days[keyAgo(40)]=day(true); days[keyAgo(1)]=day(false);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.unloggedYesterday(),'');
  });

  t('yesterday logged is not offered', function(){
    var days={}; days[keyAgo(1)]=day(true); days[keyAgo(2)]=day(true);
    box.state({days:days,workoutLogs:[]});
    assert.strictEqual(box.unloggedYesterday(),'');
  });

  console.log('\nWATER XP FOLLOWS WHAT WAS EARNED');

  t('lowering the target before removing water takes back all the XP it gave', function(){
    var e=day(false), xp=0, k;
    for(k=0;k<20;k++) xp+=box.waterStep(e,1,20);
    assert.strictEqual(xp,40);
    for(k=0;k<20;k++) xp+=box.waterStep(e,-1,4);
    assert.strictEqual(e.water,0); assert.strictEqual(xp,0);
  });

  t('raising the target before removing water takes back no more than it gave', function(){
    var e=day(false), xp=0, k;
    for(k=0;k<10;k++) xp+=box.waterStep(e,1,8);
    assert.strictEqual(xp,16);
    for(k=0;k<10;k++) xp+=box.waterStep(e,-1,20);
    assert.strictEqual(xp,0);
  });

  t('a day saved before the count was kept still gives and takes as before', function(){
    var e=day(true); e.water=10;
    assert.strictEqual(box.waterStep(e,-1,8),0);
    assert.strictEqual(box.waterStep(e,-1,8),0);
    assert.strictEqual(box.waterStep(e,-1,8),-2);
    assert.strictEqual(box.waterStep(e,1,8),2);
    assert.strictEqual(box.waterStep(e,1,8),0);
  });

  t('a day saved before the count was kept takes back no more than the default target paid, once the target is raised', function(){
    var e=day(true), xp=0, k; e.water=10;
    for(k=0;k<10;k++) xp+=box.waterStep(e,-1,12);
    assert.strictEqual(e.water,0); assert.ok(xp>=-16,'took back '+(-xp)+' XP');
  });

  // An import refuses more than this, so a tap stops here and the export goes back in.
  t('water stops at the most an import takes', function(){
    var e=day(true); e.water=99;
    box.waterStep(e,1,8); assert.strictEqual(e.water,100);
    assert.strictEqual(box.waterStep(e,1,8),0); assert.strictEqual(e.water,100);
    box.waterStep(e,-1,8); assert.strictEqual(e.water,99);
  });

  t('targets step inside their limits', function(){
    assert.strictEqual(box.stepTarget(8,1,4,20),9);
    assert.strictEqual(box.stepTarget(20,1,4,20),20);
    assert.strictEqual(box.stepTarget(4,-1,4,20),4);
    assert.strictEqual(box.stepTarget(undefined,1,1,7),1);
  });
}

console.log('\nTHE WEEKLY TARGET IS SAVED');
t('the profile document carries the weekly target and reads it back', function(){
  var b={};
  new Function('function planOrder(){ return 0; }\nvar DB_LISTS='+literal('var DB_LISTS')+';\n'+grab('stableJson')+'\n'+grab('dbClone')+'\n'+grab('stripDerived')+'\n'+grab('isBlankDay')+'\n'+grab('dbDocs')+'\n'+grab('byDateId')+'\n'+grab('listKey')+'\n'+grab('byListId')+'\n'+grab('sessId')+'\n'+grab('liveSession')+'\n'+grab('dbApply')+
    '\nthis.dbDocs=dbDocs;this.dbApply=dbApply;').call(b);
  var docs=b.dbDocs({waterTarget:10,weekTarget:4,totalXp:0,days:{}});
  assert.strictEqual(docs['state/profile'].weekTarget,4);
  assert.strictEqual(b.dbApply({'state/profile':{waterTarget:10,weekTarget:4,totalXp:0}}).weekTarget,4);
  assert.strictEqual(b.dbApply({'state/profile':{waterTarget:10,totalXp:0}}).weekTarget,3);
  assert.ok(/'state\/profile':\[[^\]]*'weekTarget'/.test(h),'weekTarget is not merged field by field');
});

console.log('\nFORM CUES THE TRAINER FLAGGED');
var EXL=null; try{ EXL=new Function('return '+literal('var EX'))(); }catch(e){}
function cue(id){ var e=(EXL||[]).filter(function(x){ return x.id===id; })[0]; return e?e.cue:''; }
t('goblet squat: weight through the mid-foot, not the heels', function(){
  assert.ok(/mid-?foot/i.test(cue('sq_goblet')),cue('sq_goblet'));
  assert.ok(!/heels/i.test(cue('sq_goblet')),cue('sq_goblet'));
});
t('dip: down to upper arms about parallel, not shoulders below elbows', function(){
  assert.ok(/parallel/i.test(cue('dip')),cue('dip'));
  assert.ok(!/below your elbows/i.test(cue('dip')),cue('dip'));
});
t('hip flexor stretch: tuck the pelvis rather than pushing the hips forward', function(){
  assert.ok(/tuck|posterior/i.test(cue('hipflexor')),cue('hipflexor'));
  assert.ok(/squeez\w* the glute/i.test(cue('hipflexor')),cue('hipflexor'));
});
t('face pull: finish with the hands back and the forearms rotated up', function(){
  assert.ok(/rotat/i.test(cue('facepull')),cue('facepull'));
});
t('burpee: hands down, feet back, chest down, in that order', function(){
  var c=cue('burpee');
  var a=c.search(/hands/i), b=c.search(/feet back|jump your feet back|kick your feet back/i), d=c.search(/chest/i);
  assert.ok(a>-1 && b>a && d>b,c);
});
t('the bodyweight session has a glute bridge', function(){
  var W=new Function('return '+literal('var WORKOUTS'))();
  var w10=W.filter(function(w){ return w.id==='w10'; })[0];
  assert.ok(w10.plan.some(function(p){ return p.ex==='glutebridge'; }),JSON.stringify(w10.plan.map(function(p){ return p.ex; })));
});

console.log(fails?('\n'+fails+' FAILED'):'\nall passed');
process.exit(fails?1:0);
