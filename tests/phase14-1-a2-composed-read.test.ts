import test from 'node:test';
import assert from 'node:assert/strict';
test('A2 composed source gate module loads',async()=>{const x=await import('../src/features/journeys/crossDomainJourneyA2Read.ts');assert.equal(typeof x.verifyCrossDomainA2Read,'function');});
