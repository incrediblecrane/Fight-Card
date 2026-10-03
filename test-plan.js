// The meal planner. A planned meal is its own entity: a recipe, a real date,
// a slot and its own portions. The model it replaced held a tick and one
// weekday name on the recipe, which could not say "this meal, twice" at all.
// Everything below is a thing the old shape could not do.
var http=require('http'),fs=require('fs'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.localOnly(env.readDoc());

/* The seed ships with every recipe inPlan:false, so nothing in it exercises
   the migration off the old shape. Tick one before the page ever loads, which
   is the state a real user's store is in. This is what caught migratePlan()
   running before SLOTS and WEEKDAY_INDEX were assigned: it threw, and the app
   rendered a blank page. */
var MIGRATED_ID='r6';
(function seedOldShape(){
  var st=env.seedOf(doc);
  var hit=st.recipes.filter(function(r){return r.id===MIGRATED_ID;})[0];
  if(!hit) throw new Error('seed has no recipe '+MIGRATED_ID+' to plan');
  hit.inPlan=true; hit.day='Thu';
  doc=env.withSeed(doc,st);
})();
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
  var p=await b.newPage({viewport:{width:420,height:900}});
  p.setDefaultTimeout(9000);
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  var published=()=>doc;
  var fails=0, ok=m=>console.log('  PASS  '+m), bad=(m,e)=>{fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  var t=async(name,fn)=>{ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };

  await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForTimeout(500);
  var back=await p.$('[data-action="cancelsession"]'); if(back){await back.click(); await p.waitForTimeout(400);}
  // Guarded: if the migration threw, the page is blank and there is no tab to
  // click. Crashing the harness here would hide which check was failing.
  var mealsTab=await p.$('[data-action="tab"][data-tab="meals"]');
  if(mealsTab){ await mealsTab.click(); await p.waitForTimeout(500); }

  // The seven option values are the seven real dates the calendar shows.
  // A box gets the rest of the week as it is reached, as by a finger or Tab.
  if(await p.$('[data-action="planday"]')) await p.focus('[data-action="planday"]');
  var dates=await p.evaluate(function(){
    var sel=document.querySelector('[data-action="planday"]');
    return sel?[].slice.call(sel.options).map(function(o){return o.value;}):[];
  });
  // Read the calendar back the way it is shown: day label -> the meals under it.
  var calendar=()=>p.evaluate(function(){
    return [].slice.call(document.querySelectorAll('.calday')).map(function(d){
      return {day:d.querySelector('.cd-n').textContent,
              meals:[].slice.call(d.querySelectorAll('.mealrow')).map(function(m){
                return {slot:m.querySelector('.slot').textContent,
                        title:m.querySelector('.mt').textContent,
                        portions:+m.querySelector('.mp b').textContent,
                        id:m.querySelector('[data-action="delmeal"]').getAttribute('data-id')};
              })};
    });
  });
  var shop=()=>p.evaluate(function(){
    return [].slice.call(document.querySelectorAll('.shop .shop-t')).map(function(e){return e.textContent;});
  });
  var plan=async function(id,dayIndex,slot){
    await p.focus('[data-action="planday"][data-id="'+id+'"]');
    await p.selectOption('[data-action="planday"][data-id="'+id+'"]', dates[dayIndex]);
    if(slot){ await p.focus('[data-action="planslot"][data-id="'+id+'"]');
      await p.selectOption('[data-action="planslot"][data-id="'+id+'"]', slot); }
    await p.click('[data-action="addmeal"][data-id="'+id+'"]');
    await p.waitForTimeout(1700);
  };
  var mealsOf=function(cal,dayIndex){ return cal[dayIndex].meals; };
  var find=function(cal,title){
    var hits=[];
    cal.forEach(function(d,i){ d.meals.forEach(function(m){ if(m.title===title) hits.push({day:i,meal:m}); }); });
    return hits;
  };
  var titleOf=async function(id){ return p.evaluate(function(i){
    var b=document.querySelector('[data-action="addmeal"][data-id="'+i+'"]');
    return b.closest('.libitem').querySelector('h4').textContent; }, id); };

  console.log('\nA WEEK IS SEVEN REAL DAYS');

  await t('the app starts at all with a recipe already in the old plan shape', async function(){
    // migratePlan() reads SLOTS and WEEKDAY_INDEX. Those are var assignments
    // near the bottom of the file, so calling it during module init left them
    // undefined: it threw on exactly the data it exists to convert and the
    // whole app rendered blank.
    var boot=await p.evaluate(function(){
      return {app:!!document.querySelector('.wrap'), cal:!!document.querySelector('.cal')};
    });
    assert.ok(boot.app,'the app did not render');
    assert.ok(boot.cal,'the calendar did not render');
    assert.deepStrictEqual(errs,[],'the page threw: '+errs.join(' | '));
  });

  await t('and the old-shape recipe arrives as a meal on its weekday', async function(){
    var title=await titleOf(MIGRATED_ID);
    var cal=await calendar();
    var hits=find(cal,title);
    assert.strictEqual(hits.length,1,'migrated to '+hits.length+' meal(s)');
    assert.strictEqual(hits[0].meal.slot,'Dinner','it landed in '+hits[0].meal.slot);
    assert.strictEqual(new Date(dates[hits[0].day]+'T00:00:00').getDay(),4,
      'Thursday migrated to '+dates[hits[0].day]);
  });

  await t('the calendar shows seven rolling days starting today', async function(){
    assert.strictEqual(dates.length,7,'day picker offers '+dates.length+' days');
    var cal=await calendar();
    assert.strictEqual(cal.length,7,'calendar drew '+cal.length+' days');
    assert.strictEqual(cal[0].day,'Today','first day is '+cal[0].day);
    assert.strictEqual(cal[1].day,'Tomorrow','second day is '+cal[1].day);
    // Real dates, consecutive, so the list can be asked about a range.
    for(var i=1;i<7;i++){
      var gap=(new Date(dates[i]+'T00:00:00')-new Date(dates[i-1]+'T00:00:00'))/86400000;
      assert.strictEqual(gap,1,'days '+dates[i-1]+' and '+dates[i]+' are not consecutive');
    }
  });

  console.log('\nTHE SAME MEAL, TWICE');

  var chilli=await titleOf('p2');

  await t('a recipe planned on two days appears on both, not moved to the second', async function(){
    // The whole reason for the new model. The old one held one weekday on the
    // recipe, so planning it again just moved it and the first day emptied.
    await plan('p2',0,'dinner');
    await plan('p2',3,'dinner');
    var cal=await calendar();
    var hits=find(cal,chilli);
    assert.strictEqual(hits.length,2,'planned twice, found '+hits.length+' time(s)');
    assert.deepStrictEqual(hits.map(function(h){return h.day;}),[0,3],
      'the two meals are on days '+hits.map(function(h){return h.day;}).join(' and '));
  });

  await t('each one carries its own portions', async function(){
    var cal=await calendar();
    var mondayId=find(cal,chilli)[0].meal.id;
    await p.click('[data-action="mealportions"][data-id="'+mondayId+'"][data-d="1"]');
    await p.waitForTimeout(1700);
    cal=await calendar();
    var hits=find(cal,chilli);
    assert.strictEqual(hits[0].meal.portions, hits[1].meal.portions+1,
      'portions are '+hits[0].meal.portions+' and '+hits[1].meal.portions+', they should differ by one');
  });

  await t('and the shopping list buys for both, not for one', async function(){
    var rows=await shop();
    var mince=rows.filter(function(r){return /^Beef mince/.test(r);});
    assert.strictEqual(mince.length,1,'mince is spread over '+mince.length+' rows');
    // Two meals at 6 and 5 portions of a 5-portion recipe using 750g.
    var grams=+(mince[0].match(/([\d.]+)kg/)||[])[1]*1000 || +(mince[0].match(/([\d.]+)g/)||[])[1];
    var oneBatch=750;
    assert.ok(grams>oneBatch*2, 'the list bought '+grams+'g, about one batch: the second meal was not counted');
  });

  console.log('\nA DAY HAS SLOTS');

  await t('three meals on one day sit in breakfast, lunch and dinner order', async function(){
    await plan('p1',1,'breakfast');
    await plan('p3',1,'lunch');
    await plan('p2',1,'dinner');
    var cal=await calendar();
    // Only the three this check planned. The migration fixture at the top of
    // this file lands its meal on the next Thursday, which IS day one whenever
    // the suite runs on a Wednesday, so reading the whole day made this fail
    // one day in seven for a reason that has nothing to do with slots.
    var mine=[await titleOf('p1'), await titleOf('p3'), await titleOf('p2')];
    var slots=mealsOf(cal,1).filter(function(m){ return mine.indexOf(m.title)>-1; })
                            .map(function(m){ return m.slot; });
    assert.deepStrictEqual(slots,['Breakfast','Lunch','Dinner'],
      'tomorrow reads '+mealsOf(cal,1).map(function(m){return m.slot;}).join(' / '));
  });

  console.log('\nSHOPPING FOR PART OF THE WEEK');

  await t('a meal beyond the next three days is left out of a three-day shop', async function(){
    // Only a real date can answer this. A weekday name cannot be compared to
    // "between today and Wednesday". Salmon is planned on day five and nowhere
    // else, so it is the ingredient that has to disappear.
    await plan('r4',5,'dinner');
    var wholeWeek=await shop();
    assert.ok(wholeWeek.some(function(r){return /^Salmon/.test(r);}),
      'the salmon is not in the whole-week list to begin with: '+wholeWeek.join(' | '));
    await p.click('[data-action="shoprange"][data-n="3"]'); await p.waitForTimeout(600);
    var threeDays=await shop();
    assert.ok(!threeDays.some(function(r){return /^Salmon/.test(r);}),
      'a meal five days out was bought for a three-day shop: '+threeDays.join(' | '));
    assert.ok(threeDays.some(function(r){return /^Beef mince/.test(r);}),
      'the three-day shop dropped a meal that IS inside the window');
  });

  await t('switching back to the whole week brings it back', async function(){
    await p.click('[data-action="shoprange"][data-n="7"]'); await p.waitForTimeout(600);
    var rows=await shop();
    assert.ok(rows.some(function(r){return /^Salmon/.test(r);}),'the salmon did not come back');
  });

  console.log('\nREMOVING');

  await t('removing one meal leaves the other copy alone', async function(){
    var cal=await calendar();
    var hits=find(cal,chilli);
    assert.ok(hits.length>=2,'need two copies to test this');
    var goneId=hits[0].meal.id;
    await p.click('[data-action="delmeal"][data-id="'+goneId+'"]'); await p.waitForTimeout(1700);
    cal=await calendar();
    var left=find(cal,chilli);
    assert.ok(left.every(function(h){return h.meal.id!==goneId;}),'the removed meal is still there');
    assert.ok(left.length>=1,'removing one copy took the others with it');
  });

  await t('deleting a recipe takes its planned meals with it', async function(){
    // Otherwise the week shows meals whose recipe is gone and the shopping
    // list quietly stops counting them while they still look planned.
    var before=(await calendar()).reduce(function(a,d){return a+d.meals.length;},0);
    await p.click('[data-action="delrecipe"][data-id="p2"]'); await p.waitForTimeout(1700);
    var cal=await calendar();
    assert.strictEqual(find(cal,chilli).length,0,'the deleted recipe is still planned');
    assert.ok(cal.reduce(function(a,d){return a+d.meals.length;},0)<before,'nothing was removed');
    assert.ok(!(await p.evaluate(function(){return document.body.innerText;})).match(/recipe removed/),
      'an orphaned meal is on screen');
  });

  console.log('\nCLEARING');

  await t('the button says which days it will clear', async function(){
    var whole=await p.evaluate(function(){
      var b=document.querySelector('[data-action="clearweek"]'); return b?b.textContent:''; });
    assert.ok(/week/i.test(whole),'the whole-week button reads "'+whole+'"');
    await p.click('[data-action="shoprange"][data-n="3"]'); await p.waitForTimeout(600);
    var three=await p.evaluate(function(){
      var b=document.querySelector('[data-action="clearweek"]'); return b?b.textContent:''; });
    assert.ok(/3 days/.test(three),'the three-day button reads "'+three+'"');
    await p.click('[data-action="shoprange"][data-n="7"]'); await p.waitForTimeout(600);
  });

  await t('clearing while scoped to three days spares the meals it is not showing', async function(){
    // The button sits under a list scoped by the range picker. Clearing meals
    // days out that are not on screen is not undoable and is not what was asked.
    var salmon=await titleOf('r4');   // planned on day five earlier
    var before=await calendar();
    assert.ok(find(before,salmon).length,'the far meal is not planned, so this proves nothing');
    var inside=function(cal){ return cal.slice(0,3).reduce(function(a,d){return a+d.meals.length;},0); };
    assert.ok(inside(before),'nothing inside the three-day window to clear');
    await p.click('[data-action="shoprange"][data-n="3"]'); await p.waitForTimeout(600);
    await p.click('[data-action="clearweek"]'); await p.waitForTimeout(1800);
    var after=await calendar();
    assert.ok(find(after,salmon).length,'a meal five days out was cleared while looking at three');
    assert.strictEqual(inside(after),0,'the days actually in view were not cleared');
    await p.click('[data-action="shoprange"][data-n="7"]'); await p.waitForTimeout(600);
  });

  console.log('\nIT SURVIVES A RELOAD');

  await t('the plan comes back after a reload', async function(){
    var before=await calendar();
    await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1200);
    var tab=await p.$('[data-action="tab"][data-tab="meals"]');
    if(tab){ await tab.click(); await p.waitForTimeout(500); }
    var after=await calendar();
    assert.deepStrictEqual(after.map(function(d){return d.meals.length;}),
                           before.map(function(d){return d.meals.length;}),
                           'the week came back a different shape');
  });

  await t('nothing still carries the old inPlan/day fields', async function(){
    assert.ok(JSON.stringify(env.seedOf(published())).indexOf('"inPlan"')<0,'a recipe is still storing inPlan');
    assert.ok(JSON.stringify(env.seedOf(published())).indexOf('"day":"Mon"')<0,'a recipe is still storing a weekday');
  });

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll planner checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
