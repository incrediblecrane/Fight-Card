// The plan model and its migration, run headlessly against the shipped source
// so this tests the code that actually ships rather than a copy of it.
//
// The migration is a one-way door over real logged data: a recipe carrying the
// old inPlan/day pair becomes a planned meal, and the old fields are stripped
// so it can never run twice and double the week.
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
  var m=h.match(new RegExp('var '+decl+'=[^;]*;'));
  if(!m) throw new Error('could not find var '+decl);
  return m[0];
}

var src=[grabVar('SLOTS'), grabVar('WEEKDAY_INDEX'), grabVar('WEEKDAY_NAME'),
  grab('pad'), grab('dateKey'), grab('slotRank'), grab('planOrder'), grab('planDates'),
  grab('planWindow'), grab('dayLabel'), grab('recipeBase'), grab('recipePortions'),
  grab('migratePlan'), grab('prunePlan'), grab('addPlanEntry'),
  grab('removePlanEntry')].join('\n');

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

// A fresh sandbox per case, because migratePlan works on a shared `state`.
function sandbox(st){
  var box={state:st};
  new Function('state', src+'\nthis.migratePlan=migratePlan;this.planDates=planDates;'+
    'this.addPlanEntry=addPlanEntry;this.removePlanEntry=removePlanEntry;this.prunePlan=prunePlan;'+
    'this.dayLabel=dayLabel;this.planOrder=planOrder;').call(box, st);
  return box;
}
function recipes(){
  return [{id:'r1', title:'Chilli', base:4, portions:6, inPlan:true, day:'Thu', ingredients:[]},
          {id:'r2', title:'Oats', base:1, inPlan:false, day:'Unassigned', ingredients:[]},
          {id:'r3', title:'Salmon', base:2, inPlan:true, day:'Unassigned', ingredients:[]}];
}

console.log('\nMIGRATING OFF THE OLD SHAPE');

t('a ticked recipe becomes one planned meal', function(){
  var st={recipes:recipes(), plan:[]};
  var box=sandbox(st);
  assert.strictEqual(box.migratePlan(), true, 'it reported nothing to do');
  assert.strictEqual(st.plan.length, 2, 'expected two planned meals, got '+st.plan.length);
  var ids=st.plan.map(function(e){return e.recipeId;}).sort();
  assert.deepStrictEqual(ids, ['r1','r3'], 'wrong recipes planned: '+ids.join(', '));
});

t('the portions the recipe was set to come with it', function(){
  var st={recipes:recipes(), plan:[]};
  var box=sandbox(st);
  box.migratePlan();
  var chilli=st.plan.filter(function(e){return e.recipeId==='r1';})[0];
  assert.strictEqual(chilli.portions, 6, 'portions came through as '+chilli.portions);
  // A recipe with no explicit portions falls back to its batch size.
  var salmon=st.plan.filter(function(e){return e.recipeId==='r3';})[0];
  assert.strictEqual(salmon.portions, 2, 'salmon portions came through as '+salmon.portions);
});

t('a weekday name lands on that weekday inside the window', function(){
  var st={recipes:recipes(), plan:[]};
  var box=sandbox(st);
  box.migratePlan();
  var chilli=st.plan.filter(function(e){return e.recipeId==='r1';})[0];
  var dates=box.planDates();
  assert.ok(dates.indexOf(chilli.date)>-1, chilli.date+' is outside the seven days shown');
  assert.strictEqual(new Date(chilli.date+'T00:00:00').getDay(), 4,
    chilli.date+' is not a Thursday');
});

t('an unassigned recipe lands on today rather than being dropped', function(){
  var st={recipes:recipes(), plan:[]};
  var box=sandbox(st);
  box.migratePlan();
  var salmon=st.plan.filter(function(e){return e.recipeId==='r3';})[0];
  assert.strictEqual(salmon.date, box.planDates()[0], 'unassigned landed on '+salmon.date);
});

t('everything migrated defaults to dinner', function(){
  var st={recipes:recipes(), plan:[]};
  var box=sandbox(st);
  box.migratePlan();
  assert.ok(st.plan.every(function(e){return e.slot==='dinner';}),
    'slots are '+st.plan.map(function(e){return e.slot;}).join(', '));
});

t('the old fields are stripped, so it cannot run twice', function(){
  // The failure this prevents: every reload doubling the week.
  var st={recipes:recipes(), plan:[]};
  var box=sandbox(st);
  box.migratePlan();
  var after=st.plan.length;
  assert.ok(st.recipes.every(function(r){ return !('inPlan' in r) && !('day' in r); }),
    'a recipe still carries the old fields');
  assert.strictEqual(box.migratePlan(), false, 'it thought there was more to migrate');
  assert.strictEqual(st.plan.length, after, 'a second run added '+(st.plan.length-after)+' meals');
});

t('a state already in the new shape is left alone', function(){
  var st={recipes:[{id:'r1', title:'Chilli', base:4, ingredients:[]}],
          plan:[{id:'p1', recipeId:'r1', date:'2026-01-01', slot:'lunch', portions:3}]};
  var box=sandbox(st);
  assert.strictEqual(box.migratePlan(), false, 'it tried to migrate a clean state');
  assert.strictEqual(st.plan.length, 1, 'the existing plan was disturbed');
});

