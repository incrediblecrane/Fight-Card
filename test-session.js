// Covers the four things a session now has to get right: the warm-up and
// cool-down steps, the per-dumbbell stipulation on the weight a set records,
// multi-stint sauna sessions, and the shrug's new rig.
// Run against /tmp/publish.html, with a faithful artifact stub: publish saves
// AND reloads, which is the thing that used to lose state silently.
var http=require('http'),fs=require('fs'),assert=require('assert');
var {chromium}=require('/home/user/Fight-Card/node_modules/playwright');
var doc=fs.readFileSync('/tmp/publish.html','utf8');
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});

srv.listen(0,async function(){
  var b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  var p=await b.newPage({viewport:{width:420,height:900},hasTouch:true});
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.setDefaultTimeout(8000);
  var fails=0, ok=function(m){console.log('  PASS  '+m);},
      bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  var url='http://127.0.0.1:'+srv.address().port+'/';
  // publish() saves AND reloads, so any state-changing click is followed by a
  // navigation ~1s later. Racing it is how a step lands on a page that is about
  // to be replaced, so every mutating action waits it out.
  var settle=async function(){ await p.waitForTimeout(1700); };
  var go=async function(){ await p.goto(url); await p.waitForTimeout(600); };
  var t=async function(name,fn){ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
  var text=function(){ return p.evaluate(function(){ return document.body.innerText; }); };
  var leaveSession=async function(){
    var back=await p.$('[data-action="cancelsession"]');
    if(back){ await back.click(); await p.waitForTimeout(400); }
    var discard=await p.$('[data-action="discardsession"]');
    if(discard){ await discard.click(); await settle(); }
  };

  await go(); await leaveSession();

  console.log('\nWARM-UP AND COOL-DOWN');

  // Start the Pull session and check the shape of it.
  var startWorkout=async function(title){
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    var started=await p.evaluate(function(want){
      var cards=[].slice.call(document.querySelectorAll('.wcard'));
      for(var i=0;i<cards.length;i++){
        var h=cards[i].querySelector('h4');
        if(h && h.textContent.trim()===want){ cards[i].querySelector('[data-action="startworkout"]').click(); return true; }
      }
      return false;
    },title);
    assert.ok(started,'no workout card titled '+title);
    await settle();
  };
  var slideTitle=function(){ return p.evaluate(function(){ var h=document.querySelector('.slide h4'); return h?h.textContent.trim():''; }); };
  var next=async function(){ await p.click('[data-action="nextslide"]'); await p.waitForTimeout(250); };

  await startWorkout('Pull');

  await t('every session opens on a warm-up step', async function(){
    assert.strictEqual(await slideTitle(),'Warm-up');
  });

  await t('the warm-up shows this workout’s own prose, not a generic cue', async function(){
    var cue=await p.evaluate(function(){ var c=document.querySelector('.slide .cue'); return c?c.textContent:''; });
    assert.ok(/band pull-aparts/i.test(cue),'cue was: '+cue);
  });

  await t('a prep step draws no figure, because the movement depends on the option', async function(){
    var figs=await p.evaluate(function(){ return document.querySelectorAll('.slide svg').length; });
    assert.strictEqual(figs,0,'found '+figs+' figures on the warm-up slide');
  });

  await t('the level field is only offered once an option is chosen', async function(){
    var before=await p.$('#log-lvl-warmup');
    assert.ok(!before,'a level control was shown before an option was picked');
  });

  await t('a machine option asks for resistance', async function(){
    await p.selectOption('#log-opt-warmup','Bike'); await p.waitForTimeout(300);
    var opts=await p.evaluate(function(){
      var s=document.getElementById('log-lvl-warmup');
      return {tag:s.tagName, first:s.options[1].value, last:s.options[s.options.length-1].value, hint:s.options[0].textContent};
    });
    assert.strictEqual(opts.tag,'SELECT');
    assert.strictEqual(opts.first,'1'); assert.strictEqual(opts.last,'20');
    assert.ok(/Resistance/i.test(opts.hint),'hint was '+opts.hint);
  });

  await t('a treadmill asks for a speed instead', async function(){
    await p.selectOption('#log-opt-warmup','Treadmill walk/jog'); await p.waitForTimeout(300);
    var el=await p.evaluate(function(){
      var s=document.getElementById('log-lvl-warmup'); return {tag:s.tagName, ph:s.placeholder};
    });
    assert.strictEqual(el.tag,'INPUT');
    assert.ok(/km\/h/.test(el.ph),'placeholder was '+el.ph);
  });

  await t('a stretch asks only how hard it felt', async function(){
    await p.selectOption('#log-opt-warmup','Dynamic mobility'); await p.waitForTimeout(300);
    var opts=await p.evaluate(function(){
      var s=document.getElementById('log-lvl-warmup');
      return [].slice.call(s.options).map(function(o){return o.value;});
    });
    assert.ok(opts.indexOf('Moderate')>-1,'effort levels missing: '+opts.join(','));
  });

  await t('changing the option does not wipe minutes already typed', async function(){
    await p.fill('#log-v-warmup','8');
    await p.selectOption('#log-opt-warmup','Bike'); await p.waitForTimeout(300);
    var v=await p.inputValue('#log-v-warmup');
    assert.strictEqual(v,'8','minutes were lost, they read "'+v+'"');
  });

  await t('a logged warm-up reads back as option, level and minutes', async function(){
    await p.selectOption('#log-lvl-warmup','6');
    await p.click('[data-action="logset"]'); await settle();
    var chip=await p.evaluate(function(){ var c=document.querySelector('.setchip'); return c?c.textContent:''; });
    assert.ok(/8 min/.test(chip) && /Bike/.test(chip) && /resistance 6/i.test(chip),'chip read: '+chip);
  });

  await t('the cool-down is the last step of the session', async function(){
    var titles=[await slideTitle()];
    for(var i=0;i<12;i++){
      var has=await p.$('[data-action="nextslide"]'); if(!has) break;
      await next(); titles.push(await slideTitle());
    }
    assert.strictEqual(titles[titles.length-1],'Cool-down','order was: '+titles.join(' > '));
    assert.ok(titles.indexOf('Pull-up')>0,'the real exercises went missing: '+titles.join(' > '));
  });

  await t('the cool-down offers cool-down options, not warm-up ones', async function(){
    var opts=await p.evaluate(function(){
      var s=document.getElementById('log-opt-cooldown');
      return [].slice.call(s.options).map(function(o){return o.value;});
    });
    assert.ok(opts.indexOf('Foam rolling')>-1,'cool-down options were: '+opts.join(','));
    assert.ok(opts.indexOf('Shadowboxing')<0,'warm-up options leaked into the cool-down');
  });

  console.log('\nPER-DUMBBELL WEIGHT');

  await go(); await leaveSession();
  await startWorkout('Pull');
  // Slides only move forward one at a time, so rewind to the start first;
  // otherwise a lift that sits earlier in the session is unreachable.
  var toSlide=async function(name){
    for(var r=0;r<16;r++){
      var prev=await p.$('[data-action="prevslide"]:not([disabled])');
      if(!prev) break;
      await prev.click(); await p.waitForTimeout(180);
    }
    for(var i=0;i<16;i++){
      if((await slideTitle())===name) return true;
      var has=await p.$('[data-action="nextslide"]'); if(!has) return false;
      await next();
    }
    return false;
  };

  await t('a two-dumbbell lift says so on the input and in a note', async function(){
    assert.ok(await toSlide('Bicep curl'),'never reached the bicep curl');
    var ph=await p.getAttribute('#log-w-curl_bicep','placeholder');
    assert.strictEqual(ph,'kg each');
    var note=await p.evaluate(function(){ var n=document.querySelector('.perimp'); return n?n.textContent:''; });
    assert.ok(/one dumbbell, not the pair/i.test(note),'note read: '+note);
  });

  await t('a logged set records it as "ea" so it cannot be misread later', async function(){
    await p.fill('#log-w-curl_bicep','20'); await p.fill('#log-v-curl_bicep','10');
    await p.click('[data-action="logset"]'); await settle();
    var chip=await p.evaluate(function(){ var c=document.querySelector('.setchip'); return c?c.textContent:''; });
    assert.ok(/20kg ea/.test(chip),'chip read: '+chip);
  });

  await t('a one-implement lift is NOT labelled per dumbbell', async function(){
    assert.ok(await toSlide('Lat pulldown'),'never reached the lat pulldown');
    var ph=await p.getAttribute('#log-w-pulldown','placeholder');
    assert.strictEqual(ph,'kg','a bar was labelled as a pair');
    var note=await p.evaluate(function(){ return !!document.querySelector('.perimp'); });
    assert.ok(!note,'a per-dumbbell note appeared on a barbell lift');
  });

  console.log('\nSAUNA, MULTIPLE STINTS PER SESSION');

  await go(); await leaveSession();
  await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);

  await t('two stints at different heights log as ONE session', async function(){
    await p.fill('#sauna-mins','15'); await p.fill('#sauna-temp','90');
    await p.selectOption('#sauna-pos','Top');
    await p.click('[data-action="addstint"]'); await p.waitForTimeout(300);
    var chip=await p.evaluate(function(){ var c=document.querySelector('.setchip'); return c?c.textContent:''; });
    assert.ok(/15 min/.test(chip) && /Top/.test(chip),'draft chip read: '+chip);
    await p.fill('#sauna-mins','10'); await p.selectOption('#sauna-pos','Bottom');
    await p.click('[data-action="logsauna"]'); await settle();
    var body=await text();
    assert.ok(/1 session/.test(body),'it counted as more than one session: '+(body.match(/\d+ sessions?/)||[])[0]);
  });

  await t('the temperature carries between stints without retyping', async function(){
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);
    var body=await text();
    assert.ok(/25 min/.test(body),'total was not 25 min:\n'+body.slice(0,600));
    assert.ok(/90/.test(body),'the temperature did not stick');
  });

  await t('the breakdown survives the save and reads back per stint', async function(){
    await go();
    await leaveSession();
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);
    var body=await text();
    assert.ok(/15 min Top \+ 10 min Bottom/.test(body),'breakdown missing:\n'+body.slice(0,700));
  });

  await t('a single-stint session still logs in one tap and reads plainly', async function(){
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);
    await p.fill('#sauna-mins','12'); await p.selectOption('#sauna-pos','Floor');
    await p.click('[data-action="logsauna"]'); await settle();
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);
    var body=await text();
    assert.ok(/12 min · Floor/.test(body)||/12 min &middot; Floor/.test(body),'single stint read oddly:\n'+body.slice(0,700));
  });

  console.log('\nSHRUG');

  await t('the shrug is in the library with a rig, not a generic pose', async function(){
    await go(); await leaveSession();
    await startWorkout('Pull');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','shrug'); await p.waitForTimeout(400);
    var found=await p.evaluate(function(){
      var n=[].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
      return n;
    });
    assert.ok(found.indexOf('Dumbbell shrug')>-1,'search found: '+found.join(','));
    await p.click('[data-action="toggleex"][data-id="shrug"]'); await p.waitForTimeout(400);
    var views=await p.evaluate(function(){ return document.querySelectorAll('.pickpreview svg').length; });
    assert.strictEqual(views,2,'expected a side and a front view, got '+views);
  });

  await t('the shrug is logged per dumbbell too', async function(){
    await p.click('[data-action="addex"][data-id="shrug"]'); await settle();
    assert.ok(await toSlide('Dumbbell shrug'),'the shrug did not join the session');
    var ph=await p.getAttribute('#log-w-shrug','placeholder');
    assert.strictEqual(ph,'kg each');
  });

  await t('adding an exercise keeps the cool-down last', async function(){
    var titles=[await slideTitle()];
    for(var i=0;i<14;i++){
      var has=await p.$('[data-action="nextslide"]'); if(!has) break;
      await next(); titles.push(await slideTitle());
    }
    assert.strictEqual(titles[titles.length-1],'Cool-down','the added exercise landed after the cool-down');
  });

  console.log('\nREVIEW FIXES');

  await t('adding an exercise lands on it, not on the cool-down', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','shrug'); await p.waitForTimeout(400);
    await p.click('[data-action="addex"][data-id="shrug"]'); await settle();
    assert.strictEqual(await slideTitle(),'Dumbbell shrug',
      'landed on "'+(await slideTitle())+'" after adding the shrug');
  });

  await t('a removed warm-up can be found again in the picker', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    await p.click('[data-action="removeex"][data-id="warmup"]'); await settle();
    assert.notStrictEqual(await slideTitle(),'Warm-up','the warm-up was not removed');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','warm'); await p.waitForTimeout(400);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Warm-up')>-1,'the picker could not find it again: '+names.join(','));
  });

  await t('a plan that already warms up does not get a second one', async function(){
    await go(); await leaveSession(); await startWorkout('Swim');
    var titles=[await slideTitle()];
    for(var i=0;i<12;i++){
      var has=await p.$('[data-action="nextslide"]'); if(!has) break;
      await next(); titles.push(await slideTitle());
    }
    var generic=titles.filter(function(x){return x==='Warm-up';}).length;
    assert.strictEqual(generic,0,'Swim got a generic warm-up on top of its own: '+titles.join(' > '));
    assert.strictEqual(titles[0],'Warm-up swim','Swim did not open on its own warm-up: '+titles.join(' > '));
    var cools=titles.filter(function(x){return x==='Cool-down';}).length;
    assert.strictEqual(cools,0,'Swim got a generic cool-down on top of its own: '+titles.join(' > '));
  });

  await t('a plan with a warm-up but no cool-down gets only the cool-down', async function(){
    await go(); await leaveSession(); await startWorkout('Cardio — gym');
    var titles=[await slideTitle()];
    for(var i=0;i<12;i++){
      var has=await p.$('[data-action="nextslide"]'); if(!has) break;
      await next(); titles.push(await slideTitle());
    }
    assert.strictEqual(titles.filter(function(x){return x==='Warm-up';}).length,0,
      'a second warm-up appeared: '+titles.join(' > '));
    assert.strictEqual(titles[titles.length-1],'Cool-down','no cool-down was added: '+titles.join(' > '));
  });

  await t('prep minutes read as minutes on the progress page, not reps', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    await p.selectOption('#log-opt-warmup','Bike'); await p.waitForTimeout(300);
    await p.selectOption('#log-lvl-warmup','6');
    await p.fill('#log-v-warmup','9');
    await p.click('[data-action="logset"]'); await settle();
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(600);
    await p.click('[data-action="finishworkout"]').catch(function(){});
    var body=await text();
    assert.ok(!/9reps/.test(body),'warm-up minutes rendered as reps:\n'+
      (body.match(/.{0,60}9reps.{0,40}/)||[''])[0]);
  });

  await t('a paired-dumbbell set counts the weight in both hands', async function(){
    // 25kg in each hand for 12 reps is 600kg moved, not 300.
    var tonnes=function(){ return p.evaluate(function(){
      var tiles=[].slice.call(document.querySelectorAll('.stat-tile'));
      for(var i=0;i<tiles.length;i++){
        var l=tiles[i].querySelector('.l');
        if(l && l.textContent.trim()==='total lifted')
          return parseFloat(tiles[i].querySelector('.n').textContent);
      }
      return null;
    }); };
    await go(); await leaveSession();
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(600);
    var before=await tonnes();
    assert.ok(before!==null,'no total-lifted tile on the progress page');

    await startWorkout('Pull');
    assert.ok(await toSlide('Bicep curl'),'never reached the bicep curl');
    await p.fill('#log-w-curl_bicep','25'); await p.fill('#log-v-curl_bicep','12');
    await p.click('[data-action="logset"]'); await settle();
    // Finish only exists on the last slide, and the tab bar is hidden inside a
    // session, so the session has to be finished to get back to Progress.
    await toSlide('Cool-down');
    await p.click('[data-action="finishworkout"]'); await settle();
    var tabBtn=await p.$('[data-action="tab"][data-tab="progress"]');
    if(tabBtn){ await tabBtn.click(); await p.waitForTimeout(600); }
    var after=await tonnes();
    var delta=Math.round((after-before)*1000);
    assert.strictEqual(delta,600,
      'a 25kg-each set of 12 added '+delta+'kg, expected 600kg (both hands)');
  });

  await t('no page errors', function(){
    assert.deepStrictEqual(errs,[],errs.join(' | '));
  });

  await b.close(); srv.close();
  console.log(fails?('\n'+fails+' FAILING'):'\nAll session checks pass.');
  process.exit(fails?1:0);
});
