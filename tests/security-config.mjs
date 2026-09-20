import fs from 'node:fs';

const source = fs.readFileSync('netlify/functions/mobile-bar-inquiry.mts', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/windowLimit:\s*8/.test(source), 'Mobile Bar function must enforce an 8-request rate limit.');
assert(/aggregateBy:\s*\['ip'\]/.test(source), 'Mobile Bar rate limit must aggregate by IP.');
assert(source.includes('X-Koa-Source-Fingerprint'), 'Signed source fingerprint header is missing.');
assert(source.includes('X-Koa-Source-Timestamp'), 'Signed source timestamp header is missing.');
assert(source.includes('X-Koa-Source-Signature'), 'Signed source signature header is missing.');
assert(source.includes("'mobile-bar|' + fingerprint + '|' + timestamp"), 'Fingerprint signature payload is missing.');
assert(source.includes('crmResponse.status === 403 || crmResponse.status === 429'), 'Central security status forwarding is missing.');

console.log('PASS | Mobile Bar native IP rate limit configured');
console.log('PASS | signed visitor fingerprint handoff configured');
console.log('PASS | central 403/429 security responses preserved');
