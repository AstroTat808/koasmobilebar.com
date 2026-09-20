(()=>{const head=document.head;if(!head.querySelector('[data-koa-favicon-package]')){const links=[['icon','image/png','16x16','/favicon-16x16.png'],['icon','image/png','32x32','/favicon-32x32.png'],['icon','image/png','48x48','/favicon-48x48.png'],['apple-touch-icon','', '180x180','/apple-touch-icon.png'],['manifest','','','/site.webmanifest']];links.forEach(([rel,type,sizes,href],i)=>{const l=document.createElement('link');l.rel=rel;if(type)l.type=type;if(sizes)l.sizes=sizes;l.href=href;if(i===0)l.dataset.koaFaviconPackage='1';head.appendChild(l)})}})();(()=>{const icon='/koa-mobile-bar-icon.png';document.querySelectorAll('a.brand').forEach(a=>{a.innerHTML='<span class="brand-medallion" aria-hidden="true"><img class="brand-icon" src="'+icon+'" alt="" width="68" height="68"></span><span class="brand-copy"><span class="brand-name">Koa’s Mobile Bar</span><span class="brand-meta">Hawaiʻi Island</span></span>'});document.querySelectorAll('.footer-brand').forEach(el=>{const p=el.querySelector('p');const tagline=p?p.textContent:'Good drinks bring great people together.';el.innerHTML='<div class="footer-brand-lockup"><span class="footer-medallion" aria-hidden="true"><img src="'+icon+'" alt="" width="76" height="76"></span><div><strong>Koa’s Mobile Bar</strong><span>Hawaiʻi Island</span></div></div><p>'+tagline+'</p>'})})();const header=document.querySelector('.site-header');if(header){let scrollTick=false;const syncHeader=()=>{header.classList.toggle('scrolled',scrollY>48);scrollTick=false};syncHeader();addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(syncHeader)}},{passive:true})}const menu=document.querySelector('.menu'),nav=document.querySelector('#nav');if(menu&&nav){const closeMenu=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open')};menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open);document.body.classList.toggle('menu-open',open&&matchMedia('(max-width:900px)').matches)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});addEventListener('resize',()=>{if(innerWidth>900)closeMenu()},{passive:true})}const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();const box=document.querySelector('#lightbox');if(box){const boxImg=box.querySelector('img');document.querySelectorAll('.photo,[data-lightbox]').forEach(b=>b.addEventListener('click',()=>{boxImg.src=b.dataset.src||b.dataset.lightbox;box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open')}));const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open');boxImg.src=''};box.querySelector('button')?.addEventListener('click',close);box.addEventListener('click',e=>{if(e.target===box)close()});addEventListener('keydown',e=>{if(e.key==='Escape')close()})}const filters=document.querySelectorAll('.filter-btn');const cards=document.querySelectorAll('.gallery-card');filters.forEach(btn=>btn.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;cards.forEach(card=>card.hidden=!(f==='all'||card.dataset.category===f))}));
;(()=>{const form=document.querySelector('[data-mobile-quote-form]');if(!form)return;
const packagePrices={'mobile-oahu':1500,'mobile-maui':2000,'mobile-big-island':2500,'mobile-custom':0};
const packageNames={'mobile-oahu':'Oahu Package','mobile-maui':'Maui Package','mobile-big-island':'Big Island Package','mobile-custom':'Custom / bartender-only'};
const extraGuestRates={'mobile-oahu':10,'mobile-maui':12,'mobile-big-island':15,'mobile-custom':0};
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v||0));
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

const packageCards=[...document.querySelectorAll('.package-grid .package')];
const packageIdFromCard=card=>String(card.dataset.packageId||'');
function syncPackageCards(){const active=String(form.elements.package.value||'');packageCards.forEach(card=>{const selected=packageIdFromCard(card)===active;card.classList.toggle('is-selected',selected);const control=card.querySelector('.package-request');if(control)control.setAttribute('aria-pressed',selected?'true':'false')})}
const quoteCalculator=form.querySelector('.quote-calculator');
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function selectPackage(id,{scroll=true}={}){if(!id||!packagePrices.hasOwnProperty(id))return;form.elements.package.value=id;form.elements.package.dispatchEvent(new Event('change',{bubbles:true}));syncPackageCards();if(scroll&&quoteCalculator){requestAnimationFrame(()=>quoteCalculator.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'center'}))}}
packageCards.forEach(card=>{const id=packageIdFromCard(card),control=card.querySelector('.package-request');if(!id)return;card.addEventListener('click',event=>{if(event.target.closest('button'))return;selectPackage(id)});if(control)control.addEventListener('click',()=>selectPackage(id))});
form.elements.package.addEventListener('change',syncPackageCards);
calculate();syncPackageCards();
let submitting=false;
let turnstileToken='';
let turnstileWidgetId=null;
const turnstileBox=form.querySelector('[data-turnstile]');
const submitButton=form.querySelector('button[type="submit"]');
const formStatus=form.querySelector('[data-crm-status]');
const setStatus=(message,state='')=>{if(!formStatus)return;formStatus.textContent=message;if(state)formStatus.dataset.state=state;else delete formStatus.dataset.state;};
const setSubmitEnabled=enabled=>{if(submitButton)submitButton.disabled=!enabled;};

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
   callback:token=>{turnstileToken=token;setSubmitEnabled(true);setStatus('Security check complete. Your inquiry is ready to send.','ready');},
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
  location.assign('/thank-you.html');
 }catch(error){
  console.warn('Secure inquiry submission failed',error);
  submitting=false;
  turnstileToken='';
  if(window.turnstile&&turnstileWidgetId!==null)window.turnstile.reset(turnstileWidgetId);
  setSubmitEnabled(false);
  setStatus(error.message||'We could not send the inquiry. Complete the security check again and retry.','error');
 }
});
})();