const endpoint = 'https://www.koasevents.com/api/crm/inquiries';
const suffix = Date.now().toString(36);
const expectedTotal = 4213;
const payload = {
  formName: 'koa-mobile-bar-qa',
  honeypot: '',
  packageId: 'mobile-big-island',
  customer: {
    name: 'QA Mobile Bar ' + suffix,
    email: 'qa+' + suffix + '@example.com',
    phone: '808-555-0100',
    eventDate: '2026-12-12',
    notes: 'Automated CRM handoff validation. This record must be ephemeral.'
  },
  inquiry: {
    service: 'mobile-bar',
    eventType: 'corporate',
    guestCount: 125,
    budget: '$4,000-$5,000',
    mobileBarPackage: 'mobile-big-island',
    eventLocation: 'Hilo, HI',
    priorities: 'QA integration test',
    source: 'github-actions',
    alternativeDate: '2026-12-13',
    contactMethod: 'email',
    serviceHours: 5,
    oneWayMiles: 32,
    bartenderCount: 2,
    gratuityMode: 'tipjar-10',
    glasswareCount: 125,
    estimatedTotal: expectedTotal,
    estimateLineItems: [
      { id:'package', description:'Big Island Package', quantity:1, unitPrice:2500, amount:2500, custom:false },
      { id:'extra-guests', description:'Additional guests over 100', quantity:25, unitPrice:15, amount:375, custom:false },
      { id:'extra-hours', description:'Additional service hours over 4', quantity:1, unitPrice:200, amount:200, custom:false },
      { id:'bartender-labor', description:'Bartender labor', quantity:2, unitPrice:325, amount:650, custom:false },
      { id:'travel', description:'Excess travel mileage (round trip)', quantity:24, unitPrice:2, amount:48, custom:false },
      { id:'gratuity', description:'Bartender gratuity (10% + tip jar)', quantity:1, unitPrice:65, amount:65, custom:false },
      { id:'glassware-standard', description:'Standard glassware', quantity:125, unitPrice:3, amount:375, custom:false }
    ],
    customAddOns: ['Champagne wall','Acrylic menu'],
    calculatorVersion: 'mobile-bar-v2'
  }
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://koasmobilebar.com',
    'X-Koa-Inquiry-Capture': '1',
    'X-Koa-Inquiry-QA': '1'
  },
  body: JSON.stringify(payload)
});

const data = await response.json().catch(() => ({}));
if (!response.ok) throw new Error('CRM QA request failed: ' + response.status + ' ' + JSON.stringify(data));
if (!data.qa || !data.id || !data.record) throw new Error('CRM QA response did not confirm ephemeral persistence: ' + JSON.stringify(data));

const record = data.record;
const checks = [
  ['source', record.source, 'koa-mobile-bar-qa'],
  ['packageId', record.packageId, 'mobile-big-island'],
  ['customer.email', record.customer?.email, payload.customer.email],
  ['service', record.inquiry?.service, 'mobile-bar'],
  ['mobileBarPackage', record.inquiry?.mobileBarPackage, 'mobile-big-island'],
  ['guestCount', record.inquiry?.guestCount, 125],
  ['serviceHours', record.inquiry?.serviceHours, 5],
  ['oneWayMiles', record.inquiry?.oneWayMiles, 32],
  ['bartenderCount', record.inquiry?.bartenderCount, 2],
  ['gratuityMode', record.inquiry?.gratuityMode, 'tipjar-10'],
  ['glasswareCount', record.inquiry?.glasswareCount, 125],
  ['estimatedTotal', record.inquiry?.estimatedTotal, expectedTotal],
  ['calculatorVersion', record.inquiry?.calculatorVersion, 'mobile-bar-v1']
];
for (const [label,actual,expected] of checks) {
  if (actual !== expected) throw new Error(label + ' mismatch. Expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
if (!Array.isArray(record.inquiry?.estimateLineItems) || record.inquiry.estimateLineItems.length !== payload.inquiry.estimateLineItems.length) {
  throw new Error('estimateLineItems were not persisted correctly');
}
if (JSON.stringify(record.inquiry?.customAddOns) !== JSON.stringify(payload.inquiry.customAddOns)) {
  throw new Error('customAddOns were not persisted correctly');
}

console.log('CRM handoff GO:', data.id, 'validated and automatically removed from QA storage.');
