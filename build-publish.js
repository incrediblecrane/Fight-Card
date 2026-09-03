// Build exactly what the app's own fullDocument() writes on every save, so a
// publish from here and a save from inside the app produce the same document.
// index.html on disk carries the artifact runtime injected by the platform, so
// it is NOT the thing to publish; the App source and its CSS are.
// Usage: node build-publish.js [outfile]
var fs=require('fs');
var t=fs.readFileSync(__dirname+'/index.html','utf8');
var a=t.indexOf('<script>',t.indexOf('</style>'))+8, b=t.lastIndexOf('</script>');
var script=t.slice(a,b);
var i=script.indexOf('(function App(DATA){'), j=script.lastIndexOf(')({"waterTarget"');
if(i<0||j<0) throw new Error('could not locate the App IIFE in index.html');
var App=eval('('+script.slice(i+1,j)+')');
var data=JSON.parse(script.slice(j+2, script.lastIndexOf(');')));
// Publishing overwrites a live app holding real logged data, so the state that
// ships is the state read back off the artifact, never the repo's stale copy.
// --state <file> takes a JSON document pulled from the live artifact.
var si=process.argv.indexOf('--state');
if(si>-1){
  var live=JSON.parse(fs.readFileSync(process.argv[si+1],'utf8'));
  ['days','workoutLogs','saunaSessions','shoppingChecked','library','recipes'].forEach(function(k){
    if(live[k]===undefined) throw new Error('live state is missing '+k+', refusing to publish over it');
  });
  data=live;
}
var src=App.toString();

var m=src.match(/var CSS = "([\s\S]*?)";\n/);
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
  '<style>'+CSS+'</style></head><body><div id="app"></div>'+
  '<script>('+src+')('+JSON.stringify(data)+');<\/script></body></html>';
// First positional that is neither a flag nor a flag's value.
var out='/tmp/publish.html';
for(var ai=2;ai<process.argv.length;ai++){
  if(process.argv[ai]==='--state'){ ai++; continue; }
  if(process.argv[ai].charAt(0)==='-') continue;
  out=process.argv[ai]; break;
}
fs.writeFileSync(out,doc);
console.log('built '+out+' — '+doc.length+' bytes, CSS '+CSS.length+', '+Object.keys(data.days||{}).length+' days, '+(data.workoutLogs||[]).length+' sessions');
