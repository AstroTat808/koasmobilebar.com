(()=>{const icon='/koa-mobile-bar-icon.png';const head=document.head;if(head&&!head.querySelector('link[data-koa-favicon]')){const fav=document.createElement('link');fav.rel='icon';fav.type='image/png';fav.href=icon;fav.dataset.koaFavicon='1';head.appendChild(fav);const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=icon;apple.dataset.koaFavicon='1';head.appendChild(apple)}document.querySelectorAll('a.brand').forEach(a=>{a.innerHTML='<img class="brand-icon" src="'+icon+'" alt="" width="60" height="60"><span class="brand-copy"><span class="brand-name">Koa’s Mobile Bar</span><span class="brand-meta">Hawaiʻi Island</span></span>'});document.querySelectorAll('.footer-brand').forEach(el=>{const p=el.querySelector('p');const tagline=p?p.textContent:'Good drinks bring great people together.';el.innerHTML='<div class="footer-brand-lockup"><img src="'+icon+'" alt="" width="82" height="82"><div><strong>Koa’s Mobile Bar</strong><span>Hawaiʻi Island</span></div></div><p>'+tagline+'</p>'})})();const header=document.querySelector('.site-header');if(header){let scrollTick=false;const syncHeader=()=>{header.classList.toggle('scrolled',scrollY>48);scrollTick=false};syncHeader();addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(syncHeader)}},{passive:true})}const menu=document.querySelector('.menu'),nav=document.querySelector('#nav');if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}))}const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();const box=document.querySelector('#lightbox');if(box){const boxImg=box.querySelector('img');document.querySelectorAll('.photo,[data-lightbox]').forEach(b=>b.addEventListener('click',()=>{boxImg.src=b.dataset.src||b.dataset.lightbox;box.classList.add('open');box.setAttribute('aria-hidden','false')}));const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');boxImg.src=''};box.querySelector('button')?.addEventListener('click',close);box.addEventListener('click',e=>{if(e.target===box)close()});addEventListener('keydown',e=>{if(e.key==='Escape')close()})}const filters=document.querySelectorAll('.filter-btn');const cards=document.querySelectorAll('.gallery-card');filters.forEach(btn=>btn.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;cards.forEach(card=>card.hidden=!(f==='all'||card.dataset.category===f))}));
;(()=>{const form=document.querySelector('[data-mobile-quote-form]');if(!form)return;
const packagePrices={'mobile-oahu':1200,'mobile-maui':1500,'mobile-big-island':1800,'mobile-custom':0};
const packageNames={'mobile-oahu':'Oahu Package','mobile-maui':'Maui Package','mobile-big-island':'Big Island Package','mobile-custom':'Custom / bartender-only'};
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v||0));
const val=(name,fallback=0)=>{const el=form.elements[name];const n=Number(el?.value);return Number.isFinite(n)?n:fallback};
const customSelections=()=>[...form.querySelectorAll('input[name="addon-custom"]:checked')].map(el=>el.value);
function calculate(){
 const packageId=String(form.elements.package.value||'mobile-custom');
 const base=packagePrices[packageId]||0;
 const guests=Math.max(1,Math.round(val('guest-count',100)));
 const hours=Math.max(1,val('service-hours',4));
 const bartenders=Math.max(1,Math.round(val('bartender-count',1)));
 const oneWayMiles=Math.max(0,val('one-way-miles',0));
 const glassware=Math.max(0,Math.round(val('glassware-count',0)));
 const extraGuests=Math.max(0,guests-100)*8;
 const extraHours=Math.max(0,hours-4)*200;
 const labor=hours*bartenders*40;
 const travel=Math.max(0,oneWayMiles-20)*2*1.5;
 const gratuityMode=String(form.elements.gratuity.value||'later');
 const gratuityRate=gratuityMode==='tipjar-10'?.10:gratuityMode==='nojar-25'?.25:0;
 const gratuity=labor*gratuityRate;
 const glasswareTotal=glassware*1.5;
 const toast=form.elements['addon-champagne-toast']?.checked?70:0;
 const lines=[
  {id:'package',description:packageNames[packageId]||'Mobile Bar package',quantity:1,unitPrice:base,amount:base,custom:packageId==='mobile-custom'},
  ...(extraGuests?[{id:'extra-guests',description:'Additional guests over 100',quantity:Math.max(0,guests-100),unitPrice:8,amount:extraGuests,custom:false}]:[]),
  ...(extraHours?[{id:'extra-hours',description:'Additional service hours over 4',quantity:Math.max(0,hours-4),unitPrice:200,amount:extraHours,custom:false}]:[]),
  {id:'bartender-labor',description:'Bartender labor',quantity:bartenders,unitPrice:hours*40,amount:labor,custom:false},
  ...(travel?[{id:'travel',description:'Travel beyond 20-mile included radius (round trip)',quantity:Math.max(0,(oneWayMiles-20)*2),unitPrice:1.5,amount:travel,custom:false}]:[]),
  ...(gratuity?[{id:'gratuity',description:gratuityMode==='tipjar-10'?'Bartender gratuity (10% + tip jar)':'Bartender gratuity (25% + no tip jar)',quantity:1,unitPrice:gratuity,amount:gratuity,custom:false}]:[]),
  ...(glassware?[{id:'glassware',description:'Glassware',quantity:glassware,unitPrice:1.5,amount:glasswareTotal,custom:false}]:[]),
  ...(toast?[{id:'champagne-toast',description:'Champagne Toast',quantity:1,unitPrice:70,amount:70,custom:false}]:[])
 ];
 const total=lines.reduce((sum,line)=>sum+Number(line.amount||0),0);
 const custom=customSelections();
 const totalEl=form.querySelector('[data-estimate-total]');if(totalEl)totalEl.textContent=money(total);
 const customEl=form.querySelector('[data-estimate-custom]');if(customEl)customEl.textContent=custom.length?'Plus custom pricing for: '+custom.join(', '):packageId==='mobile-custom'?'Package/service base price requires custom review.':'';
 const linesEl=form.querySelector('[data-estimate-lines]');if(linesEl){linesEl.innerHTML='';lines.filter(line=>line.amount>0).forEach(line=>{const row=document.createElement('div');const label=document.createElement('span');label.textContent=line.description;const amount=document.createElement('strong');amount.textContent=money(line.amount);row.append(label,amount);linesEl.appendChild(row)})}
 form.elements['estimated-total'].value=String(Math.round(total*100)/100);
 form.elements['estimate-breakdown'].value=JSON.stringify({version:'mobile-bar-v1',packageId,guestCount:guests,serviceHours:hours,bartenderCount:bartenders,oneWayMiles,gratuityMode,glasswareCount:glassware,total,lines,customAddOns:custom});
 return {packageId,guests,hours,bartenders,oneWayMiles,gratuityMode,glassware,total,lines,custom};
}
form.querySelectorAll('.quote-calculator input,.quote-calculator select').forEach(el=>el.addEventListener('input',calculate));
form.querySelectorAll('.quote-calculator select,.quote-calculator input[type="checkbox"]').forEach(el=>el.addEventListener('change',calculate));
calculate();
let submitting=false;
form.addEventListener('submit',async event=>{
 if(submitting)return;
 event.preventDefault();
 const estimate=calculate();const data=new FormData(form);const status=form.querySelector('[data-crm-status]');
 if(status)status.textContent='Sending your estimate to Koa\'s…';
 const customer={name:[data.get('first-name'),data.get('last-name')].filter(Boolean).join(' '),email:data.get('email'),phone:data.get('phone'),eventDate:data.get('event-date'),notes:data.get('details')};
 try{
  const response=await fetch('https://www.koasevents.com/api/crm/inquiries',{method:'POST',headers:{'Content-Type':'application/json','X-Koa-Inquiry-Capture':'1'},body:JSON.stringify({formName:'koa-mobile-bar-inquiry',honeypot:data.get('company-website'),packageId:estimate.packageId,customer,inquiry:{service:'mobile-bar',eventType:data.get('event-type'),guestCount:estimate.guests,budget:data.get('event-budget'),mobileBarPackage:estimate.packageId,eventLocation:data.get('event-location'),priorities:data.get('details'),source:data.get('referral-source'),alternativeDate:data.get('alternative-date'),contactMethod:data.get('contact-method'),serviceHours:estimate.hours,oneWayMiles:estimate.oneWayMiles,bartenderCount:estimate.bartenders,gratuityMode:estimate.gratuityMode,glasswareCount:estimate.glassware,estimatedTotal:estimate.total,estimateLineItems:estimate.lines,customAddOns:estimate.custom,calculatorVersion:'mobile-bar-v1'}}),keepalive:true});
  const result=await response.json().catch(()=>({}));
  if(response.ok&&result.id)form.elements['crm-record-id'].value=result.id;
 }catch(error){console.warn('CRM capture unavailable',error)}
 submitting=true;if(status)status.textContent='Estimate saved. Finishing your inquiry…';form.submit();
});
})();