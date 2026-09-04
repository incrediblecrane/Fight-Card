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
new Function(DB_LISTS+'\n'+grab('dbDocs')+'\n'+grab('dbApply')+'\nthis.dbDocs=dbDocs;this.dbApply=dbApply;').call(sandbox);

var seedRaw=h.slice(h.lastIndexOf(')({')+2, h.lastIndexOf(');</'+'script>'));
var cases=[['the repo seed', JSON.parse(seedRaw)]];
var live=__dirname+'/../live-state.json';
try{ cases.push(['live artifact state', JSON.parse(fs.readFileSync(process.env.FC_LIVE_STATE||live,'utf8'))]); }catch(e){}

var fails=0;
cases.forEach(function(pair){
  var name=pair[0], st=pair[1];
  var back=sandbox.dbApply(sandbox.dbDocs(st));
  function cmp(label,a,b){
    if(JSON.stringify(a)===JSON.stringify(b)){ console.log('  PASS  '+name+': '+label); return; }
    fails++;
    console.log('  FAIL  '+name+': '+label+'\n        was '+JSON.stringify(a).slice(0,160)+
                '\n        now '+JSON.stringify(b).slice(0,160));
  }
  cmp('every day survives', st.days, back.days);
  cmp('workout logs survive in order', st.workoutLogs, back.workoutLogs);
  cmp('sauna sessions survive in order', st.saunaSessions, back.saunaSessions);
  cmp('recipes survive', (st.recipes||[]).slice().sort(byId), (back.recipes||[]).slice().sort(byId));
  cmp('library survives', (st.library||[]).slice().sort(byId), (back.library||[]).slice().sort(byId));
  cmp('the shopping ticks survive', st.shoppingChecked||[], back.shoppingChecked);
  cmp('an in-flight session survives', st.activeSession||null, back.activeSession);
  cmp('xp survives', st.totalXp||0, back.totalXp);
  cmp('the water target survives', st.waterTarget||8, back.waterTarget);
  cmp('the ui position survives', [st.uiTab||'today',st.uiSlide||0,st.uiProgRange||14,!!st.uiViewingSession],
      [back.uiTab,back.uiSlide,back.uiProgRange,back.uiViewingSession]);

  // Nothing in state may be silently unmapped.
  var mapped={days:1,workoutLogs:1,saunaSessions:1,recipes:1,library:1,shoppingChecked:1,
              activeSession:1,totalXp:1,waterTarget:1,uiTab:1,uiSlide:1,uiProgRange:1,uiViewingSession:1};
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

console.log(fails?('\n'+fails+' FAILING'):'\nRound-trip is lossless.');
process.exit(fails?1:0);
