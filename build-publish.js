// Build exactly what the app's own fullDocument() writes on every save, so a
// publish from here and a save from inside the app produce the same document.
// index.html on disk carries the artifact runtime injected by the platform, so
// it is NOT the thing to publish; the App source and its CSS are.
// Usage: node build-publish.js [outfile] [--state live.json] [--src index.html]
// (--state=f and --src=f work too; an unknown flag stops the build)
// outfile defaults to FC_PUBLISH, else publish.html in the temp directory.
var fs=require('fs'), path=require('path'), env=require('./test-env.js');
// Strict, because a loose parse cost data: `--stat live.json` read as a flag to
// skip and an outfile, so the live export was overwritten with HTML and the
// stale repo seed shipped. Anything not understood stops the build unwritten.
function die(msg){ console.error('build-publish: '+msg+'\nusage: node build-publish.js [outfile] [--state live.json] [--src index.html]'); process.exit(2); }
var opt={}, out=null;
for(var ai=2;ai<process.argv.length;ai++){
  var a=process.argv[ai], fm=a.match(/^--(state|src)(?:=([\s\S]*))?$/);
  if(fm){
    var v=fm[2]!==undefined?fm[2]:process.argv[++ai];
    if(v===undefined||v===''||(fm[2]===undefined&&v.charAt(0)==='-')) die('--'+fm[1]+' needs a file');
    if(opt[fm[1]]!==undefined) die('--'+fm[1]+' given twice');
    opt[fm[1]]=v; continue;
  }
  if(a.charAt(0)==='-') die('unknown option '+a);
  if(out!==null) die('more than one outfile: '+out+' and '+a);
  out=a;
}
if(out===null) out=env.PUBLISH;
if(/\.json$/i.test(out)) die('refusing to write HTML to '+out+'; a .json outfile is almost certainly a state file');
['state','src'].forEach(function(k){
  if(opt[k]!==undefined&&path.resolve(out)===path.resolve(opt[k])) die('refusing to overwrite the --'+k+' file '+out);
});
// Strip a byte order mark, as in-app Import does, and name the file on failure.
function readText(f){
  try{ return fs.readFileSync(f,'utf8').replace(/^\ufeff/,''); }
  catch(e){ die('cannot read '+f+': '+e.message); }
}
var t=readText(opt.src!==undefined?opt.src:__dirname+'/index.html');
// The script is `(function App(DATA){...})(<seed>);`. seedAt finds the seed by
// structure, not by its first key, and reads it written either way: as text
// for JSON.parse, as the app now writes it, or as the JSON itself.
var at=env.seedAt(t), data=at.data;
var App=eval('('+t.slice(t.indexOf('(function App(DATA){')+1,at.app)+')');
if(typeof App!=='function') throw new Error('could not locate App in index.html');
// Publishing overwrites a live app holding real logged data, so the state that
// ships is the state read back off the artifact, never the repo's stale copy.
// --state <file> takes a JSON document pulled from the live artifact.
if(opt.state!==undefined){
  var live; try{ live=JSON.parse(readText(opt.state)); }catch(e){ die(opt.state+' is not valid JSON: '+e.message); }
  if(!live||typeof live!=='object') die(opt.state+' does not hold a state object');
  ['days','workoutLogs','saunaSessions','shoppingChecked','library','recipes'].forEach(function(k){
    if(live[k]===undefined) throw new Error('live state is missing '+k+', refusing to publish over it');
  });
  data=live;
}
// `_ings` is a cached parse of `ingredients`. Shipping it would freeze one
// version of the ingredient parser into the seed, which is exactly the bug
// that split chopped tomatoes across two shopping rows.
if(data.recipes) data.recipes=data.recipes.map(function(r){
  var o={}; Object.keys(r).forEach(function(k){ if(k!=='_ings'&&k!=='_ingsFor') o[k]=r[k]; });
  return o;
});
var src=App.toString();
// The same escaping the app applies when it saves itself, read out of App so
// the two cannot drift: user text holding a closing script tag or a comment
// opener must not end the inline script early.
function helper(name){
  var hm=src.match(new RegExp('function '+name+'\\(s\\)\\{[^\\n]*\\}'));
  if(!hm) throw new Error('could not locate '+name+' in App');
  return eval('('+hm[0]+')');
}
var scriptSafe=helper('scriptSafe'), codeSafe=helper('codeSafe'), seedSafe=helper('seedSafe');

var m=src.match(/var CSS = "([\s\S]*?)";\r?\n/);
if(!m) throw new Error('could not locate the CSS string');
var CSS=eval('"'+m[1]+'"');

// Two ways this has silently broken before: the CSS getting truncated, and a
// rule landing inside a media query because it was inserted before its closing
// brace. Both are invisible until someone looks at the page.
var open=0; for(var k=0;k<CSS.length;k++){ if(CSS[k]==='{') open++; else if(CSS[k]==='}') open--; }
if(open!==0) throw new Error('CSS braces unbalanced by '+open+' — the stylesheet is truncated or a block is unclosed');
['.chart{','.chart-head{','.rangebar{','.daystrip{','.stat-tile{'].forEach(function(sel){
  if(CSS.indexOf(sel)<0) throw new Error('CSS is missing '+sel);
});
// Every rule after the last media query must sit at the top level.
var mq=CSS.lastIndexOf('@media');
if(mq>-1){
  var depth=0, tail=-1;
  for(var k=mq;k<CSS.length;k++){ if(CSS[k]==='{') depth++; else if(CSS[k]==='}'){ depth--; if(!depth){ tail=k+1; break; } } }
  if(tail>-1 && CSS.slice(tail).indexOf('.chart{')<0 && CSS.slice(0,mq).indexOf('.chart{')<0)
    throw new Error('.chart is trapped inside a media query');
}

var doc='<!doctype html><html><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>Fight Card</title>'+
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">'+
  '</head><body><div id="app"></div>'+
  '<script>('+codeSafe(src)+')('+seedSafe(JSON.stringify(data))+');<\/script></body></html>';
fs.writeFileSync(out,doc);
console.log('built '+out+' — '+doc.length+' bytes, CSS '+CSS.length+', '+Object.keys(data.days||{}).length+' days, '+(data.workoutLogs||[]).length+' sessions');
