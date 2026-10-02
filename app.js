(()=>{const head=document.head;if(!head.querySelector('[data-koa-favicon-package]')){const links=[['icon','image/png','16x16','/favicon-16x16.png'],['icon','image/png','32x32','/favicon-32x32.png'],['icon','image/png','48x48','/favicon-48x48.png'],['apple-touch-icon','', '180x180','/apple-touch-icon.png'],['manifest','','','/site.webmanifest']];links.forEach(([rel,type,sizes,href],i)=>{const l=document.createElement('link');l.rel=rel;if(type)l.type=type;if(sizes)l.sizes=sizes;l.href=href;if(i===0)l.dataset.koaFaviconPackage='1';head.appendChild(l)})}})();(()=>{const icon='/koa-mobile-bar-icon.png';document.querySelectorAll('a.brand').forEach(a=>{a.innerHTML='<span class="brand-medallion" aria-hidden="true"><img class="brand-icon" src="'+icon+'" alt="" width="68" height="68"></span><span class="brand-copy"><span class="brand-name">Koa’s Mobile Bar</span><span class="brand-meta">Hawaiʻi Island</span></span>'});document.querySelectorAll('.footer-brand').forEach(el=>{const p=el.querySelector('p');const tagline=p?p.textContent:'Good drinks bring great people together.';el.innerHTML='<div class="footer-brand-lockup"><span class="footer-medallion" aria-hidden="true"><img src="'+icon+'" alt="" width="76" height="76"></span><div><strong>Koa’s Mobile Bar</strong><span>Hawaiʻi Island</span></div></div><p>'+tagline+'</p>'})})();const header=document.querySelector('.site-header');if(header){let scrollTick=false;const syncHeader=()=>{header.classList.toggle('scrolled',scrollY>48);scrollTick=false};syncHeader();addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(syncHeader)}},{passive:true})}const menu=document.querySelector('.menu'),nav=document.querySelector('#nav');if(menu&&nav){const closeMenu=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')};menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open);document.body.classList.toggle('menu-open',open&&matchMedia('(max-width:900px)').matches)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});addEventListener('resize',()=>{if(innerWidth>900)closeMenu()},{passive:true})}const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();const box=document.querySelector('#lightbox');if(box){const boxImg=box.querySelector('img');document.querySelectorAll('.photo,[data-lightbox]').forEach(b=>b.addEventListener('click',()=>{boxImg.src=b.dataset.src||b.dataset.lightbox;box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open')}));const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open');boxImg.src=''};box.querySelector('button')?.addEventListener('click',close);box.addEventListener('click',e=>{if(e.target===box)close()});addEventListener('keydown',e=>{if(e.key==='Escape')close()})}const filters=document.querySelectorAll('.filter-btn');const cards=document.querySelectorAll('.gallery-card');filters.forEach(btn=>btn.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;cards.forEach(card=>card.hidden=!(f==='all'||card.dataset.category===f))}));

const KoaConversion=(()=>{
 const endpoint='/api/mobile-bar-analytics',key='koa-mobile-bar-session-v1';
 const pkg=id=>['mobile-oahu','mobile-maui','mobile-big-island','mobile-custom'].includes(String(id||''))?String(id):'';
 const makeId=()=>{try{return crypto.randomUUID()}catch{return 'evt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}};
 let sessionId='';try{sessionId=sessionStorage.getItem(key)||'';if(!sessionId){sessionId=makeId();sessionStorage.setItem(key,sessionId)}}catch{sessionId=makeId()}
 let stageName='browse',engaged=false,submitted=false,currentPackage='',lastGuests=0;const onceKeys=new Set();
 const clean=(v,n=180)=>String(v??'').slice(0,n);
 const placement=el=>el?.closest('.site-header')?'header':el?.closest('.landing-proof-strip')?'landing-proof':el?.closest('.inline-cta')?'inline-cta':el?.closest('.package-grid')?'package-cards':el?.closest('.package-compare')?'package-comparison':el?.closest('.quote-calculator')?'quote-calculator':'page';
 function track(type,data={}){const payload={eventId:makeId(),sessionId,type:clean(type,64),page:clean(location.pathname,180),referrerHost:(()=>{try{return document.referrer?new URL(document.referrer).hostname:''}catch{return''}})(),stage:clean(data.stage||stageName,64),packageId:pkg(data.packageId||currentPackage),placement:clean(data.placement||'',80),guestCount:Number.isFinite(Number(data.guestCount))?Math.max(0,Math.min(1000,Math.round(Number(data.guestCount)))):0,estimatedTotal:Number.isFinite(Number(data.estimatedTotal))?Math.max(0,Math.min(1000000,Math.round(Number(data.estimatedTotal)*100)/100)):0,recordId:clean(data.recordId||'',100),clientAt:new Date().toISOString()};fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{})}
 function once(k,t,d={}){if(onceKeys.has(k))return;onceKeys.add(k);track(t,d)}
 function stage(name,d={}){stageName=clean(name,64)||stageName;engaged=true;if(d.packageId)currentPackage=pkg(d.packageId);if(Number(d.guestCount)>0)lastGuests=Math.round(Number(d.guestCount))}
 function complete(d={}){submitted=true;stage('submitted',d);track('quote_submit_success',{...d,stage:'submitted'})}
 document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;const href=String(link.getAttribute('href')||'');if(href.includes('#inquire')||href.includes('#packages'))track('cta_click',{placement:placement(link)})});
 addEventListener('pagehide',()=>{if(engaged&&!submitted)track('quote_abandon',{stage:stageName,packageId:currentPackage,guestCount:lastGuests})});
 track('page_view',{stage:'browse'});
 return{track,once,stage,complete,placement,setPackage:id=>{currentPackage=pkg(id)},setGuestCount:n=>{lastGuests=Math.max(0,Math.min(1000,Math.round(Number(n)||0)))}};
})();
window.KoaConversion=KoaConversion;

