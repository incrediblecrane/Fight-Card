// Covers the four things a session now has to get right: the warm-up and
// cool-down steps, the per-dumbbell stipulation on the weight a set records,
// multi-stint sauna sessions, and the shrug's new rig.
// Run against the published document, with a faithful artifact stub: publish saves
// AND reloads, which is the thing that used to lose state silently.
var http=require('http'),fs=require('fs'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();
// What the app last saved, as the JSON its state is.
function savedJson(){ return JSON.stringify(env.seedOf(doc)); }
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});

srv.listen(0,async function(){
  var b=await env.launch();
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

  console.log('\nSEARCH');

  await t('typing keeps focus and the caret, so no letter is dropped', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(400);
    await p.click('#ex-search');
    var trail=[];
    for(var ci=0;ci<'shrug'.length;ci++){
      await p.keyboard.type('shrug'.charAt(ci));
      await p.waitForTimeout(140);
      trail.push(await p.evaluate(function(){
        var i=document.getElementById('ex-search');
        return {v:i?i.value:'(gone)', f:document.activeElement===i, c:i?i.selectionStart:-1,
                n:document.querySelectorAll('.pickrow-main .n').length};
      }));
    }
    var last=trail[trail.length-1];
    assert.strictEqual(last.v,'shrug','the box holds "'+last.v+'" after typing shrug');
    assert.ok(trail.every(function(x){return x.f;}),'focus was lost mid-type');
    assert.strictEqual(last.c,5,'the caret ended at '+last.c+', not the end');
    assert.strictEqual(last.n,1,'expected one result, got '+last.n);
  });

  await t('the results narrow with every letter, not just the first', async function(){
    var n1=await p.evaluate(function(){ return document.querySelectorAll('.pickrow-main .n').length; });
    await p.fill('#ex-search',''); await p.waitForTimeout(200);
    var nAll=await p.evaluate(function(){ return document.querySelectorAll('.pickrow-main .n').length; });
    assert.ok(nAll>n1,'clearing the box did not widen the list ('+nAll+' vs '+n1+')');
  });

  await t('a trailing plural still finds it', async function(){
    await p.click('#ex-search');
    await p.keyboard.type('shrugs'); await p.waitForTimeout(250);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Dumbbell shrug')>-1,'"shrugs" found: '+(names.join(',')||'nothing'));
  });

  await t('the shrug is in the plain unsearched list too', async function(){
    await p.fill('#ex-search',''); await p.waitForTimeout(250);
    var pull=await p.evaluate(function(){
      var gs=[].slice.call(document.querySelectorAll('.pickgroup'));
      for(var i=0;i<gs.length;i++){
        if(gs[i].querySelector('.pickgroup-title').textContent.trim()==='Pull')
          return [].slice.call(gs[i].querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
      }
      return [];
    });
    assert.ok(pull.indexOf('Dumbbell shrug')>-1,'Pull group held: '+pull.join(', '));
  });

  await t('a full re-render puts focus back where it was', async function(){
    // Changing the prep option re-renders the whole view to swap the level
    // field. The control being used should still be the focused one after.
    await go(); await leaveSession(); await startWorkout('Pull');
    assert.strictEqual(await slideTitle(),'Warm-up');
    await p.focus('#log-opt-warmup');
    await p.selectOption('#log-opt-warmup','Rower'); await p.waitForTimeout(350);
    var still=await p.evaluate(function(){
      return document.activeElement && document.activeElement.id;
    });
    assert.strictEqual(still,'log-opt-warmup','focus jumped to "'+still+'" after the re-render');
  });

  console.log('\nOWN SESSION AND THE FLYS');

  await t('the custom workout opens with just a warm-up and a cool-down', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    var titles=[await slideTitle()];
    for(var i=0;i<8;i++){
      var n=await p.$('[data-action="nextslide"]'); if(!n) break;
      await next(); titles.push(await slideTitle());
    }
    assert.deepStrictEqual(titles,['Warm-up','Cool-down'],'it opened as: '+titles.join(' > '));
  });

  await t('anything added lands between them, so the session builds itself', async function(){
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','cable fly'); await p.waitForTimeout(400);
    await p.click('[data-action="addex"][data-id="fly_cable"]'); await settle();
    assert.strictEqual(await slideTitle(),'Cable fly','landed on "'+(await slideTitle())+'"');
    var titles=[];
    for(var r=0;r<8;r++){ var pv=await p.$('[data-action="prevslide"]:not([disabled])'); if(!pv) break; await pv.click(); await p.waitForTimeout(160); }
    titles.push(await slideTitle());
    for(var i=0;i<8;i++){
      var n=await p.$('[data-action="nextslide"]'); if(!n) break;
      await next(); titles.push(await slideTitle());
    }
    assert.deepStrictEqual(titles,['Warm-up','Cable fly','Cool-down'],'order was: '+titles.join(' > '));
  });

  await t('a custom session finishes and is logged like any other', async function(){
    assert.ok(await toSlide('Cable fly'),'lost the cable fly');
    await p.fill('#log-w-fly_cable','15'); await p.fill('#log-v-fly_cable','12');
    await p.click('[data-action="logset"]'); await settle();
    await toSlide('Cool-down');
    await p.click('[data-action="finishworkout"]'); await settle();
    var tabBtn=await p.$('[data-action="tab"][data-tab="progress"]');
    if(tabBtn){ await tabBtn.click(); await p.waitForTimeout(600); }
    var body=await text();
    assert.ok(/Own session/.test(body),'the session is not in the log:\n'+body.slice(0,400));
    assert.ok(/15kg ea × 12/.test(body),'the fly set did not read back per side');
  });

  await t('both flys are in the library with two views each', async function(){
    await go(); await leaveSession(); await startWorkout('Push');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','fly'); await p.waitForTimeout(400);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Cable fly')>-1 && names.indexOf('High cable fly')>-1,'search found: '+names.join(','));
    for(var k=0;k<2;k++){
      var id=['fly_cable','fly_cable_high'][k];
      await p.click('[data-action="toggleex"][data-id="'+id+'"]'); await p.waitForTimeout(400);
      var views=await p.evaluate(function(i){
        var row=document.querySelector('[data-action="toggleex"][data-id="'+i+'"]');
        var pv=row.closest('.pickrow').querySelector('.pickpreview');
        return pv?pv.querySelectorAll('svg').length:0;
      }, id);
      assert.strictEqual(views,2,id+' drew '+views+' views');
      await p.click('[data-action="toggleex"][data-id="'+id+'"]'); await p.waitForTimeout(200);
    }
  });

  await t('the two flys are different movements, not one with two labels', async function(){
    // The high fly's hands start high and finish low; the mid fly's stay at
    // chest height. If the front frames matched, one of them would be a lie.
    var same=await p.evaluate(function(){
      var a=RIGFRAMES['fly_cable'].front, b=RIGFRAMES['fly_cable_high'].front;
      return JSON.stringify(a)===JSON.stringify(b);
    }).catch(function(){ return null; });
    if(same!==null) assert.ok(!same,'both flys share identical front frames');
    var drop=await p.evaluate(function(){
      var b=RIGFRAMES['fly_cable_high'].front;
      return b[2].handL[1]-b[0].handL[1];
    }).catch(function(){ return null; });
    if(drop!==null) assert.ok(drop>40,'the high fly only travels '+drop+' downward');
  });

  console.log('\nLIGHT SETS ON THE WARM-UP');

  await t('picking light sets asks for kg and reps, not minutes and a feeling', async function(){
    await go(); await leaveSession(); await startWorkout('Push');
    assert.strictEqual(await slideTitle(),'Warm-up','the session did not open on the warm-up');
    // Before choosing, it is the usual minutes field.
    assert.strictEqual(await p.getAttribute('#log-v-warmup','placeholder'),'mins');
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Light sets of the first lift');
    await p.waitForTimeout(500);
    assert.ok(await p.$('#log-w-warmup'),'no kg box for light sets');
    assert.strictEqual(await p.getAttribute('#log-v-warmup','placeholder'),'reps',
      'the number is still being asked for as minutes');
    assert.strictEqual(await p.$('#log-lvl-warmup'), null,
      'it still asks how hard the light sets felt');
  });

  await t('it names the lift you are ramping up on', async function(){
    var hint=await p.evaluate(function(){
      var h=document.querySelector('.slide .perimp'); return h?h.textContent.trim():''; });
    assert.ok(/Ramping up on .+/.test(hint),'the hint reads "'+hint+'"');
    assert.ok(!/first lift/i.test(hint),'it still says "the first lift" rather than naming it');
  });

  await t('switching between minutes and reps does not carry the number over', async function(){
    // The number means minutes for a bike and reps for a set at a weight.
    // Ten minutes on the bike used to survive the switch and log as ten reps.
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Bike');
    await p.waitForTimeout(400);
    await p.fill('#log-v-warmup','10');
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Light sets of the first lift');
    await p.waitForTimeout(500);
    assert.strictEqual(await p.inputValue('#log-v-warmup'),'',
      'the minutes came through as reps: "'+(await p.inputValue('#log-v-warmup'))+'"');
    // And it still survives a switch between two options of the SAME kind.
    await p.fill('#log-v-warmup','6');
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Bike');
    await p.waitForTimeout(400);
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Rower');
    await p.waitForTimeout(400);
    await p.fill('#log-v-warmup','9');
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Elliptical');
    await p.waitForTimeout(400);
    assert.strictEqual(await p.inputValue('#log-v-warmup'),'9',
      'minutes were wiped moving between two machines');
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Light sets of the first lift');
    await p.waitForTimeout(500);
  });

  await t('a light set reads back as weight by reps', async function(){
    // A weight that does not already appear anywhere in the seed, so the
    // "it was stored" assertions below can actually fail.
    await p.fill('#log-w-warmup','42.5'); await p.fill('#log-v-warmup','5');
    await p.click('[data-action="logset"]'); await settle();
    var chips=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.setchip')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(chips.length,'nothing was logged');
    assert.ok(/42.5kg × 5/.test(chips[0]),'it reads "'+chips[0]+'"');
    assert.ok(!/min/.test(chips[0]),'it is still calling reps minutes: "'+chips[0]+'"');
  });

  await t('minutes still work for the options that are minutes', async function(){
    await p.selectOption('[data-action="prepopt"][data-ex="warmup"]','Bike');
    await p.waitForTimeout(500);
    assert.strictEqual(await p.getAttribute('#log-v-warmup','placeholder'),'mins');
    assert.ok(await p.$('#log-lvl-warmup'),'the bike lost its resistance picker');
    await p.selectOption('#log-lvl-warmup','8');
    await p.fill('#log-v-warmup','10');
    await p.click('[data-action="logset"]'); await settle();
    var chips=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.setchip')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(chips.some(function(c){return /10 min/.test(c) && /resistance 8/.test(c);}),
      'the bike set reads: '+chips.join(' | '));
    assert.ok(chips.some(function(c){return /42.5kg × 5/.test(c);}),'the light set was lost');
  });

  await t('the progress page survives a warm-up made only of light sets', async function(){
    // A minutes chart with nothing to plot used to read .lbl off nothing and
    // take the whole progress tab down.
    await toSlide('Cool-down');
    await p.click('[data-action="finishworkout"]'); await settle();
    var tabBtn=await p.$('[data-action="tab"][data-tab="progress"]');
    if(tabBtn){ await tabBtn.click(); await p.waitForTimeout(700); }
    var opened=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.exrow .top h4'));
      for(var i=0;i<rows.length;i++){
        if(rows[i].textContent.trim()==='Warm-up'){ rows[i].closest('.top').click(); return true; }
      }
      return false;
    });
    assert.ok(opened,'the warm-up is not in the exercise history');
    await p.waitForTimeout(600);
    // The history table shows a window of the most recent sets and this suite
    // finishes many sessions on one date, so looking for the set in that window
    // would be testing the window. What matters is that the page rendered and
    // that the set persisted as a weight rather than as minutes.
    var detail=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.exrow'));
      for(var i=0;i<rows.length;i++){
        var h=rows[i].querySelector('.top h4');
        if(h && h.textContent.trim()==='Warm-up') return rows[i].innerText;
      }
      return '';
    });
    assert.ok(/Sets/.test(detail),'the warm-up detail did not open: '+detail.slice(0,120));
    assert.deepStrictEqual(errs,[],'the progress page threw: '+errs.join(' | '));
    // `doc` is whatever the app last saved through the publish stub; its
    // state is read as JSON, the way the page reads it.
    assert.ok(/"lvlKind":"load"/.test(savedJson()),'the light set was not stored as a weight-and-reps set');
    assert.ok(/"opt":"Light sets of the first lift"/.test(savedJson()),'the option was not stored');
    assert.ok(/"w":42.5/.test(savedJson()),'the weight was not stored');
  });

  await t('a light set survives a reload reading as weight by reps', async function(){
    await go();
    // Read straight out of what was saved, so this does not depend on the
    // history table's window at all.
    assert.ok(/"lvlKind":"load"/.test(savedJson()),'the light set did not survive the reload');
    assert.ok(/"w":42.5/.test(savedJson()),'the weight did not survive the reload');
  });

  console.log('\nREVERSE CABLE FLY');

  await t('two words that are not next to each other still find it', async function(){
    // "Reverse cable fly" has a word in the middle, so a phrase match found
    // nothing at all. An exercise you cannot search for may as well not exist.
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','reverse fly',{delay:35}); await p.waitForTimeout(500);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Reverse cable fly')>-1,'"reverse fly" found: '+names.join(','));
    // Order should not matter either.
    await p.click('#ex-search',{clickCount:3});
    await p.type('#ex-search','fly reverse',{delay:30}); await p.waitForTimeout(500);
    var names2=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names2.indexOf('Reverse cable fly')>-1,'"fly reverse" found: '+names2.join(','));
  });

  await t('it is in the library with its own rig, in Pull not Push', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','reverse cable fly',{delay:35}); await p.waitForTimeout(500);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Reverse cable fly')>-1,'search found: '+names.join(','));
    var area=await p.evaluate(function(){
      var row=document.querySelector('[data-action="addex"][data-id="fly_cable_rev"]').closest('.pickgroup');
      var t=row.querySelector('.pickgroup-title'); return t?t.textContent.trim():'';
    });
    assert.strictEqual(area,'Pull','it is grouped under "'+area+'": rear delts are a pull');
    await p.click('[data-action="toggleex"][data-id="fly_cable_rev"]'); await p.waitForTimeout(400);
    var got=await p.evaluate(function(){
      var row=document.querySelector('[data-action="toggleex"][data-id="fly_cable_rev"]').closest('.pickrow');
      return {views: row.querySelectorAll('.pickpreview svg').length,
              shapes: row.querySelectorAll('.pickpreview svg polygon').length,
              cords: row.querySelectorAll('.pickpreview svg line').length};
    });
    assert.strictEqual(got.views,2,'expected two views, got '+got.views);
    assert.ok(got.shapes>6,'only '+got.shapes+' limb shapes: this is not a solved figure');
    assert.ok(got.cords>0,'no cables drawn: the generic pose is being used instead of the rig');
  });

  await t('the library carries three separate flys, not one reused', async function(){
    // Whether they DRAW different movements is asserted in the pose suite,
    // which can reach the frames. This only checks the app offers three.
    await p.click('#ex-search',{clickCount:3});
    await p.type('#ex-search','fly',{delay:30}); await p.waitForTimeout(500);
    var flys=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('[data-action="addex"]'))
        .map(function(b){ return b.getAttribute('data-id'); })
        .filter(function(x){ return x.indexOf('fly')>-1; });
    });
    assert.deepStrictEqual(flys.sort(), ['fly_cable','fly_cable_high','fly_cable_rev'],
      'the flys in the library are: '+flys.join(', '));
  });

  await t('it logs a weight per side, like the other cable work', async function(){
    await p.click('[data-action="addex"][data-id="fly_cable_rev"]'); await settle();
    assert.strictEqual(await slideTitle(),'Reverse cable fly','landed on "'+(await slideTitle())+'"');
    var note=await p.evaluate(function(){
      var n=document.querySelector('.slide .perimp'); return n?n.textContent:''; });
    assert.ok(/side/i.test(note),'no per-side note, it reads "'+note+'"');
    await p.fill('#log-w-fly_cable_rev','17.5'); await p.fill('#log-v-fly_cable_rev','14');
    await p.click('[data-action="logset"]'); await settle();
    var chips=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.setchip')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(chips.some(function(c){return /17.5kg ea × 14/.test(c);}),
      'the set reads: '+chips.join(' | '));
  });

  console.log('\nSKI ERG');

  await t('it is in the library and draws its own rig', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','ski erg',{delay:35}); await p.waitForTimeout(500);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Ski erg')>-1,'search found: '+names.join(','));
    await p.click('[data-action="toggleex"][data-id="skierg"]'); await p.waitForTimeout(400);
    var got=await p.evaluate(function(){
      var row=document.querySelector('[data-action="toggleex"][data-id="skierg"]').closest('.pickrow');
      return {views: row.querySelectorAll('.pickpreview svg').length,
              props: row.querySelectorAll('.pickpreview svg rect').length,
              shapes: row.querySelectorAll('.pickpreview svg polygon').length};
    });
    assert.strictEqual(got.views,2,'expected two views, got '+got.views);
    assert.ok(got.shapes>6,'only '+got.shapes+' limb shapes: this is not a solved figure');
    assert.ok(got.props>0,'no machine drawn: the generic pose is being used instead of the rig');
  });

  await t('it logs metres like the rower does', async function(){
    await p.click('[data-action="addex"][data-id="skierg"]'); await settle();
    assert.strictEqual(await slideTitle(),'Ski erg','landed on "'+(await slideTitle())+'"');
    await p.fill('#log-v-skierg','500');
    await p.click('[data-action="logset"]'); await settle();
    var chips=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.setchip')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(chips.some(function(c){return /500/.test(c);}),'no set chip: '+chips.join(' | '));
  });

  console.log('\nSIT-UP WALL THROW');

  await t('it is in the library where a sit-up would be looked for', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    // Typed a character at a time: fill() sets the value in one shot and would
    // sail past anything that goes wrong between keystrokes.
    await p.click('#ex-search');
    await p.type('#ex-search','wall throw',{delay:35}); await p.waitForTimeout(500);
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(names.indexOf('Sit-up wall throw')>-1,'search found: '+names.join(','));
  });

  await t('it draws its OWN rig, not the generic fallback pose', async function(){
    // Counting svgs is not enough: the fallback also draws two figures, which
    // is how this shipped green while the app drew a squat. The rig has to be
    // reachable, and its own wall has to be in the drawing.
    await p.click('[data-action="toggleex"][data-id="situpwallthrow"]'); await p.waitForTimeout(400);
    var got=await p.evaluate(function(){
      var row=document.querySelector('[data-action="toggleex"][data-id="situpwallthrow"]').closest('.pickrow');
      return {views: row.querySelectorAll('.pickpreview svg').length,
              props: row.querySelectorAll('.pickpreview svg rect').length,
              shapes: row.querySelectorAll('.pickpreview svg polygon').length};
    });
    assert.strictEqual(got.views,2,'expected two views, got '+got.views);
    assert.ok(got.shapes>6,'only '+got.shapes+' limb shapes: this is not a solved figure');
    assert.ok(got.props>0,'no wall drawn: the generic pose is being used instead of the rig');
  });

  console.log('\nSUPERSETS');

  await t('a superset can be added to a session', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','superset',{delay:35}); await p.waitForTimeout(500);
    var found=await p.$('[data-action="addex"][data-id="superset"]');
    assert.ok(found,'the picker does not offer a superset');
    await found.click(); await settle();
    assert.strictEqual(await slideTitle(),'Superset','landed on "'+(await slideTitle())+'"');
    assert.ok(await p.$('.ssadd select'),'no dropdown to pick exercises with');
  });

  await t('the dropdown offers real exercises but not prep or another superset', async function(){
    var opts=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.ssadd select option')).map(function(o){return o.value;});
    });
    assert.ok(opts.length>40,'only '+opts.length+' choices');
    assert.ok(opts.indexOf('press_bench')>-1,'a normal exercise is missing');
    assert.ok(opts.indexOf('warmup')<0 && opts.indexOf('cooldown')<0,'prep steps are offered');
    assert.ok(opts.indexOf('superset')<0,'a superset can be put inside a superset');
  });

  await t('two exercises go into one round', async function(){
    await p.selectOption('.ssadd select','press_bench');
    await p.click('[data-action="ssadd"]'); await settle();
    await p.selectOption('.ssadd select','row_bent');
    await p.click('[data-action="ssadd"]'); await settle();
    var names=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.ssrow .ssn')).map(function(e){return e.textContent.trim();});
    });
    assert.strictEqual(names.length,2,'the round holds: '+names.join(', '));
    assert.ok(await p.$('#log-v-press_bench'),'no log row for the first exercise');
    assert.ok(await p.$('#log-v-row_bent'),'no log row for the second');
  });

  await t('one Log round button records a set against each of them', async function(){
    await p.fill('#log-w-press_bench','60'); await p.fill('#log-v-press_bench','10');
    await p.fill('#log-w-row_bent','50'); await p.fill('#log-v-row_bent','12');
    await p.click('[data-action="loground"]'); await settle();
    var rows=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.ssrow')).map(function(r){
        return {name:r.querySelector('.ssn').textContent.trim(),
                chips:[].slice.call(r.querySelectorAll('.setchip')).map(function(c){return c.textContent.trim();})};
      });
    });
    assert.strictEqual(rows[0].chips.length,1,rows[0].name+' logged '+rows[0].chips.length+' sets');
    assert.strictEqual(rows[1].chips.length,1,rows[1].name+' logged '+rows[1].chips.length+' sets');
    assert.ok(/60/.test(rows[0].chips[0]),'the weight did not stick: '+rows[0].chips[0]);
    var label=await p.evaluate(function(){
      var b=document.querySelector('[data-action="loground"]'); return b?b.textContent.trim():''; });
    assert.ok(/round 2/i.test(label),'the button still offers round 1: "'+label+'"');
  });

  await t('the sets land on the exercises themselves, so history reads normally', async function(){
    // The whole reason a superset logs into its members rather than into
    // itself: everything downstream keeps working with no idea it happened.
    await toSlide('Cool-down');
    await p.click('[data-action="finishworkout"]'); await settle();
    var tabBtn=await p.$('[data-action="tab"][data-tab="progress"]');
    if(tabBtn){ await tabBtn.click(); await p.waitForTimeout(600); }
    var body=await text();
    assert.ok(/60kg × 10/.test(body),'the bench set did not read back: '+body.slice(0,300));
    assert.ok(!/Superset/i.test(body),'the superset itself leaked into the history as an exercise');
  });

  await t('a second superset is its own thing, not the same one again', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    for(var k=0;k<2;k++){
      await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
      await p.click('#ex-search');
      await p.type('#ex-search','superset',{delay:25}); await p.waitForTimeout(450);
      await p.click('[data-action="addex"][data-id="superset"]'); await settle();
    }
    await p.selectOption('.ssadd select','curl_bicep');
    await p.click('[data-action="ssadd"]'); await settle();
    var here=await p.evaluate(function(){ return document.querySelectorAll('.ssrow').length; });
    assert.strictEqual(here,1,'this superset holds '+here+' exercises');
    await p.click('[data-action="prevslide"]'); await p.waitForTimeout(300);
    assert.strictEqual(await slideTitle(),'Superset','the previous slide is "'+(await slideTitle())+'"');
    var there=await p.evaluate(function(){ return document.querySelectorAll('.ssrow').length; });
    assert.strictEqual(there,0,'the two supersets share their contents ('+there+' exercises)');
  });

  await t('taking an exercise out of a round keeps the sets it already has', async function(){
    await p.click('[data-action="nextslide"]'); await p.waitForTimeout(300);
    await p.fill('#log-v-curl_bicep','8');
    await p.click('[data-action="loground"]'); await settle();
    await p.click('[data-action="ssdel"]'); await settle();
    assert.strictEqual(await p.evaluate(function(){ return document.querySelectorAll('.ssrow').length; }),0,
      'it was not taken out of the round');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','bicep curl',{delay:25}); await p.waitForTimeout(450);
    await p.click('[data-action="addex"][data-id="curl_bicep"]'); await settle();
    var chips=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.setchip')).map(function(e){return e.textContent.trim();});
    });
    assert.ok(chips.some(function(c){return /8/.test(c);}),
      'the set logged inside the round was lost: '+chips.join(' | '));
  });

  await t('sets logged on an exercise own slide are not counted as rounds', async function(){
    // Rounds belong to the superset, not to how many sets its members happen to
    // have. Bench logged three times on its own slide used to make a brand new
    // superset containing bench read "3 done" and offer "Log round 4".
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','bench press',{delay:25}); await p.waitForTimeout(450);
    await p.click('[data-action="addex"][data-id="press_bench"]'); await settle();
    for(var k=0;k<3;k++){
      await p.fill('#log-w-press_bench','60'); await p.fill('#log-v-press_bench','10');
      await p.click('[data-action="logset"]'); await settle();
    }
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search','superset',{delay:25}); await p.waitForTimeout(450);
    await p.click('[data-action="addex"][data-id="superset"]'); await settle();
    await p.selectOption('.ssadd select','press_bench');
    await p.click('[data-action="ssadd"]'); await settle();
    var target=await p.evaluate(function(){
      var d=document.querySelector('.slide .target'); return d?d.textContent:''; });
    assert.ok(/0 done/.test(target),'a fresh superset reads "'+target+'"');
    var label=await p.evaluate(function(){
      var b=document.querySelector('[data-action="loground"]'); return b?b.textContent.trim():''; });
    assert.ok(/round 1/i.test(label),'it offers "'+label+'" before any round was done');
  });

  await t('an empty round is not counted', async function(){
    // Nothing typed in, so nothing was done.
    await p.click('[data-action="loground"]'); await settle();
    var target=await p.evaluate(function(){
      var d=document.querySelector('.slide .target'); return d?d.textContent:''; });
    assert.ok(/0 done/.test(target),'an empty round counted: "'+target+'"');
  });

  await t('a round that is actually logged counts once', async function(){
    await p.fill('#log-w-press_bench','60'); await p.fill('#log-v-press_bench','10');
    await p.click('[data-action="loground"]'); await settle();
    var target=await p.evaluate(function(){
      var d=document.querySelector('.slide .target'); return d?d.textContent:''; });
    assert.ok(/1 done/.test(target),'after one round it reads "'+target+'"');
  });

  await t('the ski erg is in the round dropdown, like the rower', async function(){
    // It only existed as a machine option inside a generic cardio step, so it
    // could not be picked anywhere: not in a superset, not as its own slide.
    var opts=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.ssadd select option'))
        .map(function(o){ return o.value; });
    });
    assert.ok(opts.indexOf('skierg')>-1,'the ski erg is not offered');
    assert.ok(opts.indexOf('rowerg')>-1,'the rower is not offered either, so this proves nothing');
  });

  await t('a prep step cannot be dropped into a round', async function(){
    // The machine warm-up is type "cardio" with role "warmup", so filtering on
    // type alone let it through.
    var opts=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.ssadd select option')).map(function(o){return o.value;});
    });
    var prep=opts.filter(function(v){ return /warmup|cooldown/.test(v); });
    assert.deepStrictEqual(prep,[],'prep steps offered: '+prep.join(', '));
  });

  await t('a cardio exercise in a round keeps its machine and effort', async function(){
    // logSet reads these by id. Without them rendered the set was stored as a
    // bare number of minutes and the machine was silently dropped.
    // The machine exercises are the type:"cardio" ones; the rowing ergo is a
    // distance exercise and would not have exercised this at all.
    var cardioId='cardio_gym_intervals';
    var offered=await p.evaluate(function(i){
      return [].slice.call(document.querySelectorAll('.ssadd select option'))
        .some(function(o){ return o.value===i; });
    }, cardioId);
    assert.ok(offered,'the machine intervals are not offered');
    await p.selectOption('.ssadd select',cardioId);
    await p.click('[data-action="ssadd"]'); await settle();
    assert.ok(await p.$('#log-machine-'+cardioId),'no machine picker for the cardio member');
    assert.ok(await p.$('#log-work-'+cardioId),'no work-effort picker for an interval member');
    await p.selectOption('#log-machine-'+cardioId,'Rower');
    await p.selectOption('#log-work-'+cardioId,'Hard');
    await p.fill('#log-v-'+cardioId,'20');
    await p.click('[data-action="loground"]'); await settle();
    var chips=await p.evaluate(function(i){
      var rows=[].slice.call(document.querySelectorAll('.ssrow'));
      for(var k=0;k<rows.length;k++){
        if(rows[k].querySelector('[data-action="ssdel"][data-ex="'+i+'"]'))
          return [].slice.call(rows[k].querySelectorAll('.setchip')).map(function(c){return c.textContent.trim();});
      }
      return [];
    }, cardioId);
    assert.ok(chips.length,'the cardio member logged nothing');
    assert.ok(/Rower/i.test(chips[chips.length-1]),
      'the machine was dropped: "'+chips[chips.length-1]+'"');
  });


  await t('a finished session remembers what was supersetted', async function(){
    // The sets land on the individual exercises, which is what makes history
    // and PBs work without knowing about rounds. It also meant the finished log
    // had no record that two lifts were done back to back at all.
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search'); await p.type('#ex-search','superset',{delay:30}); await p.waitForTimeout(500);
    await p.click('[data-action="addex"][data-id="superset"]'); await settle();
    await p.selectOption('.ssadd select','curl_bicep');
    await p.click('[data-action="ssadd"]'); await settle();
    await p.selectOption('.ssadd select','row_bent');
    await p.click('[data-action="ssadd"]'); await settle();
    await p.fill('#log-w-curl_bicep','15'); await p.fill('#log-v-curl_bicep','10');
    await p.fill('#log-w-row_bent','40');   await p.fill('#log-v-row_bent','8');
    await p.click('[data-action="loground"]'); await settle();
    assert.ok(await toSlide('Cool-down'),'never reached the cool-down');
    await p.click('[data-action="finishworkout"]'); await settle();
    var tabBtn=await p.$('[data-action="tab"][data-tab="progress"]');
    if(tabBtn){ await tabBtn.click(); await p.waitForTimeout(600); }
    var rows=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('[data-action="dellog"]'))
        .map(function(b){ return b.closest('.swipe').innerText.replace(/\n/g,' / '); });
    });
    assert.ok(rows.some(function(r){ return /Bicep curl/.test(r) && /Bent-over row/.test(r); }),
      'no session row says what was supersetted:\n        '+rows.join('\n        '));
    // And it has to survive the save, not just the render that made it.
    assert.ok(/"supersets":\[\{"ex":\["curl_bicep","row_bent"\],"rounds":1\}\]/.test(savedJson()),
      'the superset was not written into the finished log');
  });

  await t('a session with no supersets does not claim one', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search'); await p.type('#ex-search','bicep curl',{delay:30}); await p.waitForTimeout(500);
    await p.click('[data-action="addex"][data-id="curl_bicep"]'); await settle();
    await p.fill('#log-w-curl_bicep','15'); await p.fill('#log-v-curl_bicep','10');
    await p.click('[data-action="logset"]'); await settle();
    await toSlide('Cool-down');
    await p.click('[data-action="finishworkout"]'); await settle();
    var tabBtn=await p.$('[data-action="tab"][data-tab="progress"]');
    if(tabBtn){ await tabBtn.click(); await p.waitForTimeout(600); }
    var note=await p.evaluate(function(){
      var r=document.querySelector('[data-action="dellog"]');
      return r?!!r.closest('.swipe').querySelector('.ssnote'):null;
    });
    assert.strictEqual(note,false,'a superset note appeared on a session that had none');
  });


  console.log('\nSHOULDER AND ARM WORK');

  // Samples the live front figure right through its cycle. Reading one frame is
  // not enough: what tells a real front view from one projected off the side
  // frames is whether the hands change their separation at all, and a still
  // cannot show that.
  var handSpread=async function(){
    var seen=[];
    for(var i=0;i<26;i++){
      var s=await p.evaluate(function(){
        var box=document.getElementById('fig-live-front');
        if(!box) return null;
        // Only the two hands are drawn with a 2-wide outline.
        var hands=[].slice.call(box.querySelectorAll('circle[stroke-width="2"]'));
        var sh=[].slice.call(box.querySelectorAll('circle[r="6.5"]'));
        if(hands.length!==2 || sh.length!==2) return null;
        var x=hands.map(function(c){ return +c.getAttribute('cx'); });
        var y=hands.map(function(c){ return +c.getAttribute('cy'); });
        return {sep:Math.abs(x[0]-x[1]), top:Math.min(y[0],y[1]),
                sh:Math.abs(+sh[0].getAttribute('cx') - +sh[1].getAttribute('cx'))};
      });
      if(s) seen.push(s);
      await p.waitForTimeout(90);
    }
    assert.ok(seen.length>15,'the front figure barely drew: '+seen.length+' of 26 samples');
    var seps=seen.map(function(s){ return s.sep; });
    return {widest:Math.max.apply(null,seps), narrowest:Math.min.apply(null,seps),
            range:Math.max.apply(null,seps)-Math.min.apply(null,seps),
            highest:Math.min.apply(null,seen.map(function(s){ return s.top; })),
            shoulders:seen[0].sh};
  };

  var openPickerOn=async function(search){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search');
    await p.type('#ex-search',search,{delay:30}); await p.waitForTimeout(500);
  };

  // All four are the same shape of thing: a new exercise with its own rig and
  // its own front view. Two things go wrong with that, so both are checked for
  // every one of them. The rig can be unreachable from RIGMAP, in which case
  // the app quietly draws the generic fallback pose (that is how a sit-up once
  // shipped as a squat). Or the front can be missing, in which case the second
  // panel is the side view over again.
  // front:false is the front dumbbell raise only, and it is deliberate. The
  // movement is purely sagittal, so a front view projects the arms to nothing;
  // it ships with the start and finish of the side view instead.
  var NEW_EX=[{id:'raise_front', name:'Front dumbbell raise', find:'front raise', pair:true, front:false},
              {id:'raise_lateral', name:'Side lateral raise', find:'lateral', pair:true, front:true},
              {id:'pulldown_straight', name:'Standing lat pulldown', find:'standing lat', pair:false, front:true, props:true},
              {id:'curl_reverse', name:'Reverse barbell curl', find:'reverse curl', pair:false, front:true}];

  for(var qi=0;qi<NEW_EX.length;qi++){
    var E=NEW_EX[qi];

    await t(E.name+' is in the library, drawn from its own rig', async function(E){
      await openPickerOn(E.find);
      var names=await p.evaluate(function(){
        return [].slice.call(document.querySelectorAll('.pickrow-main .n')).map(function(e){ return e.textContent.trim(); });
      });
      assert.ok(names.indexOf(E.name)>-1,'searching "'+E.find+'" found: '+names.join(','));
      await p.click('[data-action="toggleex"][data-id="'+E.id+'"]'); await p.waitForTimeout(400);
      var got=await p.evaluate(function(i){
        var row=document.querySelector('[data-action="toggleex"][data-id="'+i+'"]').closest('.pickrow');
        var svgs=[].slice.call(row.querySelectorAll('.pickpreview svg'));
        return {views:svgs.length,
                boxes:svgs.map(function(s){ return s.getAttribute('viewBox'); }),
                shapes:row.querySelectorAll('.pickpreview svg polygon').length,
                props:row.querySelectorAll('.pickpreview svg rect').length,
                arrow:(row.querySelector('.arrow')||{textContent:'?'}).textContent.trim()};
      }, E.id);
      assert.strictEqual(got.views,2,'expected two views, got '+got.views);
      // The generic fallback also draws two figures, which is how a sit-up once
      // shipped as a squat. A solved view has a viewBox of its own, and the two
      // views have different ones.
      assert.strictEqual(got.boxes[1], E.front?'20 18 100 168':'-20 18 175 168',
        'the second panel is not the view it should be, its viewBox is '+got.boxes[1]);
      assert.ok(got.shapes>6,'only '+got.shapes+' limb shapes: this is not a solved figure');
      assert.strictEqual(got.arrow, E.front?'':'\u2192',
        'the arrow says the app '+(E.front?'has no':'has a')+' front view for this');
      if(E.props) assert.ok(got.props>0,'no pulley drawn: the machine is missing from the rig');
    }.bind(null,E));

    await t(E.name+' logs '+(E.pair?'per dumbbell':'a plain weight'), async function(E){
      await p.click('[data-action="addex"][data-id="'+E.id+'"]'); await settle();
      assert.strictEqual(await slideTitle(),E.name,'landed on "'+(await slideTitle())+'"');
      var ph=await p.getAttribute('#log-w-'+E.id,'placeholder');
      var note=await p.evaluate(function(){ var n=document.querySelector('.perimp'); return n?n.textContent:''; });
      if(E.pair){
        assert.strictEqual(ph,'kg each','a pair of dumbbells was labelled "'+ph+'"');
        assert.ok(/one dumbbell, not the pair/i.test(note),'note read: '+note);
      }else{
        assert.strictEqual(ph,'kg','a single implement was labelled "'+ph+'"');
        assert.strictEqual(note,'','a per-dumbbell note appeared on a bar: '+note);
      }
      await p.fill('#log-w-'+E.id,'12'); await p.fill('#log-v-'+E.id,'12');
      await p.click('[data-action="logset"]'); await settle();
      var chip=await p.evaluate(function(){ var c=document.querySelector('.setchip'); return c?c.textContent.trim():''; });
      assert.ok(new RegExp('12kg'+(E.pair?' ea':'')+' \u00d7 12').test(chip),'the set reads: "'+chip+'"');
      if(!E.pair) assert.ok(!/kg ea/.test(chip),'a single implement logged as a pair: "'+chip+'"');
    }.bind(null,E));
  }

  await t('the side lateral raise takes the hands out past the shoulders', async function(){
    // Its whole point is the lateral path. Derived off the side frames the
    // hands would sit at one width and only rise, which is the wrong exercise.
    await openPickerOn('lateral');
    await p.click('[data-action="addex"][data-id="raise_lateral"]'); await settle();
    var spread=await handSpread();
    assert.ok(spread.widest>spread.shoulders+30,
      'the hands reach only '+spread.widest.toFixed(1)+' apart against shoulders of '+spread.shoulders);
    assert.ok(spread.range>20,'the hands barely move sideways (range '+spread.range.toFixed(1)+')');
  });

  console.log('\nFACE PULL, FRONT VIEW');

  await t('the hands travel apart, so it is the pull and not a projection', async function(){
    // It used to be derived from the side, where the arms point straight at the
    // camera: they foreshortened to nothing and sat as lumps beside the head at
    // one fixed grip width. A derived front CANNOT change its hand separation,
    // so separation across the cycle is exactly the thing to measure.
    await openPickerOn('face pull');
    await p.click('[data-action="addex"][data-id="facepull"]'); await settle();
    assert.strictEqual(await slideTitle(),'Face pull','landed on "'+(await slideTitle())+'"');
    var spread=await handSpread();
    assert.ok(spread.range>8,'the hands hold a fixed '+spread.widest.toFixed(1)+' apart all cycle (range '
      +spread.range.toFixed(1)+'): this is a projected front, not the pull');
    assert.ok(spread.widest>spread.shoulders,
      'the hands never get wider than the shoulders ('+spread.widest.toFixed(1)+' against '+spread.shoulders+')');
    assert.ok(spread.highest<62,'the hands never come up beside the head (highest y '+spread.highest.toFixed(1)+')');
  });

  console.log('\nFOREARM WORKOUT');

  await t('it is in the Training tab and runs the five lifts in order', async function(){
    await go(); await leaveSession();
    await startWorkout('Forearms');
    var titles=[await slideTitle()];
    for(var i=0;i<14;i++){
      var has=await p.$('[data-action="nextslide"]'); if(!has) break;
      await next(); titles.push(await slideTitle());
    }
    assert.deepStrictEqual(titles,
      ['Warm-up','Reverse barbell curl','Hammer curl','Plate pinch hold',"Farmer's carry",'Dead hang','Cool-down'],
      'the session read: '+titles.join(' > '));
  });

  await t('its warm-up warns about cold forearms, not a generic cue', async function(){
    await go(); await leaveSession(); await startWorkout('Forearms');
    var cue=await p.evaluate(function(){ var c=document.querySelector('.slide .cue'); return c?c.textContent:''; });
    assert.ok(/wrist/i.test(cue),'cue was: '+cue);
    await leaveSession();
  });

  console.log('\nA SESSION IN PROGRESS');

  await t('starting another workout does not throw away logged sets', async function(){
    // Start used to replace the in-flight session outright, with no undo.
    await go(); await leaveSession(); await startWorkout('Pull');
    assert.ok(await toSlide('Bicep curl'),'never reached the bicep curl');
    await p.fill('#log-w-curl_bicep','20'); await p.fill('#log-v-curl_bicep','10');
    await p.click('[data-action="logset"]'); await settle();
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    var push=function(){ return p.evaluateHandle(function(){
      var cards=[].slice.call(document.querySelectorAll('.wcard'));
      for(var i=0;i<cards.length;i++){ var h=cards[i].querySelector('h4');
        if(h && h.textContent.trim()==='Push') return cards[i].querySelector('button'); }
    }); };
    assert.ok(await p.evaluate(function(b){ return b.disabled; },await push()),
      'the other workouts can still be started over the one in progress');
    // Even if the button is forced, the handler must not replace the session.
    await p.evaluate(function(b){ b.disabled=false; b.click(); },await push());
    await settle();
    var back=await p.$('[data-action="cancelsession"]'); if(back){ await back.click(); await p.waitForTimeout(400); }
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    var banner=await p.evaluate(function(){ var b=document.querySelector('.resume-banner'); return b?b.textContent:''; });
    assert.ok(/Pull/.test(banner) && /1 sets logged/.test(banner),'the session in progress became: '+banner);
    await leaveSession();
  });

  console.log('\nSKIP, FINISH AND RESUME');
  var seedOf=function(){ return env.seedOf(doc); };
  var tapIf=function(sel){ return p.evaluate(function(s){ var e=document.querySelector(s); if(!e) return false; e.click(); return true; },sel); };
  var storyPos=function(){ return p.evaluate(function(){ var h=document.querySelector('.story-title'); var m=h&&/(\d+)\/(\d+)\s*$/.exec(h.textContent); return m?[+m[1],+m[2]]:null; }); };

  await t('skipping through every slide does not finish the session', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    var st0=seedOf();
    for(var k=0;k<30;k++){ if(!(await tapIf('[data-action="skipex"]'))) break; await p.waitForTimeout(120); }
    await settle();
    var st1=seedOf();
    assert.strictEqual(st1.workoutLogs.length,st0.workoutLogs.length,'skipping logged a session');
    assert.strictEqual(st1.totalXp,st0.totalXp,'skipping paid XP');
    assert.ok(st1.activeSession,'skipping ended the session');
    var pos=await storyPos();
    assert.ok(pos && pos[0]===pos[1],'did not end up on the last slide: '+JSON.stringify(pos));
    assert.strictEqual(await p.$('[data-action="skipex"]'),null,'the last slide still offers Skip');
  });

  await t('finishing a session with nothing logged records nothing, and can be undone', async function(){
    var st0=seedOf();
    assert.ok(await tapIf('[data-action="finishworkout"]'),'no Finish on the last slide'); await settle();
    var st1=seedOf();
    assert.strictEqual(st1.workoutLogs.length,st0.workoutLogs.length,'an empty session was logged');
    assert.strictEqual(st1.totalXp,st0.totalXp,'an empty session paid XP');
    assert.strictEqual(st1.activeSession,null,'the empty session is still open');
    var d0=st0.days[st0.activeSession.startedAt]||null, d1=st1.days[st0.activeSession.startedAt]||null;
    assert.deepStrictEqual(d1,d0,'the day changed');
    assert.ok(await tapIf('[data-action="undo"]'),'no undo offer'); await settle();
    assert.deepStrictEqual(seedOf().activeSession,st0.activeSession,'the undo did not bring the session back');
  });

  await t('Back and Resume come back to the same slide', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    for(var k=0;k<3;k++) await next();
    var at=await storyPos();
    assert.strictEqual(at[0],4,'could not get to slide 4');
    var v=await p.$('input[id^="log-v-"]'); await v.fill('8');
    var w=await p.$('input[id^="log-w-"]'); if(w) await w.fill('20');
    await p.click('[data-action="logset"]'); await settle();
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    await p.click('[data-action="resumesession"]'); await p.waitForTimeout(400);
    var back=await storyPos();
    assert.strictEqual(back[0],4,'Resume opened slide '+back[0]);
    await leaveSession();
  });

  console.log('\nUNDOING A ROUND');
  var ssState=function(){ return p.evaluate(function(){
    var d=document.querySelector('.slide .target'), b=document.querySelector('[data-action="loground"]');
    return {target:d?d.textContent:'', button:b?b.textContent.trim():'', chips:document.querySelectorAll('.ssrow .setchip').length}; }); };
  var ssSetup=async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search'); await p.type('#ex-search','superset',{delay:25}); await p.waitForTimeout(450);
    await p.click('[data-action="addex"][data-id="superset"]'); await settle();
    await p.selectOption('.ssadd select','curl_bicep'); await p.click('[data-action="ssadd"]'); await settle();
    await p.selectOption('.ssadd select','row_bent'); await p.click('[data-action="ssadd"]'); await settle();
    await p.fill('#log-w-curl_bicep','15'); await p.fill('#log-v-curl_bicep','10');
    await p.fill('#log-w-row_bent','40'); await p.fill('#log-v-row_bent','8');
    await p.click('[data-action="loground"]'); await settle();
    var s=await ssState();
    assert.ok(/1 done/.test(s.target) && s.chips===2,'the round did not log: '+JSON.stringify(s));
  };

  await t('Undo round takes the whole round back', async function(){
    await ssSetup();
    assert.ok(await tapIf('[data-action="undoround"]'),'no Undo round button'); await settle();
    var s=await ssState();
    assert.ok(/0 done/.test(s.target),'after undo it reads "'+s.target+'"');
    assert.ok(/round 1/i.test(s.button),'the button offers "'+s.button+'"');
    assert.strictEqual(s.chips,0,'sets were left behind');
  });

  await t('undoing each member of a round one by one takes the round back too', async function(){
    await ssSetup();
    await p.click('[data-action="undoset"][data-ex="curl_bicep"]'); await settle();
    var s=await ssState();
    assert.ok(/1 done/.test(s.target),'half a round undone reads "'+s.target+'"');
    await p.click('[data-action="undoset"][data-ex="row_bent"]'); await settle();
    s=await ssState();
    assert.ok(/0 done/.test(s.target),'the whole round undone still reads "'+s.target+'"');
    assert.ok(/round 1/i.test(s.button),'the button offers "'+s.button+'"');
    await leaveSession();
  });

  console.log('\nADDING BY ROLE');
  var allTitles=async function(){
    for(var r=0;r<20;r++){ if(!(await tapIf('[data-action="prevslide"]:not([disabled])'))) break; await p.waitForTimeout(120); }
    var ts=[await slideTitle()];
    for(var i=0;i<20;i++){ if(!(await p.$('[data-action="nextslide"]'))) break; await next(); ts.push(await slideTitle()); }
    return ts;
  };
  await t('an exercise added to Swim goes before its own cool-down', async function(){
    await go(); await leaveSession(); await startWorkout('Swim');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','plank'); await p.waitForTimeout(400);
    await p.click('[data-action="addex"][data-id="plank"]'); await settle();
    var ts=await allTitles();
    assert.deepStrictEqual(ts.slice(-2),['Plank','Cool-down swim'],'order: '+ts.join(' > '));
    await leaveSession();
  });
  await t('a warm-up added back goes first, not before the cool-down', async function(){
    await go(); await leaveSession(); await startWorkout('Pull');
    await p.click('[data-action="removeex"][data-id="warmup"]'); await settle();
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','warm'); await p.waitForTimeout(400);
    await p.click('[data-action="addex"][data-id="warmup"]'); await settle();
    assert.strictEqual(await slideTitle(),'Warm-up','it did not land on the warm-up');
    var ts=await allTitles();
    assert.strictEqual(ts[0],'Warm-up','order: '+ts.join(' > '));
    await leaveSession();
  });

  console.log('\nCOMMA DECIMALS AND BAD INPUT');
  var chipsNow=function(){ return p.evaluate(function(){
    return [].slice.call(document.querySelectorAll('.slide .setchip')).map(function(c){ return c.textContent; }); }); };
  var invalid=function(sel){ return p.getAttribute(sel,'aria-invalid'); };

  await t('a comma decimal logs as a decimal, not ten times over', async function(){
    await go(); await leaveSession(); await startWorkout('Push');
    assert.ok(await toSlide('Bench press'),'never reached the bench press');
    // Typed a key at a time, as a phone keyboard does: a number box used to
    // drop the comma, so "22,5" was read as 225.
    // The boxes now start from last time's set, so they are emptied first.
    await p.fill('#log-w-press_bench',''); await p.click('#log-w-press_bench'); await p.keyboard.type('22,5');
    await p.fill('#log-v-press_bench',''); await p.click('#log-v-press_bench'); await p.keyboard.type('8');
    await p.click('[data-action="logset"]'); await settle();
    var c=await chipsNow();
    assert.deepStrictEqual(c,['22.5kg × 8'],'chips: '+c.join(' | '));
  });

  await t('a weight that is not a number logs nothing and is marked', async function(){
    await p.fill('#log-w-press_bench',''); await p.click('#log-w-press_bench'); await p.keyboard.type('abc');
    await p.fill('#log-v-press_bench',''); await p.click('#log-v-press_bench'); await p.keyboard.type('8');
    await p.click('[data-action="logset"]'); await settle();
    assert.strictEqual((await chipsNow()).length,1,'a set was logged from "abc"');
    assert.strictEqual(await invalid('#log-w-press_bench'),'true','the bad field is not marked');
    assert.strictEqual(await p.inputValue('#log-w-press_bench'),'abc','what was typed was thrown away');
  });

  await t('typing into a marked field clears the mark', async function(){
    await p.fill('#log-w-press_bench','25');
    assert.strictEqual(await invalid('#log-w-press_bench'),null,'still marked after a fix');
    await p.click('[data-action="logset"]'); await settle();
    assert.strictEqual((await chipsNow()).length,2,'the fixed set did not log');
  });

  await t('Log set with nothing typed says so rather than doing nothing', async function(){
    // The reps box starts from the last set now; empty it to test the refusal.
    await p.fill('#log-v-press_bench','');
    await p.click('[data-action="logset"]'); await p.waitForTimeout(300);
    assert.strictEqual(await invalid('#log-v-press_bench'),'true','the empty reps box is not marked');
    var focus=await p.evaluate(function(){ return document.activeElement&&document.activeElement.id; });
    assert.strictEqual(focus,'log-v-press_bench','focus went to '+focus);
    await settle();
    assert.strictEqual(await invalid('#log-v-press_bench'),'true','the mark did not survive a render');
    await p.keyboard.type('6');
    assert.strictEqual(await invalid('#log-v-press_bench'),null,'still marked after typing');
    await leaveSession();
  });

  var lastSauna=function(){ var s=seedOf().saunaSessions; return s[s.length-1]; };
  await t('a sauna temperature and minutes take a comma decimal too', async function(){
    await go(); await leaveSession();
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);
    var n=seedOf().saunaSessions.length;
    await p.click('#sauna-mins'); await p.keyboard.type('12,5');
    await p.click('#sauna-temp'); await p.keyboard.type('80,5');
    await p.click('[data-action="logsauna"]'); await settle();
    assert.strictEqual(seedOf().saunaSessions.length,n+1,'nothing was logged');
    assert.strictEqual(lastSauna().mins,12.5); assert.strictEqual(lastSauna().temp,80.5);
  });

  await t('a sauna temperature cleared after another stint is cleared', async function(){
    await p.fill('#sauna-mins','15'); await p.fill('#sauna-temp','80');
    await p.click('[data-action="addstint"]'); await p.waitForTimeout(300);
    await p.fill('#sauna-temp',''); await p.fill('#sauna-mins','10');
    await p.click('[data-action="logsauna"]'); await settle();
    assert.strictEqual(lastSauna().mins,25,'stints: '+JSON.stringify(lastSauna().stints));
    assert.strictEqual(lastSauna().temp,null,'the old temperature came back');
  });

  await t('a sauna temperature that is not a number refuses the log', async function(){
    var n=seedOf().saunaSessions.length;
    await p.fill('#sauna-mins','10'); await p.fill('#sauna-temp','hot');
    await p.click('[data-action="logsauna"]'); await settle();
    assert.strictEqual(seedOf().saunaSessions.length,n,'it logged anyway');
    assert.strictEqual(await invalid('#sauna-temp'),'true','the bad temperature is not marked');
    var focus=await p.evaluate(function(){ return document.activeElement&&document.activeElement.id; });
    assert.strictEqual(focus,'sauna-temp','focus went to '+focus+', not the box that refused it');
  });

  console.log('\nLAST TIME, WARM-UP SETS, REST AND THE WEEK');
  var finishNow=async function(){
    for(var k=0;k<30;k++){ if(!(await tapIf('[data-action="nextslide"]'))) break; await p.waitForTimeout(120); }
    assert.ok(await tapIf('[data-action="finishworkout"]'),'no Finish on the last slide'); await settle();
  };

  await t('a logged set prefills the next one, starts the rest clock, and can be marked a warm-up', async function(){
    await go(); await leaveSession(); await startWorkout('Push');
    assert.ok(await toSlide('Bench press'),'never reached the bench press');
    await p.fill('#log-w-press_bench','20'); await p.fill('#log-v-press_bench','10');
    await p.click('[data-action="logset"]'); await settle();
    assert.deepStrictEqual([await p.inputValue('#log-w-press_bench'),await p.inputValue('#log-v-press_bench')],['20','10'],
      'the boxes did not start from the set just logged');
    var rest=await p.evaluate(function(){ var r=document.getElementById('restline'); return r?r.textContent:''; });
    assert.ok(/^Rest 0:0\d \/ 2:30$/.test(rest),'rest line: '+rest);
    await p.click('[data-action="togglewu"][data-i="0"]'); await settle();
    var chip=await p.evaluate(function(){ var c=document.querySelector('[data-action="togglewu"][data-i="0"]'); return c?[c.textContent,c.getAttribute('aria-pressed')]:null; });
    assert.deepStrictEqual(chip,['Warm-up 20kg × 10','true']);
    assert.strictEqual(seedOf().activeSession.logs.press_bench[0].wu,true,'the warm-up mark was not saved');
    assert.ok(seedOf().activeSession.logs.press_bench[0].t>0,'the set has no time');
    await p.fill('#log-w-press_bench','60'); await p.fill('#log-v-press_bench','8');
    await p.click('[data-action="logset"]'); await settle();
    await finishNow();
    var l=seedOf().workoutLogs; l=l[l.length-1];
    assert.ok(l.durationMin>=1,'no session length: '+l.durationMin);
  });

  await t('next time the lift says what was done, without the warm-up, and starts from it', async function(){
    await startWorkout('Push');
    assert.ok(await toSlide('Bench press'),'never reached the bench press');
    var line=await p.evaluate(function(){ var e=document.querySelector('.slide .lasttime'); return e?e.textContent:''; });
    assert.ok(/^Last time: 60kg × 8\./.test(line),'last time line: '+line);
    assert.ok(/Aim for 8 on every set|try \+2\.5kg/.test(line),'no progression hint: '+line);
    assert.deepStrictEqual([await p.inputValue('#log-w-press_bench'),await p.inputValue('#log-v-press_bench')],['60','8']);
    await leaveSession();
  });

  await t('the workout card says when it was last done, and the week counts it', async function(){
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350);
    var meta=await p.evaluate(function(){
      var c=[].slice.call(document.querySelectorAll('.wcard')).filter(function(x){ return x.querySelector('h4').textContent.trim()==='Push'; })[0];
      return c?c.querySelector('.meta').textContent:''; });
    assert.ok(/last done today/.test(meta),'card meta: '+meta);
    var wk=await p.evaluate(function(){ var e=document.querySelector('.weekgoal'); return e?e.textContent:''; });
    assert.ok(/Last 7 days: \d+ of 3 sessions/.test(wk),'weekly line: '+wk);
    await p.click('[data-action="weektarget"][data-d="1"]'); await settle();
    assert.strictEqual(seedOf().weekTarget,4,'the weekly target did not save');
  });

  await t('the water target can be changed from the Water card, inside 1-5L', async function(){
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);
    var w0=seedOf().waterTarget;
    await p.click('[data-action="watertarget"][data-d="1"]'); await settle();
    assert.strictEqual(seedOf().waterTarget,Math.min(20,w0+1));
    for(var k=0;k<20;k++){ await p.click('[data-action="watertarget"][data-d="-1"]'); await p.waitForTimeout(40); }
    await settle();
    assert.strictEqual(seedOf().waterTarget,4,'the target went below 1L');
  });

  await t('yesterday not logged is offered once, and waved off for good', async function(){
    var yk=await p.evaluate(function(){ var d=new Date(); d.setDate(d.getDate()-1);
      return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); });
    var lo=await p.evaluate(function(){ var d=new Date(); d.setDate(d.getDate()-13);
      return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); });
    var days=seedOf().days, yd=days[yk], shown=!!(await p.$('.nudge'));
    // Only a gap in logging that is going on: something logged before it, recently.
    var before=Object.keys(days).some(function(k){ return k<yk && k>=lo && days[k].touched; });
    assert.strictEqual(shown,!(yd&&yd.touched)&&before,'nudge shown: '+shown+', yesterday: '+JSON.stringify(yd)+', logged before it: '+before);
    if(!shown) return;
    await p.click('.nudge [data-action="pickday"]'); await p.waitForTimeout(300);
    assert.ok(await p.$('.backfill-bar'),'Log yesterday did not switch to yesterday');
    assert.strictEqual(await p.$('.nudge'),null,'the nudge stayed while logging yesterday');
    await p.click('.backfill-bar [data-action="today"]'); await p.waitForTimeout(300);
    await p.click('.nudge [data-action="nudgeoff"]'); await p.waitForTimeout(300);
    assert.strictEqual(await p.$('.nudge'),null,'Nothing to log did not dismiss it');
    await go();
    assert.strictEqual(await p.$('.nudge'),null,'the dismissal did not survive a reload');
  });

  await t('a day with something used reads as used, in a neutral colour, never flagged', async function(){
    var cls=await p.evaluate(function(){ return document.body.innerHTML.indexOf('flagged'); });
    assert.strictEqual(cls,-1,'"flagged" is still in the page');
    var note=await text();
    assert.ok(!/resets/.test(note),'the reset copy is still there');
  });

  console.log('\nSTARTING, RESUMING AND THE DAY A SESSION IS FOR');
  var dayKey=function(o){ return p.evaluate(function(oo){ var d=new Date(); d.setDate(d.getDate()-oo);
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); },o); };
  var pretty=function(k){ return p.evaluate(function(kk){ return new Date(kk+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); },k); };
  var storyTitle=function(){ return p.evaluate(function(){ var h=document.querySelector('.story-title'); return h?h.textContent:''; }); };
  var banner=function(){ return p.evaluate(function(){ var b=document.querySelector('.resume-banner'); return b?b.textContent:''; }); };
  var cardButton=function(title){ return p.evaluate(function(want){
    var c=[].slice.call(document.querySelectorAll('.wcard')).filter(function(x){ return x.querySelector('h4').textContent.trim()===want; })[0];
    var b=c&&c.querySelector('[data-action="startworkout"]'); return b?b.textContent.trim():''; },title); };
  var logBench=async function(n){
    assert.ok(await toSlide('Bench press'),'never reached the bench press');
    for(var i=0;i<n;i++){ await p.fill('#log-w-press_bench','40'); await p.fill('#log-v-press_bench','8');
      await p.click('[data-action="logset"]'); await settle(); }
  };
  var lastLog=function(){ var l=seedOf().workoutLogs; return l[l.length-1]; };
  var toTraining=async function(){ await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(350); };

  await t('Start on a workout left open days ago starts it today, and the banner said when it was from', async function(){
    await go(); await leaveSession();
    var today=await dayKey(0), old=await dayKey(4), st=seedOf();
    st.activeSession={workoutId:'w6',startedAt:old,t0:new Date(old+'T18:00:00').getTime(),exIds:['press_bench','press_ohp'],
      targets:{press_bench:{sets:4,reps:'8'},press_ohp:{sets:3,reps:'8'}},logs:{}};
    st.workoutLogs=st.workoutLogs.filter(function(l){ return l.date!==today; });
    if(st.days[today]) st.days[today].workout={done:false,type:null};
    var oldDay=JSON.stringify(st.days[old]||null);
    doc=env.withSeed(doc,st); await go();
    var back=await p.$('[data-action="cancelsession"]'); if(back){ await back.click(); await p.waitForTimeout(400); }
    await toTraining();
    var bn=await banner();
    await startWorkout('Push');
    assert.ok(!/ for /.test(await storyTitle()),'the new session is not for today: '+(await storyTitle()));
    await logBench(1); await finishNow();
    var l=lastLog();
    assert.strictEqual(l.date,today,'the sets were logged on '+l.date);
    assert.ok(seedOf().days[today].workout.done,'today is not marked trained');
    assert.strictEqual(JSON.stringify(seedOf().days[old]||null),oldDay,'the old day changed');
    assert.ok(bn.indexOf('from '+(await pretty(old)))>-1,'the banner did not say the session was from '+old+': '+bn);
  });

  await t('a session resumed after picking another day names the day Finish writes, not the picked one', async function(){
    await go(); await leaveSession();
    var today=await dayKey(0), yk=await dayKey(1);
    await startWorkout('Push'); await logBench(1);
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);
    await p.click('[data-action="pickday"][data-k="'+yk+'"]'); await p.waitForTimeout(350);
    await toTraining(); await p.click('[data-action="resumesession"]'); await p.waitForTimeout(400);
    var shown=await p.evaluate(function(){ var b=document.querySelector('.backfill-bar'); return b?b.textContent:''; });
    assert.strictEqual(shown,'','the session says: '+shown);
    assert.ok(!/ for /.test(await storyTitle()),'title: '+(await storyTitle()));
    var n0=seedOf().workoutLogs.length;
    await finishNow();
    assert.strictEqual(seedOf().workoutLogs.length,n0+1,'no log written');
    assert.strictEqual(lastLog().date,today,'Finish wrote '+lastLog().date);
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(300);
    var tb=await p.$('.backfill-bar [data-action="today"]'); if(tb){ await tb.click(); await p.waitForTimeout(300); }
  });

  await t('a session started for an earlier day keeps naming that day after Back to today', async function(){
    await go(); await leaveSession();
    var yk=await dayKey(1), py=await pretty(yk);
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);
    await p.click('[data-action="pickday"][data-k="'+yk+'"]'); await p.waitForTimeout(350);
    await startWorkout('Push');
    assert.ok((await storyTitle()).indexOf('for '+py)>-1,'title: '+(await storyTitle()));
    assert.strictEqual(await p.$('.backfill-bar'),null,'a Back to today that cannot move the session is offered in it');
    await logBench(2);
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await p.click('.backfill-bar [data-action="today"]'); await p.waitForTimeout(350);
    await toTraining();
    assert.ok((await banner()).indexOf('from '+py)>-1,'banner: '+(await banner()));
    await p.click('[data-action="resumesession"]'); await p.waitForTimeout(400);
    assert.ok((await storyTitle()).indexOf('for '+py)>-1,'after Back to today the title is: '+(await storyTitle()));
    await finishNow();
    assert.strictEqual(lastLog().date,yk,'Finish wrote '+lastLog().date);
  });

  await t('a session typed in for an earlier day records no length', async function(){
    await go(); await leaveSession();
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(350);
    await p.click('[data-action="pickday"][data-k="'+(await dayKey(1))+'"]'); await p.waitForTimeout(350);
    await startWorkout('Push'); await logBench(2); await finishNow();
    var tb=await p.$('.backfill-bar [data-action="today"]'); if(tb){ await tb.click(); await p.waitForTimeout(300); }
    var l=lastLog();
    assert.strictEqual(l.date,await dayKey(1),'logged on '+l.date);
    assert.strictEqual(l.durationMin,undefined,'the data-entry time was kept as its length: '+l.durationMin);
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);
    var row=await p.evaluate(function(d){ var r=[].slice.call(document.querySelectorAll('.swipe')).filter(function(x){ return x.textContent.indexOf(d)>-1 && /Push/.test(x.textContent); })[0];
      return r?r.innerText:''; },l.date);
    assert.ok(row,'no Recent sessions row for '+l.date);
    assert.ok(!/\d+ min/.test(row),'the row shows minutes: '+row);
  });

  await t('Start after discarding a session by mistake still offers Undo, and Undo brings its sets back', async function(){
    await go(); await leaveSession(); await startWorkout('Push'); await logBench(3);
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await toTraining();
    await p.click('[data-action="discardsession"]'); await settle();
    await startWorkout('Push');
    assert.ok(await p.$('.undo-bar [data-action="undo"]'),'Undo went when the card was started');
    await p.click('.undo-bar [data-action="undo"]'); await settle();
    var s=seedOf().activeSession;
    assert.strictEqual(s&&setCount(s.logs),3,'the session came back as '+JSON.stringify(s&&s.logs));
    await leaveSession();
  });
  function setCount(logs){ var n=0; Object.keys(logs||{}).forEach(function(k){ n+=logs[k].length; }); return n; }

  await t('Start on another workout keeps a built session it replaces for Undo', async function(){
    await go(); await leaveSession(); await startWorkout('Own session');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.fill('#ex-search','cable fly'); await p.waitForTimeout(400);
    await p.click('[data-action="addex"][data-id="fly_cable"]'); await settle();
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(350);
    await p.click('#ex-search'); await p.type('#ex-search','superset',{delay:35}); await p.waitForTimeout(500);
    await p.click('[data-action="addex"][data-id="superset"]'); await settle();
    await p.selectOption('.ssadd select','press_bench'); await p.click('[data-action="ssadd"]'); await settle();
    var built=seedOf().activeSession;
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await startWorkout('Push');
    assert.strictEqual(seedOf().activeSession.workoutId,'w6','Push did not start');
    assert.ok(await p.$('.undo-bar [data-action="undo"]'),'no Undo for the session it replaced');
    await p.click('.undo-bar [data-action="undo"]'); await settle();
    var s=seedOf().activeSession;
    assert.strictEqual(s.workoutId,'w17','Undo left '+s.workoutId);
    assert.deepStrictEqual(s.exIds,built.exIds); assert.deepStrictEqual(s.supersets,built.supersets);
    await leaveSession();
  });

  await t('the card of the workout in progress says Resume and keeps the slide', async function(){
    await go(); await leaveSession(); await startWorkout('Push');
    for(var k=0;k<3;k++) await next();
    assert.strictEqual((await storyPos())[0],4,'could not get to slide 4');
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(400);
    await toTraining();
    assert.strictEqual(await cardButton('Push'),'Resume');
    assert.strictEqual(await cardButton('Pull'),'Start');
    await startWorkout('Push');
    assert.strictEqual((await storyPos())[0],4,'the card opened slide '+(await storyPos())[0]);
    await leaveSession();
  });

  await t('no page errors', function(){
    assert.deepStrictEqual(errs,[],errs.join(' | '));
  });

  await b.close(); srv.close();
  console.log(fails?('\n'+fails+' FAILING'):'\nAll session checks pass.');
  process.exit(fails?1:0);
});
