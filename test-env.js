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
module.exports={PUBLISH:PUBLISH, readDoc:readDoc, launch:launch};