;(()=>{const form=document.querySelector('[data-mobile-quote-form]');if(!form)return;
const packagePrices={'mobile-oahu':1500,'mobile-maui':2000,'mobile-big-island':2500,'mobile-custom':0};
const packageNames={'mobile-oahu':'Oahu Package','mobile-maui':'Maui Package','mobile-big-island':'Big Island Package','mobile-custom':'Custom / bartender-only'};
const extraGuestRates={'mobile-oahu':10,'mobile-maui':12,'mobile-big-island':15,'mobile-custom':0};
const packageMeta={
 'mobile-oahu':{name:'Oahu Package',base:1500,detail:'Classic beer, champagne and wine · up to 100 guests · 4 hours included'},
 'mobile-maui':{name:'Maui Package',base:2000,detail:'Recommended start · adds 2 signature drinks · up to 100 guests · 4 hours included'},
 'mobile-big-island':{name:'Big Island Package',base:2500,detail:'Premium · adds mixed cocktail service · up to 100 guests · 4 hours included'},
 'mobile-custom':{name:'Custom / bartender-only',base:0,detail:'Custom service scope · final pricing confirmed with your proposal'}
};
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v||0));
const wholeMoney=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v||0));
const conversion=window.KoaConversion;
const compareRoot=document.querySelector('[data-package-comparison]');
let compareGuestInput=null,compareGuestSummary=null;
if(compareRoot){
 const tableWrap=compareRoot.querySelector('.package-table-wrap');
 if(tableWrap&&!compareRoot.querySelector('[data-compare-guest-count]')){
  const controls=document.createElement('div');controls.className='package-compare-controls';controls.innerHTML='<label for="compare-guest-count"><span>Guest count</span><input id="compare-guest-count" data-compare-guest-count type="number" min="1" max="1000" step="1" inputmode="numeric" value="100"><small>Up to 100 guests are included in every package.</small></label><div><strong data-compare-guest-summary>100 guests</strong><p>Package subtotal includes the base package and additional-guest service. Staffing, travel, gratuity and add-ons update in the full estimate.</p></div>';compareRoot.insertBefore(controls,tableWrap);
  document.querySelectorAll('[data-select-package]').forEach(button=>{const id=String(button.dataset.selectPackage||''),th=button.closest('th'),price=th?.querySelector('strong');if(!th||!price||!packagePrices[id])return;price.dataset.compareTotal=id;const label=document.createElement('small');label.className='compare-total-label';label.textContent='Your package subtotal';th.insertBefore(label,price);const badge=[...th.querySelectorAll('small')].find(el=>el!==label&&/Recommended|Premium/i.test(el.textContent||''));if(badge)badge.classList.add('compare-badge');const extra=document.createElement('small');extra.dataset.compareExtra=id;extra.textContent='100 guests included';th.insertBefore(extra,button)});
 }
 compareGuestInput=compareRoot.querySelector('[data-compare-guest-count]');compareGuestSummary=compareRoot.querySelector('[data-compare-guest-summary]');
}
function updateComparisonTotals(raw,{syncForm=false,track=false}={}){
 const guests=Math.max(1,Math.min(1000,Math.round(Number(raw)||100)));if(compareGuestInput&&Number(compareGuestInput.value)!==guests)compareGuestInput.value=String(guests);if(compareGuestSummary)compareGuestSummary.textContent=guests+' '+(guests===1?'guest':'guests');
 ['mobile-oahu','mobile-maui','mobile-big-island'].forEach(id=>{const extra=Math.max(0,guests-100)*(extraGuestRates[id]||0),total=(packagePrices[id]||0)+extra,totalEl=document.querySelector('[data-compare-total="'+id+'"]'),extraEl=document.querySelector('[data-compare-extra="'+id+'"]');if(totalEl)totalEl.textContent=wholeMoney(total);if(extraEl)extraEl.textContent=extra?wholeMoney(extra)+' guest surcharge':'100 guests included'});
 if(syncForm&&form.elements['guest-count']){form.elements['guest-count'].value=String(guests);calculate()}conversion?.setGuestCount(guests);if(track)conversion?.track('comparison_guest_count_change',{placement:'package-comparison',guestCount:guests,packageId:String(form.elements.package.value||'')});return guests
}
const val=(name,fallback=0)=>{const el=form.elements[name];const n=Number(el?.value);return Number.isFinite(n)?n:fallback};
const checked=name=>Boolean(form.elements[name]?.checked);
const selectedAddOns=()=>[...form.querySelectorAll('input[name^="addon-"]:checked')].map(el=>el.value);
function calculate(){
 const packageId=String(form.elements.package.value||'');
 const packageChosen=Boolean(packageId);
 const base=packagePrices[packageId]||0;
 const guests=Math.max(1,Math.round(val('guest-count',100)));
 const hours=Math.max(1,val('service-hours',4));
 const bartenders=Math.max(1,Math.round(val('bartender-count',1)));
 const oneWayMiles=Math.max(0,val('one-way-miles',0));
 const glassware=Math.max(0,Math.round(val('glassware-count',0)));
 const glasswareType=String(form.elements['glassware-type']?.value||'standard');
 const guestRate=extraGuestRates[packageId]||0;
 const extraGuestCount=Math.max(0,guests-100);
 const extraGuests=extraGuestCount*guestRate;
 const guestGuidance=form.querySelector('[data-guest-guidance]');
 if(guestGuidance){
  if(!packageChosen)guestGuidance.textContent='Up to 100 guests are included in every package. Additional guests: Oahu $10 · Maui $12 · Big Island $15.';
  else if(packageId==='mobile-custom')guestGuidance.textContent='Guest-count pricing for custom / bartender-only service is confirmed with your proposal.';
  else if(extraGuestCount>0)guestGuidance.textContent=extraGuestCount+' guests above the included 100 × '+money(guestRate)+' = '+money(extraGuests)+' additional guest service.';
  else guestGuidance.textContent=guests+' '+(guests===1?'guest is':'guests are')+' within the 100 guests included in this package.';
 }
 const extraHours=Math.max(0,hours-4)*200;
 const labor=hours*bartenders*65;
 const excessRoundTripMiles=Math.max(0,oneWayMiles-20)*2;
 const travel=excessRoundTripMiles*2;
 const longDistanceLogistics=oneWayMiles>60?150:0;
 const gratuityMode=String(form.elements.gratuity.value||'later');
 const gratuityRate=gratuityMode==='tipjar-10'?.10:gratuityMode==='nojar-25'?.25:0;
 const gratuity=labor*gratuityRate;
 const glasswareRate=glasswareType==='premium'?4.5:3;
 const glasswareTotal=glassware*glasswareRate;
 const toast=checked('addon-champagne-toast')?150+Math.max(0,guests-50)*3:0;
 const tower=checked('addon-champagne-tower')?350:0;
 const tossware=checked('addon-upgraded-tossware')?Math.max(100,guests*2):0;
 const vinyl=checked('addon-vinyl-logo')?150:0;
 const stirrers=checked('addon-personalized-stirrers')?Math.max(175,guests*3):0;
 const accessories=checked('addon-drink-accessories')?125:0;
 const balloons=checked('addon-balloon-garland')?350:0;
 const soda=checked('addon-soda-station')?Math.max(200,guests*4):0;
 const juice=checked('addon-juice-punch')?Math.max(250,guests*5):0;
 const coffee=checked('addon-coffee-bar')?Math.max(300,guests*6):0;
 const decor=checked('addon-bar-decor')?250:0;
 const acrylic=checked('addon-acrylic-menu')?125:0;
 const lines=packageChosen?[
  {id:'package',description:packageNames[packageId]||'Mobile Bar package',quantity:1,unitPrice:base,amount:base,custom:packageId==='mobile-custom'},
  ...(extraGuests?[{id:'extra-guests',description:'Additional guests over 100',quantity:extraGuestCount,unitPrice:guestRate,amount:extraGuests,custom:false}]:[]),
  ...(extraHours?[{id:'extra-hours',description:'Additional service hours over 4',quantity:Math.max(0,hours-4),unitPrice:200,amount:extraHours,custom:false}]:[]),
  {id:'bartender-labor',description:'Bartender labor',quantity:bartenders,unitPrice:hours*65,amount:labor,custom:false},
  ...(travel?[{id:'travel',description:'Excess travel mileage (round trip)',quantity:excessRoundTripMiles,unitPrice:2,amount:travel,custom:false}]:[]),
  ...(longDistanceLogistics?[{id:'long-distance-logistics',description:'Long-distance logistics fee',quantity:1,unitPrice:150,amount:150,custom:false}]:[]),
  ...(gratuity?[{id:'gratuity',description:gratuityMode==='tipjar-10'?'Bartender gratuity (10% + tip jar)':'Bartender gratuity (25% + no tip jar)',quantity:1,unitPrice:gratuity,amount:gratuity,custom:false}]:[]),
  ...(glassware?[{id:'glassware-'+glasswareType,description:(glasswareType==='premium'?'Premium / specialty':'Standard')+' glassware',quantity:glassware,unitPrice:glasswareRate,amount:glasswareTotal,custom:false}]:[]),
  ...(toast?[{id:'champagne-toast',description:'Champagne Toast',quantity:1,unitPrice:toast,amount:toast,custom:false}]:[]),
  ...(tower?[{id:'champagne-tower',description:'Champagne Tower Wall',quantity:1,unitPrice:350,amount:tower,custom:false}]:[]),
  ...(tossware?[{id:'upgraded-tossware',description:'Upgraded Toss-Ware',quantity:1,unitPrice:tossware,amount:tossware,custom:false}]:[]),
  ...(vinyl?[{id:'vinyl-logo',description:'Vinyl Logo',quantity:1,unitPrice:150,amount:vinyl,custom:false}]:[]),
  ...(stirrers?[{id:'personalized-stirrers',description:'Personalized Stirrers',quantity:1,unitPrice:stirrers,amount:stirrers,custom:false}]:[]),
  ...(accessories?[{id:'drink-accessories',description:'Drink Accessories',quantity:1,unitPrice:125,amount:accessories,custom:false}]:[]),
  ...(balloons?[{id:'balloon-garland',description:'Balloon Garland',quantity:1,unitPrice:350,amount:balloons,custom:false}]:[]),
  ...(soda?[{id:'soda-station',description:'Soda Station',quantity:1,unitPrice:soda,amount:soda,custom:false}]:[]),
  ...(juice?[{id:'juice-punch-station',description:'Juice / Punch Station',quantity:1,unitPrice:juice,amount:juice,custom:false}]:[]),
  ...(coffee?[{id:'coffee-bar',description:'Coffee Bar',quantity:1,unitPrice:coffee,amount:coffee,custom:false}]:[]),
  ...(decor?[{id:'bar-decor',description:'Bar Décor',quantity:1,unitPrice:250,amount:decor,custom:false}]:[]),
  ...(acrylic?[{id:'acrylic-bar-menu',description:'Acrylic Bar Menu',quantity:1,unitPrice:125,amount:acrylic,custom:false}]:[])
 ]:[];
 const total=lines.reduce((sum,line)=>sum+Number(line.amount||0),0);
 const selected=selectedAddOns();
 const totalEl=form.querySelector('[data-estimate-total]');if(totalEl){const next=packageChosen?money(total):'Select a package';if(totalEl.textContent!==next){totalEl.textContent=next;const panel=totalEl.closest('.estimate-panel');if(panel){panel.classList.remove('is-updated');requestAnimationFrame(()=>panel.classList.add('is-updated'));setTimeout(()=>panel.classList.remove('is-updated'),420)}}}
 const mobileTotalEl=form.querySelector('[data-mobile-estimate-total]');if(mobileTotalEl)mobileTotalEl.textContent=packageChosen?money(total):'Select a package';
 const mobileDock=form.querySelector('.mobile-estimate-dock');if(mobileDock)mobileDock.classList.toggle('has-package',packageChosen);
 const customEl=form.querySelector('[data-estimate-custom]');if(customEl)customEl.textContent=!packageChosen?'Choose Oahu, Maui, Big Island or Custom to begin your estimate.':selected.length?'Selected enhancements: '+selected.join(', '):packageId==='mobile-custom'?'Package/service base price requires custom review.':'';
 const linesEl=form.querySelector('[data-estimate-lines]');if(linesEl){linesEl.innerHTML='';lines.filter(line=>line.amount>0).forEach(line=>{const row=document.createElement('div');const label=document.createElement('span');label.textContent=line.description;const amount=document.createElement('strong');amount.textContent=money(line.amount);row.append(label,amount);linesEl.appendChild(row)})}
 form.elements['estimated-total'].value=packageChosen?String(Math.round(total*100)/100):'';
 form.elements['estimate-breakdown'].value=JSON.stringify({version:'mobile-bar-v2',packageId,guestCount:guests,serviceHours:hours,bartenderCount:bartenders,oneWayMiles,gratuityMode,glasswareCount:glassware,glasswareType,total,lines,selectedAddOns:selected});
 return {packageId,guests,hours,bartenders,oneWayMiles,gratuityMode,glassware,glasswareType,total,lines,selected};
}
form.querySelectorAll('.quote-calculator input,.quote-calculator select').forEach(el=>el.addEventListener('input',calculate));
form.querySelectorAll('.quote-calculator select,.quote-calculator input[type="checkbox"]').forEach(el=>el.addEventListener('change',calculate));
if(compareGuestInput){let compareTimer=0;compareGuestInput.addEventListener('input',()=>{const guests=updateComparisonTotals(compareGuestInput.value,{syncForm:true});clearTimeout(compareTimer);compareTimer=setTimeout(()=>updateComparisonTotals(guests,{track:true}),500)})}
const calculatorGuest=form.elements['guest-count'];if(calculatorGuest)calculatorGuest.addEventListener('input',()=>updateComparisonTotals(calculatorGuest.value));updateComparisonTotals(calculatorGuest?.value||compareGuestInput?.value||100);

