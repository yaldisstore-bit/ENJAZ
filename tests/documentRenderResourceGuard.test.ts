import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('supabase/functions/enjaz-document-render/index.ts','utf8');

test('document renderer keeps paragraph measurement linear for normal word wrapping',()=>{
  assert.ok(!source.includes('measureArabicText(candidate,font,size)'));
  assert.match(source,/widths=new Map<string,number>\(\)/);
  assert.match(source,/const wordWidth=measure\(word\)/);
  assert.match(source,/lineWidth\+spaceWidth\+wordWidth<=maxWidth/);
  assert.match(source,/lineWidth\+=spaceWidth\+wordWidth/);
});

test('oversized single tokens retain exact measured splitting',()=>{
  assert.match(source,/measureArabicText\(next,font,size\)>maxWidth/);
  assert.match(source,/lineWidth=chunk\?measure\(chunk\):0/);
});
