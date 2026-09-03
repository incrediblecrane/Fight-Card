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
var line='var RIGFRAMES='+JSON.stringify(out);
var file=path.join(__dirname,'..','index.html');
var lines=fs.readFileSync(file,'utf8').split('\n');
var i=lines.findIndex(function(l){ return l.indexOf('var RIGFRAMES=')===0; });
if(i<0) throw new Error('index.html has no RIGFRAMES line');
var same=lines[i]===line;
if(process.argv.indexOf('--check')>-1){
  console.log(same?'RIGFRAMES in sync ('+EX.length+' rigs)':'RIGFRAMES DIFFERS from pose/exercises.js');
  process.exit(same?0:1);
}
if(same){ console.log('RIGFRAMES already in sync ('+EX.length+' rigs)'); process.exit(0); }
lines[i]=line;
fs.writeFileSync(file,lines.join('\n'));
console.log('rewrote RIGFRAMES in index.html ('+EX.length+' rigs)');