const packageCards=[...document.querySelectorAll('.package-grid .package')];
const packageIdFromCard=card=>String(card.dataset.packageId||'');
const quoteCalculator=form.querySelector('.quote-calculator');
const packageHandoff=form.querySelector('[data-package-handoff]');
const handoffName=form.querySelector('[data-package-handoff-name]');
const handoffDetail=form.querySelector('[data-package-handoff-detail]');
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncPackageCards(){const active=String(form.elements.package.value||'');packageCards.forEach(card=>{const selected=packageIdFromCard(card)===active;card.classList.toggle('is-selected',selected);const control=card.querySelector('.package-request');if(control)control.setAttribute('aria-pressed',selected?'true':'false')})}
function syncPackageHandoff(){
 const id=String(form.elements.package.value||'');
 const meta=packageMeta[id];
 if(!packageHandoff||!handoffName||!handoffDetail)return;
 packageHandoff.classList.toggle('has-package',Boolean(meta));
 handoffName.textContent=meta?meta.name+' selected':'Choose a package above or from the menu below.';
 handoffDetail.textContent=meta?meta.detail:'Every package includes up to 100 guests and four hours of service.';
}
function animateQuoteArrival(){
 if(!quoteCalculator)return;
 quoteCalculator.classList.remove('is-arriving');
 void quoteCalculator.offsetWidth;
 quoteCalculator.classList.add('is-arriving');
 window.setTimeout(()=>quoteCalculator.classList.remove('is-arriving'),850);
}
function selectPackage(id,{scroll=true}={}){
 if(!id||!packagePrices.hasOwnProperty(id))return;
 form.elements.package.value=id;
 form.elements.package.dispatchEvent(new Event('change',{bubbles:true}));
 syncPackageCards();
 syncPackageHandoff();
 if(scroll&&quoteCalculator){
  animateQuoteArrival();
  requestAnimationFrame(()=>{
   quoteCalculator.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'start'});
   if(reduceMotion())document.getElementById('quote-calculator-heading')?.focus({preventScroll:true});
  });
 }
}
packageCards.forEach(card=>{const id=packageIdFromCard(card),control=card.querySelector('.package-request');if(!id)return;card.addEventListener('click',event=>{if(event.target.closest('button'))return;selectPackage(id)});if(control)control.addEventListener('click',()=>selectPackage(id))});
document.querySelectorAll('[data-select-package]').forEach(control=>control.addEventListener('click',()=>selectPackage(String(control.dataset.selectPackage||''))));
form.elements.package.addEventListener('change',event=>{syncPackageCards();syncPackageHandoff();const id=String(event.target.value||'');conversion?.setPackage(id);if(event.isTrusted){const guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('package_selected',{packageId:id,guestCount:guests});conversion?.track('quote_package_select',{placement:'quote-calculator',packageId:id,guestCount:guests,stage:'package_selected'})}});
packageCards.forEach(card=>{const id=packageIdFromCard(card),button=card.querySelector('.package-request');card.addEventListener('click',event=>{if(event.target.closest('button'))return;const guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('package_selected',{packageId:id,guestCount:guests});conversion?.track('package_card_click',{placement:'package-cards',packageId:id,guestCount:guests,stage:'package_selected'})});button?.addEventListener('click',()=>{const guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('package_selected',{packageId:id,guestCount:guests});conversion?.track('package_card_click',{placement:'package-cards',packageId:id,guestCount:guests,stage:'package_selected'})})});
document.querySelectorAll('[data-select-package]').forEach(button=>button.addEventListener('click',()=>{const id=String(button.dataset.selectPackage||''),guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('package_selected',{packageId:id,guestCount:guests});conversion?.track('comparison_package_click',{placement:'package-comparison',packageId:id,guestCount:guests,stage:'package_selected'})}));
calculate();syncPackageCards();syncPackageHandoff();
let submitting=false;
let turnstileToken='';
let turnstileWidgetId=null;
const turnstileBox=form.querySelector('[data-turnstile]');
const submitButton=form.querySelector('button[type="submit"]');
const formStatus=form.querySelector('[data-crm-status]');
const setStatus=(message,state='')=>{if(!formStatus)return;formStatus.textContent=message;if(state)formStatus.dataset.state=state;else delete formStatus.dataset.state;};
const setSubmitEnabled=enabled=>{if(submitButton)submitButton.disabled=!enabled;};
[...form.querySelectorAll('.quote-calculator input,.quote-calculator select')].forEach(el=>el.addEventListener('change',()=>{const id=String(form.elements.package.value||''),guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('estimate_configured',{packageId:id,guestCount:guests});conversion?.once('estimate-configured','estimate_configured',{placement:'quote-calculator',packageId:id,guestCount:guests,stage:'estimate_configured'})}));
['event-type','event-date','event-location','first-name','last-name','email','phone','event-budget','details','referral-source','alternative-date','contact-method'].forEach(name=>{const el=form.elements[name];if(!el)return;const mark=()=>{const id=String(form.elements.package.value||''),guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('event_details_started',{packageId:id,guestCount:guests});conversion?.once('event-details-started','event_details_started',{placement:'inquiry-form',packageId:id,guestCount:guests,stage:'event_details_started'})};el.addEventListener('focus',mark,{once:true});el.addEventListener('change',mark,{once:true})});

