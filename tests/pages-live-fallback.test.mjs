import test from 'node:test';
import assert from 'node:assert/strict';
import { composePages404 } from '../scripts/pages-live-fallback.mjs';

const review = '<!doctype html><html><head><title>Review</title></head><body><div id="r2-root">review</div></body></html>';
const live = '<!doctype html><html><head><script type="module" src="/ENJAZ/live/assets/index-abc.js"></script></head><body><div id="root"></div></body></html>';

test('Pages live fallback preserves the frozen review surface for non-live paths', () => {
  const output = composePages404(review, live, '/ENJAZ/live/');
  assert.match(output, /id="r2-root">review/);
  assert.match(output, /data-enjaz-live-fallback="v1"/);
});

test('Pages live fallback embeds the production live entry safely for /live deep-links', () => {
  const output = composePages404(review, live, '/ENJAZ/live/');
  assert.match(output, /\/ENJAZ\/live\//);
  assert.match(output, /location\.pathname\.startsWith\(p\)/);
  assert.match(output, /document\.write\(h\)/);
  assert.doesNotMatch(output, /<script type="module" src="\/ENJAZ\/live\/assets\/index-abc\.js"><\/script>/);
  assert.ok(output.includes('\\u003cscript type=\\"module\\" src=\\"/ENJAZ/live/assets/index-abc.js\\">\\u003c/script>'));
});

test('Pages live fallback fails closed on malformed inputs', () => {
  assert.throws(() => composePages404('<html></html>', live, '/ENJAZ/live/'), /closing <\/head>/);
  assert.throws(() => composePages404(review, '<html></html>', '/ENJAZ/live/'), /production root/);
  assert.throws(() => composePages404(review, live, 'https://example.com/live/'), /Invalid Pages live prefix/);
});
