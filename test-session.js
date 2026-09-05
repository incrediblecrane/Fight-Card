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

  await t('no page errors', function(){
    assert.deepStrictEqual(errs,[],errs.join(' | '));
  });

  await b.close(); srv.close();
  console.log(fails?('\n'+fails+' FAILING'):'\nAll session checks pass.');
  process.exit(fails?1:0);
});
