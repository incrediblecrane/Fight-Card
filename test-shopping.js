// The shopping list, run headlessly against the shipped source, over the exact
// recipes and portion counts that sent Andy back to the shop.
//
// A shopping list that is short is worse than no list: you trust it, you buy
// what it says, and you find out in the kitchen. So the arithmetic gets its own
// suite, separate from the browser checks, and it is checked against what you
// have to BUY, not against what the recipe needs.
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
  var m=h.match(new RegExp('var '+decl+'=[^\\n]*?;\\n'));
  if(!m) throw new Error('could not find var '+decl);
  return m[0];
}

var src=[grabVar('IMPLIED_ONE'), grabVar('UNIT_SCALE'), grabVar('COUNT_UNIT'), grabVar('SLOTS'),
  grab('parseIng'), grab('canonUnit'), grab('canonQty'), grab('unitRank'),
  grab('roundQty'), grab('buyQty'), grab('fmtQty'), grab('qtyText'), grab('scaledIng'),
  grab('recipeIngs'), grab('recipeBase'), grab('recipePortions'),
  grab('slotRank'), grab('planOrder'), grab('pad'), grab('dateKey'), grab('planDates'),
  grab('planEntries'), grab('planRecipe'), grab('planPortions'),
  grab('shoppingList')].join('\n');

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

function sandbox(st){
  var box={};
  new Function('state', src+'\nthis.shoppingList=shoppingList;this.planDates=planDates;'+
    'this.parseIng=parseIng;this.qtyText=qtyText;this.scaledIng=scaledIng;this.canonUnit=canonUnit;this.canonQty=canonQty;').call(box, st);
  return box;
}

