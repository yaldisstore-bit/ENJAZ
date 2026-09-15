import test from 'node:test';
import assert from 'node:assert/strict';
import {
  endpointFingerprint,mapResendEvent,mapTwilioStatus,normalizeEndpoint,renderMergeFields,
  twilioDestination,verifySvixSignature,verifyTwilioSignature,
} from '../supabase/functions/enjaz-communications/providerCore.ts';

test('endpoint normalization is deterministic and channel scoped',async()=>{
  assert.equal(normalizeEndpoint('email',' Acme <USER@Example.COM> '),'user@example.com');
  assert.equal(normalizeEndpoint('sms','+964 770 123 4567'),'+9647701234567');
  assert.equal(normalizeEndpoint('whatsapp','whatsapp:+964-770-123-4567'),'+9647701234567');
  const a=await endpointFingerprint('sms','+964 770 123 4567','secret');
  const b=await endpointFingerprint('sms','+9647701234567','secret');
  const c=await endpointFingerprint('whatsapp','+9647701234567','secret');
  assert.equal(a,b); assert.notEqual(a,c); assert.match(a,/^[a-f0-9]{64}$/);
});

test('merge fields fail closed when required values are absent',()=>{
  assert.equal(renderMergeFields('Hello {{ name }} — {{case}}',{name:'Ali',case:42}),'Hello Ali — 42');
  assert.throws(()=>renderMergeFields('Hello {{missing}}',{}),/MERGE_FIELD_MISSING/);
});

test('Twilio documented HMAC-SHA1 validation vector is accepted',async()=>{
  const params=new URLSearchParams({CallSid:'CA1234567890ABCDE',Caller:'+14158675310',Digits:'1234',From:'+14158675310',To:'+18005551212'});
  const ok=await verifyTwilioSignature({
    url:'https://example.com/myapp.php?foo=1&bar=2',params,
    signature:'L/OH5YylLD5NRKLltdqwSvS0BnU=',authToken:'12345',
  });
  assert.equal(ok,true);
  assert.equal(await verifyTwilioSignature({url:'https://example.com/myapp.php?foo=1&bar=2',params,signature:'bad',authToken:'12345'}),false);
});

test('Svix/Resend signature verification validates timestamp and payload integrity',async()=>{
  const secretBytes=new TextEncoder().encode('01234567890123456789012345678901');
  let raw=''; for(const b of secretBytes)raw+=String.fromCharCode(b);
  const secret=`whsec_${btoa(raw)}`;
  const id='msg_test'; const timestamp='1700000000'; const payload='{"type":"email.sent"}';
  const key=await crypto.subtle.importKey('raw',secretBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${id}.${timestamp}.${payload}`)));
  let sigRaw='';for(const b of signed)sigRaw+=String.fromCharCode(b);
  const signature=`v1,${btoa(sigRaw)}`;
  assert.equal(await verifySvixSignature({payload,id,timestamp,signature,secret,nowSeconds:1700000001}),true);
  assert.equal(await verifySvixSignature({payload:payload+'x',id,timestamp,signature,secret,nowSeconds:1700000001}),false);
  assert.equal(await verifySvixSignature({payload,id,timestamp,signature,secret,nowSeconds:1700001000}),false);
});

test('provider status mapping never invents unsupported transport states',()=>{
  assert.equal(mapTwilioStatus('queued'),'accepted');
  assert.equal(mapTwilioStatus('undelivered'),'failed');
  assert.equal(mapTwilioStatus('read'),'read');
  assert.equal(mapTwilioStatus('mystery'),null);
  assert.equal(mapResendEvent('email.sent'),'sent');
  assert.equal(mapResendEvent('email.bounced'),'failed');
  assert.equal(mapResendEvent('email.clicked'),null);
});

test('WhatsApp destinations are canonicalized without double prefix',()=>{
  assert.equal(twilioDestination('whatsapp','whatsapp:+9647701234567'),'whatsapp:+9647701234567');
  assert.equal(twilioDestination('sms','+964 770 123 4567'),'+9647701234567');
});
