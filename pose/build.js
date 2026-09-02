// preview.html is generated, never hand-edited. Editing it directly is how the
// front views silently went stale: the page kept rendering an older copy of
// render.js while the checks read the current one.
// Usage: node pose/build.js
var fs=require('fs'), path=require('path');
var dir=__dirname;
var src=['rig.js','exercises.js','render.js']
  .map(function(f){ return '// ---- '+f+' ----\n'+fs.readFileSync(path.join(dir,f),'utf8').trim(); })
  .join('\n\n');
var tmpl=fs.readFileSync(path.join(dir,'preview.tmpl.html'),'utf8');
if(tmpl.indexOf('/* BUILD:SOURCES */')<0) throw new Error('template lost its BUILD:SOURCES marker');
fs.writeFileSync(path.join(dir,'preview.html'), tmpl.replace('/* BUILD:SOURCES */', src));
console.log('built pose/preview.html from rig.js + exercises.js + render.js');