async function initTurnstile(){
 if(!turnstileBox)return;
 setSubmitEnabled(false);
 setStatus('Loading secure verification…');
 try{
  const response=await fetch('/api/turnstile-config',{headers:{Accept:'application/json'}});
  const config=await response.json().catch(()=>({}));
  if(!response.ok||!config.siteKey)throw new Error('Turnstile is not configured');
  for(let i=0;i<80&&!window.turnstile;i++)await new Promise(resolve=>setTimeout(resolve,50));
  if(!window.turnstile)throw new Error('Turnstile failed to load');
  turnstileWidgetId=window.turnstile.render(turnstileBox,{
   sitekey:config.siteKey,
   action:config.action||'mobile_bar_inquiry',
   theme:'light',
   size:'flexible',
   callback:token=>{turnstileToken=token;setSubmitEnabled(true);setStatus('Security check complete. Your inquiry is ready to send.','ready');const id=String(form.elements.package.value||''),guests=Number(form.elements['guest-count']?.value||100);conversion?.stage('security_complete',{packageId:id,guestCount:guests});conversion?.once('security-complete','security_complete',{placement:'inquiry-form',packageId:id,guestCount:guests,stage:'security_complete'});},
   'expired-callback':()=>{turnstileToken='';setSubmitEnabled(false);setStatus('Security check expired. Complete it again to send your inquiry.','error');},
   'error-callback':()=>{turnstileToken='';setSubmitEnabled(false);setStatus('Security verification could not complete. Refresh the check and try again.','error');}
  });
 }catch(error){
  console.warn('Turnstile unavailable',error);
  turnstileBox.textContent='Secure verification is temporarily unavailable.';
  setSubmitEnabled(false);
  setStatus('Secure verification is required before this inquiry can be sent.','error');
 }
}
initTurnstile();

