// Renders the real preview in a DOM and asserts every figure actually has
// geometry. Catches "element created but never populated", which is exactly
// how the front views shipped as empty boxes.
var fs=require('fs'), path=require('path');
var file=path.join(__dirname,'..','preview.html');
var JSDOM;
try { JSDOM=require('jsdom').JSDOM; } catch(e){ console.log('=== RENDER CHECK ===\nSKIPPED: jsdom not installed'); process.exit(0); }
var EX=require('../exercises.js');
var dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true});
var w=dom.window, fails=[];
setTimeout(function(){
  var d=w.document;
  var expectSide=EX.length, expectFront=EX.filter(function(e){return e.front;}).length;
  var svgs=d.querySelectorAll('.figwrap svg');
  if(svgs.length!==expectSide+expectFront)
    fails.push('expected '+(expectSide+expectFront)+' figures, found '+svgs.length);
  svgs.forEach(function(svg,i){
    var label=svg.getAttribute('aria-label')||('figure '+i);
    var polys=svg.querySelectorAll('polygon'), circles=svg.querySelectorAll('circle');
    if(!polys.length) fails.push(label+': no limb polygons at all');
    polys.forEach(function(p,j){
      var pts=p.getAttribute('points');
      if(!pts) fails.push(label+': polygon '+j+' has no points (drawn as an empty box)');
      else if(/NaN|undefined/.test(pts)) fails.push(label+': polygon '+j+' has invalid points');
    });
    circles.forEach(function(c,j){
      if(c.getAttribute('cx')===null) fails.push(label+': circle '+j+' never positioned');
    });
  });
  console.log('=== RENDER CHECK ===');
  if(!fails.length) console.log('PASS: all '+svgs.length+' figures ('+expectSide+' side, '+expectFront+' front) have real geometry.');
  else { console.log('FAILURES ('+fails.length+'):'); var seen={};
    fails.forEach(function(f){ var k=f.replace(/\d+/g,'#'); if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
  process.exit(fails.length?1:0);
},700);
