import fs from 'node:fs';

const failures = [];
const shell = fs.readFileSync('src/ui-v2/components/AppShell.tsx', 'utf8');
const styles = fs.readFileSync('src/ui-v2/styles/shell.css', 'utf8');
const root = fs.readFileSync('src/ui-v2/runtime/UiV2Root.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const shellPreview = fs.existsSync('src/ui-v2/runtime/ShellPreview.tsx') ? fs.readFileSync('src/ui-v2/runtime/ShellPreview.tsx', 'utf8') : '';
const compositionAtlas = fs.existsSync('src/ui-v2/runtime/CompositionAtlas.tsx') ? fs.readFileSync('src/ui-v2/runtime/CompositionAtlas.tsx', 'utf8') : '';
const coreApp = fs.existsSync('src/ui-v2/runtime/CoreApp.tsx') ? fs.readFileSync('src/ui-v2/runtime/CoreApp.tsx', 'utf8') : '';

function requireText(text, token, label) {
  if (!text.includes(token)) failures.push(`${label}: missing ${token}`);
}

for (const token of ['data-shell-part="topbar"', 'data-shell-part="bottom-dock"', 'aria-label="إجراء جديد"', 'aria-label="بحث"', 'aria-label="الإشعارات"', 'visualViewport', 'popstate', 'Escape']) {
  requireText(shell, token, 'AppShell');
}

for (const token of ['env(safe-area-inset-top)', 'env(safe-area-inset-bottom)', 'data-enjaz-keyboard', 'grid-template-columns: repeat(5', '.ez-bottom-dock__primary-slot', '.ez-bottom-dock__primary-icon', '44px']) {
  requireText(styles, token, 'shell.css');
}

const runtimeUsesShellPreview = root.includes('ShellPreview') && shellPreview.includes('<AppShell');
const runtimeUsesCompositionAtlas = root.includes('CompositionAtlas') && compositionAtlas.includes('<AppShell');
const runtimeUsesCoreApp = root.includes('CoreApp') && coreApp.includes('<AppShell');
if (!runtimeUsesShellPreview && !runtimeUsesCompositionAtlas && !runtimeUsesCoreApp) {
  failures.push('UiV2Root: active runtime does not mount an AppShell-backed surface');
}
requireText(main, "./ui-v2/styles/shell.css", 'main.tsx');

for (const forbidden of ['ui-rebirth', 'AppShellFrame', 'src/styles/', '../styles/']) {
  if (shell.includes(forbidden)) failures.push(`AppShell contains forbidden legacy marker: ${forbidden}`);
}

if (failures.length) {
  console.error('UI-4 shell audit FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('UI-4 shell audit PASS');
console.log('- top bar, dock and centered primary action contracts exist');
console.log('- safe-area, visualViewport, keyboard and back/Escape contracts exist');
console.log('- active runtime mounts an AppShell-backed surface with no legacy presentation dependency');
