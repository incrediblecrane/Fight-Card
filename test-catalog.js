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

console.log(fails?('\n'+fails+' FAILING\n'):'\nCatalogue is consistent.\n');
process.exit(fails?1:0);
