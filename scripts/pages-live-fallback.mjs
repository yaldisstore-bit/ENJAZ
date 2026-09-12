import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function composePages404(reviewHtml, liveHtml, livePrefix) {
  if (typeof reviewHtml !== 'string' || !reviewHtml.includes('</head>')) {
    throw new Error('Review HTML must contain a closing </head> tag.');
  }
  if (typeof liveHtml !== 'string' || !liveHtml.includes('<div id="root"')) {
    throw new Error('Live HTML must contain the ENJAZ production root.');
  }
  if (typeof livePrefix !== 'string' || !/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*\/live\/$/.test(livePrefix)) {
    throw new Error(`Invalid Pages live prefix: ${livePrefix}`);
  }

  const escapedLiveHtml = JSON.stringify(liveHtml).replace(/</g, '\\u003c');
  const escapedPrefix = JSON.stringify(livePrefix);
  const loader = `<script data-enjaz-live-fallback="v1">(()=>{const p=${escapedPrefix};if(location.pathname.startsWith(p)){const h=${escapedLiveHtml};document.open();document.write(h);document.close();}})();</script>`;
  return reviewHtml.replace('</head>', `${loader}</head>`);
}

function runCli() {
  const [, , review404Path, liveIndexPath, livePrefix] = process.argv;
  if (!review404Path || !liveIndexPath || !livePrefix) {
    throw new Error('Usage: node scripts/pages-live-fallback.mjs <review-404> <live-index> <live-prefix>');
  }
  const reviewHtml = fs.readFileSync(review404Path, 'utf8');
  const liveHtml = fs.readFileSync(liveIndexPath, 'utf8');
  const output = composePages404(reviewHtml, liveHtml, livePrefix);
  fs.writeFileSync(review404Path, output, 'utf8');
}

const currentPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentPath) {
  runCli();
}