console.log('\nPLANNING THE SAME MEAL TWICE');

t('adding the same recipe twice makes two meals, not one moved one', function(){
  var st={recipes:[{id:'r1', title:'Chilli', base:4, portions:4, ingredients:[]}], plan:[]};
  var box=sandbox(st);
  var dates=box.planDates();
  box.addPlanEntry('r1', dates[0], 'dinner');
  box.addPlanEntry('r1', dates[3], 'dinner');
  assert.strictEqual(st.plan.length, 2, 'got '+st.plan.length+' meal(s)');
  assert.notStrictEqual(st.plan[0].id, st.plan[1].id, 'both meals share an id');
  assert.deepStrictEqual(st.plan.map(function(e){return e.date;}), [dates[0],dates[3]],
    'the two meals are not on the two days asked for');
});

t('each meal carries its own portions', function(){
  var st={recipes:[{id:'r1', title:'Chilli', base:4, portions:4, ingredients:[]}], plan:[]};
  var box=sandbox(st);
  var dates=box.planDates();
  var a=box.addPlanEntry('r1', dates[0], 'dinner');
  var b=box.addPlanEntry('r1', dates[3], 'dinner');
  a.portions=2; b.portions=1;
  assert.strictEqual(st.plan.filter(function(e){return e.portions===2;}).length, 1);
  assert.strictEqual(st.plan.filter(function(e){return e.portions===1;}).length, 1);
});

t('removing one meal leaves its twin', function(){
  var st={recipes:[{id:'r1', title:'Chilli', base:4, portions:4, ingredients:[]}], plan:[]};
  var box=sandbox(st);
  var dates=box.planDates();
  var a=box.addPlanEntry('r1', dates[0], 'dinner');
  box.addPlanEntry('r1', dates[3], 'dinner');
  assert.strictEqual(box.removePlanEntry(a.id), true, 'it did not report a removal');
  assert.strictEqual(st.plan.length, 1, 'left '+st.plan.length+' meal(s)');
  assert.notStrictEqual(st.plan[0].id, a.id, 'it removed the wrong one');
});

t('planning an unknown recipe is refused rather than left dangling', function(){
  var st={recipes:[], plan:[]};
  var box=sandbox(st);
  assert.strictEqual(box.addPlanEntry('nope', box.planDates()[0], 'dinner'), null);
  assert.strictEqual(st.plan.length, 0, 'a meal with no recipe was planned anyway');
});

console.log('\nSPENT MEALS DO NOT PILE UP');

t('a meal whose day has passed is dropped', function(){
  // Nothing renders a past meal, so left alone they accumulate for ever as
  // documents nobody can see or reach.
  var st={recipes:[{id:'r1', title:'Chilli', base:4, ingredients:[]}], plan:[]};
  var box=sandbox(st);
  var today=box.planDates()[0];
  var d=new Date(today+'T00:00:00'); d.setDate(d.getDate()-1);
  var yesterday=d.toISOString().slice(0,10);
  st.plan.push({id:'old', recipeId:'r1', date:yesterday, slot:'dinner', portions:1});
  st.plan.push({id:'now', recipeId:'r1', date:today, slot:'dinner', portions:1});
  assert.strictEqual(box.prunePlan(), true, 'it reported nothing to prune');
  assert.deepStrictEqual(st.plan.map(function(e){return e.id;}), ['now'],
    'left '+st.plan.map(function(e){return e.id;}).join(', '));
});

t('today is kept, so a meal is not lost on the day you eat it', function(){
  var st={recipes:[{id:'r1', title:'Chilli', base:4, ingredients:[]}], plan:[]};
  var box=sandbox(st);
  st.plan.push({id:'now', recipeId:'r1', date:box.planDates()[0], slot:'dinner', portions:1});
  assert.strictEqual(box.prunePlan(), false, 'it pruned something it should not have');
  assert.strictEqual(st.plan.length, 1, 'today was thrown away');
});

console.log('\nORDER AND LABELS');

t('a day reads breakfast, lunch, dinner whatever order it was planned in', function(){
  var st={recipes:[], plan:[]};
  var box=sandbox(st);
  var rows=[{id:'c', date:'2026-01-01', slot:'dinner'},
            {id:'a', date:'2026-01-01', slot:'breakfast'},
            {id:'b', date:'2026-01-01', slot:'lunch'}];
  rows.sort(box.planOrder);
  assert.deepStrictEqual(rows.map(function(e){return e.slot;}),
    ['breakfast','lunch','dinner'], 'slots came out in the wrong order');
});

t('the first two days read as Today and Tomorrow', function(){
  var st={recipes:[], plan:[]};
  var box=sandbox(st);
  var d=box.planDates();
  assert.strictEqual(box.dayLabel(d[0],0),'Today');
  assert.strictEqual(box.dayLabel(d[1],1),'Tomorrow');
  assert.ok(/^[A-Z][a-z]{2} \d{1,2}$/.test(box.dayLabel(d[2],2)),
    'the third day reads "'+box.dayLabel(d[2],2)+'"');
});

console.log(fails?'\nFAILING\n':'\nAll plan model checks pass.\n');
process.exit(fails?1:0);
