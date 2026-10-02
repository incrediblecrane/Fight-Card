// What every suite needs from the machine it runs on, in one place so no suite
// hard-codes this checkout's path, the temp directory, or one browser build.
// FC_PUBLISH  where build-publish.js writes the document and the suites read it
// FC_CHROMIUM a Chromium binary to launch instead of Playwright's own
var fs=require('fs'), os=require('os'), path=require('path');
var PUBLISH=process.env.FC_PUBLISH||path.join(os.tmpdir(),'publish.html');
// The sandbox this was written in ships a Chromium Playwright did not install
// itself. Use it when it is there, otherwise Playwright's default.
var KNOWN_CHROMIUM='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
function readDoc(){ return fs.readFileSync(PUBLISH,'utf8'); }
function launch(opts){
  var chromium=require('playwright').chromium, o={};
  Object.keys(opts||{}).forEach(function(k){ o[k]=opts[k]; });
  var exe=process.env.FC_CHROMIUM||(fs.existsSync(KNOWN_CHROMIUM)?KNOWN_CHROMIUM:null);
  if(exe && !o.executablePath) o.executablePath=exe;
  return chromium.launch(o);
}
// The script is `(function App(DATA){...})(<seed>);` and the seed is
// `JSON.parse("<the state as JSON>")`, or, in a document written before the
// state went in as text, the JSON itself. Found by structure: the first `)(`
// after App starts whose remainder reads as a seed. Code never does, and a
// `)(` inside the seed's own strings comes after the real one.
// Answers {app, at, end, data}: App's source ends at app, the seed is at..end.
function seedAt(doc){
  var i=doc.indexOf('(function App(DATA){'), end=doc.lastIndexOf(');',doc.lastIndexOf('</'+'script>'));
  if(i<0||end<0) throw new Error('could not locate the App IIFE');
  for(var j=doc.indexOf(')(',i); j>-1 && j<end; j=doc.indexOf(')(',j+1)){
    var s=doc.slice(j+2,end), data;
    try{ data=s.slice(0,11)==='JSON.parse(' ? JSON.parse(JSON.parse(s.slice(11,-1))) : JSON.parse(s); }catch(e){ continue; }
    if(data===null || typeof data!=='object') continue;
    return {app:j, at:j+2, end:end, data:data};
  }
  throw new Error('could not locate the seed after App');
}
function seedOf(doc){ return seedAt(doc).data; }
// The document with its seed replaced, written the way the app writes it.
function withSeed(doc,data){
  var s=seedAt(doc);
  return doc.slice(0,s.at)+'JSON.parse('+JSON.stringify(JSON.stringify(data)).replace(/</g,'\\u003c')+')'+doc.slice(s.end);
}
// The document marked as a copy never moved into a store. The app treats a
// runtime that answers null for db as a store it cannot reach, and pauses;
// only a copy marked this way saves by republishing itself, which is the path
// the suites with no db stub drive.
function localOnly(doc){ var st=seedOf(doc); st.localOnly=true; return withSeed(doc,st); }
module.exports={PUBLISH:PUBLISH, readDoc:readDoc, launch:launch, seedAt:seedAt, seedOf:seedOf, withSeed:withSeed, localOnly:localOnly};
