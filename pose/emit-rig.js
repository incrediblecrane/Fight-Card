// Regenerates the RIGFRAMES literal inside index.html from pose/exercises.js.
// The app used to carry a hand-pasted copy, which is how a rig could be fixed
// in pose/ and stay broken in the app. This is the one way it gets across.
// Usage: node pose/emit-rig.js [--check]
var fs=require('fs'), path=require('path');
var EX=require('./exercises.js');
// Fixed order so a regeneration is a no-op diff when nothing changed. `floor`
// is a check-suite hint and `name`/`real`/`changed`/`flag` are authoring notes,
// so none of them ship.
var KEYS=['tempo','frames','equip','axis','active','props','barAt','anchorAt','anchorFront','frontPlan','front'];
var out={};
EX.forEach(function(e){
  var o={};
  KEYS.forEach(function(k){ if(e[k]!==undefined && e[k]!==null) o[k]=e[k]; });
  out[e.id]=o;
});
/* A rig nothing can reach is a rig that ships and never draws. RIGMAP is the
   only route from an app exercise id to a rig, so a new rig that nobody added
   to it renders as the generic fallback pose instead: the exercise looks wired
   up in pose/ and is wrong in the app. That is how the sit-up wall throw got
   as far as a passing test suite drawing a squat. */
function checkReachable(html){
  var m=html.slice(html.indexOf('var RIGMAP='), html.indexOf('function rigFor'));
  var map=eval('('+m.replace('var RIGMAP=','').replace(/;\s*$/,'')+')');
  var used={}; Object.keys(map).forEach(function(k){ used[map[k]]=1; });
  return Object.keys(out).filter(function(id){ return !used[id]; });
}

var line='var RIGFRAMES='+JSON.stringify(out);
var file=path.join(__dirname,'..','index.html');
// An editor may have turned index.html to CRLF: compare without the CR and
// write back with the file's own ending, never a mix of the two.
var src=fs.readFileSync(file,'utf8'), EOL=/\r\n/.test(src)?'\r\n':'\n';
var lines=src.split(/\r?\n/);
var i=lines.findIndex(function(l){ return l.indexOf('var RIGFRAMES=')===0; });
if(i<0) throw new Error('index.html has no RIGFRAMES line');
var orphans=checkReachable(lines.join('\n'));
if(orphans.length){
  console.error('RIGMAP cannot reach: '+orphans.join(', ')+
    '\n  These rigs would render as the generic fallback pose in the app.'+
    '\n  Add them to RIGMAP in index.html (exercise id -> rig id).');
  process.exit(1);
}
var same=lines[i]===line;
if(process.argv.indexOf('--check')>-1){
  console.log(same?'RIGFRAMES in sync ('+EX.length+' rigs)':'RIGFRAMES DIFFERS from pose/exercises.js');
  process.exit(same?0:1);
}
if(same){ console.log('RIGFRAMES already in sync ('+EX.length+' rigs)'); process.exit(0); }
lines[i]=line;
fs.writeFileSync(file,lines.join(EOL));
console.log('rewrote RIGFRAMES in index.html ('+EX.length+' rigs)');