// The two meal-prep recipes exactly as they sit in the live store, portions and
// all: both set to 4 of a 5-portion batch, which is what made the totals land
// on fractions in the first place.
function liveRecipes(){
  return [
    {id:'p1', title:'Chicken & chorizo one-pan rice', base:5, portions:4, prep:true,
     ingredients:['Chicken thighs, boneless (900g)','Chorizo (150g)','Long-grain rice (400g)',
       'Chicken stock (900ml)','Peppers (3)','Onion (2)','Garlic (4 cloves)',
       'Smoked paprika (2 tsp)','Chopped tomatoes (1 tin)','Olive oil']},
    {id:'p3', title:'Turkey bolognese', base:5, portions:4, prep:true,
     ingredients:['Turkey mince (750g)','Chopped tomatoes (2 tins)','Tomato puree (2 tbsp)',
       'Onion (2)','Carrot (2)','Celery (2 sticks)','Garlic (4 cloves)',
       'Beef or chicken stock (300ml)','Mixed herbs (2 tsp)','Olive oil']}];
}
function planned(recipes, portionsById){
  var st={recipes:recipes, plan:[], shopExtras:[]};
  var box=sandbox(st);
  var days=box.planDates();
  recipes.forEach(function(r,i){
    st.plan.push({id:'pl'+i, recipeId:r.id, date:days[0], slot:'dinner',
                  portions:(portionsById||{})[r.id]||r.portions||r.base});
  });
  return {state:st, box:box};
}
function labelFor(list,name){
  var hit=list.filter(function(o){ return o.label.toLowerCase().indexOf(name.toLowerCase())===0; })[0];
  return hit?hit.label:null;
}
function countIn(label){
  var m=String(label).match(/\(([\d.]+)/);
  return m?+m[1]:null;
}

console.log('\nTHE TRIP BACK TO THE SHOP');

t('the two meal preps put every ingredient on exactly one row', function(){
  var s=planned(liveRecipes());
  var list=s.box.shoppingList();
  var names={};
  list.forEach(function(o){ var n=o.label.split(' (')[0].toLowerCase(); names[n]=(names[n]||0)+1; });
  var dupes=Object.keys(names).filter(function(k){ return names[k]>1; });
  assert.deepStrictEqual(dupes, [], 'split across rows: '+dupes.join(', '));
});

t('you are told to buy enough tins, not 2.4 rounded down to 2', function(){
  // 1 tin at 0.8 of a batch plus 2 tins at 0.8 = 2.4 tins. You cannot buy
  // 0.4 of a tin, so anything less than 3 sends you back to the shop.
  var s=planned(liveRecipes());
  var label=labelFor(s.box.shoppingList(),'Chopped tomatoes');
  assert.ok(label,'chopped tomatoes are not on the list at all');
  assert.ok(countIn(label)>=3, 'the list says '+label+', and 2.4 tins are needed');
});

t('and enough onions', function(){
  // 2 at 0.8 plus 2 at 0.8 = 3.2 onions.
  var s=planned(liveRecipes());
  var label=labelFor(s.box.shoppingList(),'Onion');
  assert.ok(label,'onions are not on the list at all');
  assert.ok(countIn(label)>=4, 'the list says '+label+', and 3.2 onions are needed');
});

t('nothing countable is ever rounded down below what the recipes need', function(){
  // The general rule, not just these two. Sweep the portion counts and check
  // every countable row buys at least what the meals actually consume.
  var bad=[];
  [1,2,3,4,5,6,7].forEach(function(n){
    var recipes=liveRecipes();
    var s=planned(recipes,{p1:n,p3:n});
    s.box.shoppingList().forEach(function(row){
      var m=row.label.match(/^(.*?) \(([\d.]+)(?:\s*)(tin|tins|clove|cloves|head|heads|slice|slices|stick|sticks)?\)?/);
      if(!m) return;
      var shown=+m[2], unit=m[3]||'';
      // Only the countable rows: grams and millilitres can be fractional.
      if(!/^$|tin|clove|head|slice|stick/.test(unit)) return;
      // What the meals actually need, summed straight from the source.
      var need=0;
      recipes.forEach(function(r){
        var f=n/r.base;
        r.ingredients.forEach(function(txt){
          var g=s.box.parseIng(txt);
          if(g.q===null) return;
          if(g.n.toLowerCase()!==m[1].toLowerCase()) return;
          if(/^(g|kg|ml|l|tbsp|tsp)$/.test(g.u)) return;
          need+=g.q*f;
        });
      });
      if(need>0 && shown<need-0.001)
        bad.push(n+' portions: '+m[1]+' shows '+shown+' but '+Math.round(need*100)/100+' are needed');
    });
  });
  assert.deepStrictEqual(bad.slice(0,6), [], bad.length+' short rows, first few:\n        '+bad.slice(0,6).join('\n        '));
});

t('scaling a recipe DOWN still moves its countable lines', function(){
  // The shopping round-up must not leak into the recipe card: if it does,
  // every countable line reads the same at 1 portion as at 4 and the portion
  // stepper looks dead.
  var box=sandbox({recipes:[], plan:[], shopExtras:[]});
  var tin=box.parseIng('Chopped tomatoes (2 tins)');
  var full=box.scaledIng(tin,1), quarter=box.scaledIng(tin,0.25);
  assert.notStrictEqual(full, quarter,
    'a quarter batch reads the same as a full one: '+full+' vs '+quarter);
  assert.ok(/0.5 tin\b/.test(quarter),'a quarter of 2 tins reads "'+quarter+'"');
});

t('a scaled-down line never reads "1 tins"', function(){
  var box=sandbox({recipes:[], plan:[], shopExtras:[]});
  ['Chopped tomatoes (2 tins)','Garlic (4 cloves)','Celery (2 sticks)'].forEach(function(txt){
    var g=box.parseIng(txt);
    var one=box.qtyText(1,g.u), many=box.qtyText(3,g.u);
    assert.ok(!/s$/.test(one.replace(/^[\d.]+\s*/,'')), 'one reads "'+one+'"');
    assert.ok(/s$/.test(many), 'three reads "'+many+'"');
  });
});

console.log('\nADDING UP ACROSS MEALS');

t('the same ingredient in two different meals is summed, not replaced', function(){
  var s=planned(liveRecipes(),{p1:5,p3:5});
  var label=labelFor(s.box.shoppingList(),'Chopped tomatoes');
  assert.strictEqual(countIn(label), 3, 'at full batches 1 tin + 2 tins should be 3: got '+label);
});

t('the same meal planned twice buys for both', function(){
  var recipes=liveRecipes();
  var st={recipes:recipes, plan:[], shopExtras:[]};
  var box=sandbox(st);
  var days=box.planDates();
  st.plan.push({id:'a', recipeId:'p3', date:days[0], slot:'dinner', portions:5});
  st.plan.push({id:'b', recipeId:'p3', date:days[2], slot:'dinner', portions:5});
  var label=labelFor(box.shoppingList(),'Chopped tomatoes');
  assert.strictEqual(countIn(label), 4, 'two full batches of 2 tins should be 4: got '+label);
});

t('a meal at half portions still buys whole tins', function(){
  var recipes=liveRecipes();
  var st={recipes:recipes, plan:[], shopExtras:[]};
  var box=sandbox(st);
  st.plan.push({id:'a', recipeId:'p3', date:box.planDates()[0], slot:'dinner', portions:1});
  var label=labelFor(box.shoppingList(),'Chopped tomatoes');
  // One portion of five needs 0.4 of a tin. You still buy one.
  assert.strictEqual(countIn(label), 1, 'got '+label);
});

t('weights and volumes are still allowed to be fractional', function(){
  // Rounding a tin up is right; rounding 750g up to a kilo is not.
  var recipes=liveRecipes();
  var st={recipes:recipes, plan:[], shopExtras:[]};
  var box=sandbox(st);
  st.plan.push({id:'a', recipeId:'p3', date:box.planDates()[0], slot:'dinner', portions:4});
  var label=labelFor(box.shoppingList(),'Turkey mince');
  assert.ok(/600g/.test(label), '750g at 0.8 of a batch should read 600g: got '+label);
});

t('spoons stay in halves rather than jumping to the next whole spoon', function(){
  var recipes=liveRecipes();
  var st={recipes:recipes, plan:[], shopExtras:[]};
  var box=sandbox(st);
  st.plan.push({id:'a', recipeId:'p3', date:box.planDates()[0], slot:'dinner', portions:4});
  var label=labelFor(box.shoppingList(),'Tomato puree');
  assert.ok(/1.5 tbsp/.test(label), '2 tbsp at 0.8 should read 1.5 tbsp: got '+label);
});

console.log('\nEVERY RECIPE, NOT JUST THESE TWO');

// The real seed, so this is swept over the recipes that actually ship.
var SEED=require('./test-env.js').seedOf(h);
var ALL=SEED.recipes.filter(function(r){ return (r.ingredients||[]).length; });

// What a set of planned meals genuinely consumes, computed straight from the
// source text rather than from anything the shopping list does.
function needed(meals){
  var box=sandbox({recipes:ALL, plan:[], shopExtras:[]});
  var want={};
  meals.forEach(function(m){
    var r=ALL.filter(function(x){return x.id===m.recipeId;})[0];
    var f=m.portions/(r.base||1);
    (r.ingredients||[]).forEach(function(txt){
      var g=box.parseIng(txt);
      if(g.q===null) return;
      if(/^(g|kg|ml|l|tbsp|tsp)$/.test(g.u)) return;   // measured, may be fractional
      var key=g.n.toLowerCase()+'|'+g.u.replace(/s$/,'');
      want[key]=(want[key]||0)+g.q*f;
    });
  });
  return want;
}
function listed(meals){
  var st={recipes:ALL, plan:[], shopExtras:[]};
  var box=sandbox(st);
  var days=box.planDates();
  meals.forEach(function(m,i){
    st.plan.push({id:'m'+i, recipeId:m.recipeId, date:days[i%7], slot:'dinner', portions:m.portions});
  });
  var out={};
  box.shoppingList().forEach(function(row){
    var m=row.label.match(/^(.*?) \(([\d.]+)\s*([a-z]*)\)$/i);
    if(!m) return;
    out[m[1].toLowerCase()+'|'+(m[3]||'').replace(/s$/,'')]=+m[2];
  });
  return out;
}
function shortfalls(meals){
  var want=needed(meals), got=listed(meals), bad=[];
  Object.keys(want).forEach(function(k){
    if(want[k]<=0) return;
    var have=got[k];
    if(have===undefined) return;   // not a countable row in the output
    if(have < want[k]-0.001) bad.push(k+': list says '+have+', meals need '+(Math.round(want[k]*100)/100));
  });
  return bad;
}

t('no single recipe is ever short, at any portion count', function(){
  var bad=[];
  ALL.forEach(function(r){
    for(var n=1;n<=8;n++){
      shortfalls([{recipeId:r.id, portions:n}]).forEach(function(x){
        bad.push(r.title+' x'+n+' -- '+x);
      });
    }
  });
  assert.deepStrictEqual(bad.slice(0,8), [], bad.length+' short rows, first few:\n        '+bad.slice(0,8).join('\n        '));
});

t('no pair of recipes is ever short, at any portion count', function(){
  // Every pair, because adding up across two meals is exactly where the
  // fractions appear and exactly what sent Andy back to the shop.
  var bad=[], pairs=0;
  for(var a=0;a<ALL.length;a++){
    for(var b=a+1;b<ALL.length;b++){
      [[3,3],[4,4],[4,5],[2,7],[5,5],[1,1]].forEach(function(pc){
        pairs++;
        shortfalls([{recipeId:ALL[a].id,portions:pc[0]},{recipeId:ALL[b].id,portions:pc[1]}])
          .forEach(function(x){ bad.push(ALL[a].title+' + '+ALL[b].title+' ('+pc.join('/')+') -- '+x); });
      });
    }
  }
  assert.ok(pairs>1000,'only '+pairs+' combinations swept');
  assert.deepStrictEqual(bad.slice(0,8), [], bad.length+' short rows across '+pairs+' combinations, first few:\n        '+bad.slice(0,8).join('\n        '));
});

t('the whole week at once is not short either', function(){
  var meals=ALL.map(function(r,i){ return {recipeId:r.id, portions:1+(i%5)}; });
  var bad=shortfalls(meals);
  assert.deepStrictEqual(bad.slice(0,8), [], bad.length+' short rows with everything planned:\n        '+bad.slice(0,8).join('\n        '));
});

t('a counting noun stays on the row, so celery is sticks and not heads', function(){
  var st={recipes:ALL, plan:[], shopExtras:[]};
  var box=sandbox(st);
  st.plan.push({id:'a', recipeId:'p3', date:box.planDates()[0], slot:'dinner', portions:5});
  var label=labelFor(box.shoppingList(),'Celery');
  assert.ok(/stick/.test(label), 'the row reads "'+label+'", which is heads of celery');
});

console.log('\nREADING WHAT PEOPLE TYPE');

// The add-recipe box says "Name (quantity unit)", so anything a person might
// type there has to come back out meaning the same thing.
function pi(txt){ var g=sandbox({recipes:[], plan:[], shopExtras:[]}).parseIng(txt);
  return {q:g.q, qMax:g.qMax, u:g.u, d:g.d, size:g.size, pre:g.pre}; }
function sc(txt,f){ var b=sandbox({recipes:[], plan:[], shopExtras:[]}); return b.scaledIng(b.parseIng(txt),f); }

t('a unit is a whole word, so "large" is not litres and "grams" is grams', function(){
  var g=pi('Spinach (2 large handfuls)');
  assert.deepStrictEqual([g.q,g.u,g.d],[2,'large handfuls',''], JSON.stringify(g));
  g=pi('Onion (1 large)'); assert.deepStrictEqual([g.u,g.d],['','large'], JSON.stringify(g));
  g=pi('Chillies (2 green)'); assert.deepStrictEqual([g.u,g.d],['','green'], JSON.stringify(g));
  g=pi('Garlic (3 garlic cloves)'); assert.deepStrictEqual([g.u,g.d],['','garlic cloves'], JSON.stringify(g));
  g=pi('Milk (1 litre)'); assert.deepStrictEqual([g.q,g.u,g.d],[1,'l',''], JSON.stringify(g));
  g=pi('Flour (200 grams)'); assert.deepStrictEqual([g.q,g.u,g.d],[200,'g',''], JSON.stringify(g));
  g=pi('Rice (400g)'); assert.deepStrictEqual([g.q,g.u,g.d],[400,'g',''], JSON.stringify(g));
});

t('a range keeps both ends on the card and buys the top end', function(){
  var g=pi('Sausages (4-6)'); assert.deepStrictEqual([g.q,g.qMax],[4,6], JSON.stringify(g));
  assert.strictEqual(sc('Sausages (4-6)',1),'Sausages (4-6)');
  assert.strictEqual(sc('Sausages (4-6)',2),'Sausages (8-12)');
  assert.strictEqual(sc('Bread (2-3 slices)',1),'Bread (2-3 slices)');
  assert.strictEqual(sc('Bread (2-3 slices)',0.5),'Bread (1-2 slices)');
  assert.strictEqual(sc('Parsley (1-2 bunches)',0.5),'Parsley (0.5-1 bunch)');
  assert.strictEqual(sc('Chicken breast (2-3, sliced)',1),'Chicken breast (2-3, sliced)');
  var st={recipes:[{id:'a',title:'A',base:2,ingredients:['Sausages (4-6)']}], plan:[], shopExtras:[]};
  var box=sandbox(st);
  st.plan.push({id:'x', recipeId:'a', date:box.planDates()[0], slot:'dinner', portions:2});
  assert.strictEqual(labelFor(box.shoppingList(),'Sausages'),'Sausages (6)');
});

t('mixed and unicode fractions are read as numbers', function(){
  var g=pi('Beans (1 1/2 tins)'); assert.deepStrictEqual([g.q,g.u,g.d],[1.5,'tins',''], JSON.stringify(g));
  g=pi('Eggs (½)'); assert.strictEqual(g.q,0.5, JSON.stringify(g));
  g=pi('Butter (1½ tbsp)'); assert.deepStrictEqual([g.q,g.u],[1.5,'tbsp'], JSON.stringify(g));
  g=pi('Avocado (1/2)'); assert.strictEqual(g.q,0.5, JSON.stringify(g));
  assert.strictEqual(sc('Beans (1 1/2 tins)',2),'Beans (3 tins)');
});

t('a bunch is a unit, and more than one is bunches', function(){
  var box=sandbox({recipes:[], plan:[], shopExtras:[]});
  assert.strictEqual(box.qtyText(2,'bunch'),'2 bunches');
  assert.strictEqual(box.qtyText(2,'bunch',true),'2 bunches');
  assert.strictEqual(box.qtyText(1,'bunches'),'1 bunch');
  var g=pi('Coriander (2 bunches)'); assert.deepStrictEqual([g.q,g.u,g.d],[2,'bunches',''], JSON.stringify(g));
  g=pi('Parsley (bunch)'); assert.deepStrictEqual([g.q,g.u],[1,'bunch'], JSON.stringify(g));
  var st={recipes:[{id:'a',title:'A',base:1,ingredients:['Coriander (1 bunch)']},
                   {id:'b',title:'B',base:1,ingredients:['Coriander (2 bunches)']}], plan:[], shopExtras:[]};
  box=sandbox(st);
  st.plan.push({id:'x', recipeId:'a', date:box.planDates()[0], slot:'dinner', portions:1});
  st.plan.push({id:'y', recipeId:'b', date:box.planDates()[0], slot:'dinner', portions:1});
  assert.strictEqual(labelFor(box.shoppingList(),'Coriander'),'Coriander (3 bunches)');
});

t('a small amount never rounds to nothing', function(){
  var box=sandbox({recipes:[], plan:[], shopExtras:[]});
  assert.strictEqual(box.qtyText(0.125,'tsp'),'0.5 tsp');
  assert.strictEqual(box.qtyText(0.2,'tbsp',true),'0.5 tbsp');
  assert.strictEqual(box.qtyText(0.04,'g',true),'0.1g');
  assert.strictEqual(box.qtyText(0.04,'ml'),'0.1ml');
});

t('Egg and Eggs are one row on the list, named as first written', function(){
  var st={recipes:ALL, plan:[], shopExtras:[]};
  var box=sandbox(st), d=box.planDates()[0];
  st.plan.push({id:'a', recipeId:'r13', date:d, slot:'breakfast', portions:2});
  st.plan.push({id:'b', recipeId:'p8', date:d, slot:'dinner', portions:6});
  var rows=box.shoppingList().filter(function(o){ return /^eggs?\b/i.test(o.label); });
  assert.strictEqual(rows.length,1, rows.map(function(o){return o.label;}).join(' / '));
  assert.strictEqual(rows[0].label,'Egg (14)');
  var pep=box.shoppingList().filter(function(o){ return /^peppers?\b/i.test(o.label); });
  assert.strictEqual(pep.length,1, pep.map(function(o){return o.label;}).join(' / '));
  // Different things that only look alike stay apart.
  st.recipes=[{id:'x',title:'X',base:1,ingredients:['Glass noodles (100g)','Hummus (2 tbsp)']}];
  st.plan=[{id:'c', recipeId:'x', date:d, slot:'dinner', portions:1}];
  assert.deepStrictEqual(box.shoppingList().map(function(o){return o.label;}),['Glass noodles (100g)','Hummus (2 tbsp)']);
});

// A long line full of "(" or spaces froze the page on every load: the
// patterns backtracked over all of it, about 2s for 40k characters.
t('a long ingredient line is read in linear time', function(){
  var box=sandbox({recipes:[], plan:[], shopExtras:[]});
  ['x'+'('.repeat(40000), 'x ('+'('.repeat(40000)+')', 'x (1'+' '.repeat(40000)+'a)', 'x (½'+' '.repeat(40000)+'a)',
   'x'+' ('.repeat(20000)+')', 'x (1'+' '.repeat(40000)+'-a)', 'x (1a'+' '.repeat(40000)+'-2)',
   'x (1'+' '.repeat(40000)+'large'+' '.repeat(40000)+'h)', 'x (2 x 4'+' '.repeat(40000)+'g)', 'x ('+'a,1'.repeat(15000)+')'].forEach(function(txt,i){
    var t0=Date.now(); box.parseIng(txt); var ms=Date.now()-t0;
    assert.ok(ms<50,'line '+i+' took '+ms+'ms');
  });
});
// The bracket is found by index now, so it has to be the same one the old
// pattern took, and the fractions read the same, on every short line.
t('the bracket and fractions are read as the old patterns read them', function(){
  var box=sandbox({recipes:[], plan:[], shopExtras:[]}), A='ab1 ()½¼,', seed=7;
  function rnd(n){ seed=(seed*1103515245+12345)%2147483648; return seed%n; }
  function old(text){
    var raw=String(text||'').trim(), m=raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if(!m) return [raw,null];
    return [m[1].trim(), m[2].trim().replace(/(\d)?\s*([½¼¾⅓⅔⅛])/g,function(x,d,c){
      return (d?d+' ':'')+{'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8'}[c]; })];
  }
  for(var k=0;k<20000;k++){
    var txt='', n=rnd(14); for(var q=0;q<n;q++) txt+=A.charAt(rnd(A.length));
    var g=box.parseIng(txt), want=old(txt);
    assert.strictEqual(g.n,want[0],'name of '+JSON.stringify(txt));
    if(want[1]===null) assert.strictEqual(g.q,null,'quantity of '+JSON.stringify(txt));
    // What is left of the bracket once the amount is read, or all of it.
    else if(g.q===null && g.u==='') assert.strictEqual(g.d===undefined?'':g.d,want[1]===''?'':want[1],'inside of '+JSON.stringify(txt));
  }
});

console.log('\nREADING QUANTITIES AND UNITS');

// One meal of one recipe, so a list row can be read for a single line.
function listOf(lines,portions,base){
  var st={recipes:[{id:'a',title:'A',base:base||1,ingredients:lines}], plan:[], shopExtras:[]};
  var box=sandbox(st);
  st.plan.push({id:'x', recipeId:'a', date:box.planDates()[0], slot:'dinner', portions:portions||1});
  return box.shoppingList().map(function(o){ return o.label; });
}

t('"1-1/2 tsp" is one and a half, not a range down to a half', function(){
  var g=pi('Sugar (1-1/2 tsp)'); assert.deepStrictEqual([g.q,g.qMax,g.u],[1.5,undefined,'tsp'], JSON.stringify(g));
  g=pi('Sugar (1-½ tsp)'); assert.deepStrictEqual([g.q,g.qMax,g.u],[1.5,undefined,'tsp'], JSON.stringify(g));
  assert.deepStrictEqual(listOf(['Sugar (1-1/2 tsp)'],2),['Sugar (3 tsp)']);
  // A top end that is not above the bottom is not a range.
  g=pi('Eggs (3-2)'); assert.strictEqual(g.qMax,undefined, JSON.stringify(g));
  g=pi('Eggs (2-2)'); assert.strictEqual(g.qMax,undefined, JSON.stringify(g));
  g=pi('Eggs (1/2-3/4)'); assert.deepStrictEqual([g.q,g.qMax],[0.5,0.75], JSON.stringify(g));
});

t('a range written with a dash, "to", or a unit at each end still scales', function(){
  assert.strictEqual(sc('Eggs (2–3)',2),'Eggs (4-6)');
  assert.strictEqual(sc('Eggs (2 — 3)',2),'Eggs (4-6)');
  assert.strictEqual(sc('Eggs (2 to 3)',2),'Eggs (4-6)');
  assert.deepStrictEqual(listOf(['Eggs (2–3)'],2),['Eggs (6)']);
  assert.deepStrictEqual(listOf(['Eggs (2 to 3)'],2),['Eggs (6)']);
  var g=pi('Chicken (500g-1kg)'); assert.deepStrictEqual([g.q,g.qMax,g.u],[0.5,1,'kg'], JSON.stringify(g));
  assert.deepStrictEqual(listOf(['Chicken (500g-1kg)'],2),['Chicken (2kg)']);
  assert.strictEqual(sc('Chicken (500g-1kg)',2),'Chicken (1-2kg)');
  g=pi('Oil (1 tbsp - 2 tbsp)'); assert.deepStrictEqual([g.q,g.qMax,g.u],[1,2,'tbsp'], JSON.stringify(g));
  // Units that do not convert are not a range: nothing is invented.
  g=pi('Rice (1 tin-200g)'); assert.strictEqual(g.qMax,undefined, JSON.stringify(g));
  // "to serve" is an instruction, not a range.
  g=pi('Lime (1, to serve)'); assert.deepStrictEqual([g.q,g.qMax,g.d],[1,undefined,'to serve'], JSON.stringify(g));
});

t('"about", "~", "approx" and "roughly" do not hide the amount', function(){
  ['~','about ','approx ','approx. ','roughly '].forEach(function(w){
    var g=pi('Rice ('+w+'200g)'); assert.deepStrictEqual([g.q,g.u],[200,'g'], w+': '+JSON.stringify(g));
    assert.deepStrictEqual(listOf(['Rice ('+w+'200g)'],2),['Rice (400g)'], w);
    assert.ok(/400g/.test(sc('Rice ('+w+'200g)',2)) && sc('Rice ('+w+'200g)',2).indexOf(w.trim())>-1, sc('Rice ('+w+'200g)',2));
  });
});

t('a plural abbreviation is the unit, not a count', function(){
  var g=pi('Chicken (1.5 kgs)'); assert.deepStrictEqual([g.q,g.u],[1.5,'kg'], JSON.stringify(g));
  [['Flour (200 gs)','g'],['Flour (200 gms)','g'],['Flour (200 grms)','g'],['Milk (300 mls)','ml'],
   ['Milk (2 ls)','l'],['Oil (2 tbsps)','tbsp'],['Salt (2 tsps)','tsp']].forEach(function(c){
    assert.strictEqual(pi(c[0]).u,c[1],c[0]+' '+JSON.stringify(pi(c[0])));
  });
  assert.deepStrictEqual(listOf(['Chicken (1.5 kgs)','Chicken (500g)'],2),['Chicken (4kg)']);
});

t('"1 large handful" is read back as the unit it is', function(){
  var g=pi('Spinach (1 large handful)'); assert.deepStrictEqual([g.q,g.u,g.d],[1,'large handful',''], JSON.stringify(g));
  g=pi('Spinach (2 Small  Handfuls)'); assert.deepStrictEqual([g.q,g.u],[2,'small handfuls'], JSON.stringify(g));
  assert.deepStrictEqual(listOf(['Spinach (1 large handful)','Spinach (large handful)']),['Spinach (2 large handfuls)']);
  assert.deepStrictEqual(listOf(['Spinach (2 large handfuls)','Spinach (handful)']),['Spinach (1 handful + 2 large handfuls)']);
  assert.strictEqual(sc('Spinach (2 large handfuls)',3),'Spinach (6 large handfuls)');
});

t('"2 x 400g tins" keeps its unit and its size', function(){
  var g=pi('Chopped tomatoes (2 x 400g tins)'); assert.deepStrictEqual([g.q,g.u,g.size],[2,'tins','400g'], JSON.stringify(g));
  g=pi('Chopped tomatoes (2×400g tins)'); assert.deepStrictEqual([g.q,g.u,g.size],[2,'tins','400g'], JSON.stringify(g));
  assert.deepStrictEqual(listOf(['Chopped tomatoes (2 x 400g tins)','Chopped tomatoes (tin)']),['Chopped tomatoes (3 tins)']);
  assert.strictEqual(sc('Chopped tomatoes (2 x 400g tins)',2),'Chopped tomatoes (4 x 400g tins)');
  assert.strictEqual(sc('Chopped tomatoes (2 x 400g tins)',0.5),'Chopped tomatoes (1 x 400g tin)');
});

t('a comma decimal is a decimal, and a typed amount is not garbled on the card', function(){
  var g=pi('Milk (1,5 l)'); assert.deepStrictEqual([g.q,g.u],[1.5,'l'], JSON.stringify(g));
  g=pi('Flour (0,25 kg)'); assert.deepStrictEqual([g.q,g.u],[0.25,'kg'], JSON.stringify(g));
  // A thousands separator is refused, as the number boxes refuse it.
  assert.notStrictEqual(pi('Water (1,000ml)').q,1, JSON.stringify(pi('Water (1,000ml)')));
  assert.notStrictEqual(pi('Water (1,000ml)').q,1.0, JSON.stringify(pi('Water (1,000ml)')));
  assert.strictEqual(sc('Rice (1 1/2 mugs)',1),'Rice (1 1/2 mugs)');
  assert.strictEqual(sc('Rice (1 1/2 mugs)',2),'Rice (3 mugs)');
  assert.strictEqual(sc('Rice (1 1/2 mugs)',3),'Rice (4.5 mugs)');
  assert.strictEqual(sc('Ginger (2cm piece)',1),'Ginger (2cm piece)');
  assert.strictEqual(sc('Ginger (2cm piece)',2),'Ginger (4cm piece)');
  assert.strictEqual(sc('Onion (1 large)',2),'Onion (2 large)');
  assert.strictEqual(sc('Eggs (3, beaten)',2),'Eggs (6, beaten)');
  assert.strictEqual(sc('Tomatoes (2 tins, drained)',2),'Tomatoes (4 tins, drained)');
  // Under a kilo is written in grams, not rounded to a tenth of a kilo.
  assert.strictEqual(sc('Sweet potato (1.2kg)',0.2),'Sweet potato (240g)');
  assert.strictEqual(sc('Milk (1.5l)',0.5),'Milk (750ml)');
});

// Every line the app ships, scaled, has to read back as the amount it shows,
// or a card copied into a new recipe quietly changes the recipe.
t('every seed ingredient, scaled, reads back as the same amount and unit', function(){
  var box=sandbox({recipes:[], plan:[], shopExtras:[]}), bad=[], n=0;
  var extra=['Sugar (1-1/2 tsp)','Eggs (2–3)','Chicken (500g-1kg)','Chicken (1.5 kgs)','Spinach (1 large handful)',
    'Chopped tomatoes (2 x 400g tins)','Milk (1,5 l)','Rice (1 1/2 mugs)','Ginger (2cm piece)','Rice (about 200g)'];
  var lines=[]; SEED.recipes.forEach(function(r){ lines=lines.concat(r.ingredients||[]); });
  lines.concat(extra).forEach(function(txt){
    var p=box.parseIng(txt); if(p.q===null) return;
    [0.2,0.5,1,1.5,2,3,4.4,7].forEach(function(f){
      n++;
      var out=box.scaledIng(p,f), b=box.parseIng(out), say=txt+' x'+f+' -> '+out+' -> ';
      if(b.n!==p.n || b.q===null || box.canonUnit(b.u)!==box.canonUnit(p.u)) return bad.push(say+JSON.stringify(b));
      [[b.qMax||b.q,(p.qMax||p.q)*f],[b.q,p.q*f]].forEach(function(x){
        var got=box.canonQty(x[0],b.u), exp=box.canonQty(x[1],p.u);
        // What the card can show: a tenth of a gram, a tenth of a kilo, half a spoon or count.
        var tol=/^(g|ml)$/.test(box.canonUnit(p.u))?(exp>=950?50:0.051):/^(tbsp|tsp)$/.test(p.u)?0.25:0.5;
        // and never less than the smallest amount it shows, so a pinch is not "0 tsp".
        var least=/^(g|ml)$/.test(box.canonUnit(p.u))?0.1:0.5;
        if(Math.abs(got-Math.max(exp,least))>tol+1e-9) bad.push(say+'reads '+got+', wants '+exp);
      });
      if((b.size||'')!==(p.size||'') || (b.d||'')!==(p.d||'') || (b.pre||'')!==(p.pre||'')) bad.push(say+JSON.stringify(b));
    });
  });
  assert.ok(n>300,'only '+n+' lines swept');
  assert.deepStrictEqual(bad.slice(0,8),[], bad.length+' lines do not read back, first few:\n        '+bad.slice(0,8).join('\n        '));
});

console.log(fails?('\n'+fails+' FAILING\n'):'\nAll shopping checks pass.\n');
process.exit(fails?1:0);