form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(submitting)return;
 conversion?.stage('submit_attempt',{packageId:String(form.elements.package.value||''),guestCount:Number(form.elements['guest-count']?.value||100)});
 conversion?.track('submit_attempt',{placement:'inquiry-form',packageId:String(form.elements.package.value||''),guestCount:Number(form.elements['guest-count']?.value||100),stage:'submit_attempt'});
 if(!turnstileToken){
  setStatus('Complete the security check before sending your inquiry.','error');
  turnstileBox?.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'center'});
  return;
 }
 const estimate=calculate();
 const data=new FormData(form);
 submitting=true;
 setSubmitEnabled(false);
 setStatus('Securely sending your estimate to Koa\'s…');
 const payload={
  turnstileToken,
  honeypot:data.get('company-website'),
  packageId:estimate.packageId,
  customer:{
   name:[data.get('first-name'),data.get('last-name')].filter(Boolean).join(' '),
   email:data.get('email'),
   phone:data.get('phone'),
   eventDate:data.get('event-date'),
   notes:data.get('details')
  },
  inquiry:{
   service:'mobile-bar',
   eventType:data.get('event-type'),
   guestCount:estimate.guests,
   budget:data.get('event-budget'),
   mobileBarPackage:estimate.packageId,
   eventLocation:data.get('event-location'),
   priorities:data.get('details'),
   source:data.get('referral-source'),
   referralSource:data.get('referral-source'),
   alternativeDate:data.get('alternative-date'),
   contactMethod:data.get('contact-method'),
   serviceHours:estimate.hours,
   oneWayMiles:estimate.oneWayMiles,
   bartenderCount:estimate.bartenders,
   gratuityMode:estimate.gratuityMode,
   glasswareCount:estimate.glassware,
   glasswareType:estimate.glasswareType,
   customAddOns:estimate.selected,
   champagneToast:Boolean(data.get('addon-champagne-toast')),
   champagneTower:Boolean(data.get('addon-champagne-tower')),
   upgradedTossware:Boolean(data.get('addon-upgraded-tossware')),
   vinylLogo:Boolean(data.get('addon-vinyl-logo')),
   personalizedStirrers:Boolean(data.get('addon-personalized-stirrers')),
   drinkAccessories:Boolean(data.get('addon-drink-accessories')),
   balloonGarland:Boolean(data.get('addon-balloon-garland')),
   sodaStation:Boolean(data.get('addon-soda-station')),
   juicePunchStation:Boolean(data.get('addon-juice-punch')),
   coffeeBar:Boolean(data.get('addon-coffee-bar')),
   barDecor:Boolean(data.get('addon-bar-decor')),
   acrylicBarMenu:Boolean(data.get('addon-acrylic-menu'))
  }
 };
 try{
  const response=await fetch('/api/mobile-bar-inquiry',{
   method:'POST',
   headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify(payload)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Inquiry could not be submitted');
  if(result.id&&form.elements['crm-record-id'])form.elements['crm-record-id'].value=result.id;
  conversion?.complete({placement:'inquiry-form',packageId:estimate.packageId,guestCount:estimate.guests,estimatedTotal:estimate.total,recordId:result.id||''});
  location.assign('/thank-you.html');
 }catch(error){
  console.warn('Secure inquiry submission failed',error);
  conversion?.track('quote_submit_error',{placement:'inquiry-form',packageId:estimate.packageId,guestCount:estimate.guests,estimatedTotal:estimate.total,stage:'submit_attempt'});
  submitting=false;
  turnstileToken='';
  if(window.turnstile&&turnstileWidgetId!==null)window.turnstile.reset(turnstileWidgetId);
  setSubmitEnabled(false);
  setStatus(error.message||'We could not send the inquiry. Complete the security check again and retry.','error');
 }
});
})();