import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const src = (...parts) => resolve(root, 'src', ...parts);
const failures = [];
let checks = 0;

async function text(path) {
  return readFile(resolve(root, path), 'utf8');
}

function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const expectedComponents = [
  'Badge.tsx', 'Button.tsx', 'Card.tsx', 'Choice.tsx', 'componentContract.ts',
  'Feedback.tsx', 'Field.tsx', 'Overlay.tsx', 'Tabs.tsx', 'index.ts',
];

for (const file of expectedComponents) {
  try {
    await readFile(src('design-system', 'components', file), 'utf8');
    check(`component source ${file}`, true);
  } catch {
    check(`component source ${file}`, false, 'missing');
  }
}

const button = await text('src/design-system/components/Button.tsx');
const card = await text('src/design-system/components/Card.tsx');
const field = await text('src/design-system/components/Field.tsx');
const choice = await text('src/design-system/components/Choice.tsx');
const tabs = await text('src/design-system/components/Tabs.tsx');
const overlay = await text('src/design-system/components/Overlay.tsx');
const feedback = await text('src/design-system/components/Feedback.tsx');
const contract = await text('src/design-system/components/componentContract.ts');
const barrel = await text('src/design-system/components/index.ts');
const coreCss = await text('src/styles/components-core.css');
const fieldCss = await text('src/styles/components-fields.css');
const overlayCss = await text('src/styles/components-overlays.css');
const labCss = await text('src/styles/component-lab.css');
const lab = await text('src/features/foundation/pages/ComponentLabPage.tsx');
const routes = await text('src/core/routing/routes.ts');
const router = await text('src/app/router.tsx');
const foundationCss = await text('src/styles/foundation.css');
const packageJson = JSON.parse(await text('package.json'));
const workflow = await text('.github/workflows/enjaz-quality-gate.yml');
const doc = await text('docs/PHASE_2_4_COMPONENT_SYSTEM.md');

check('button default type is safe', button.includes("type = 'button'"));
check('button loading state is exposed', button.includes('aria-busy={loading || undefined}') && button.includes('disabled={disabled || loading}'));
check('icon button requires accessible label', button.includes('label: string;') && button.includes('aria-label={label}'));
check('cards are non-clickable surfaces', !/onClick\s*=/.test(card));
check('field label binds to control', field.includes('htmlFor={id}') && field.includes('id={id}'));
check('field validation is announced', field.includes('aria-invalid={Boolean(error)}') && field.includes('aria-describedby={descriptionIds(id, hint, error)}') && field.includes('role="alert"'));
check('switch has native switch semantics', choice.includes('role="switch"') && choice.includes('aria-checked={checked}') && choice.includes('type="button"'));
check('checkbox remains native', choice.includes('type="checkbox"') && choice.includes('ChangeEvent<HTMLInputElement>'));
check('tabs expose ARIA roles', tabs.includes('role="tablist"') && tabs.includes('role="tab"') && tabs.includes('aria-selected={selected}') && tabs.includes('tabIndex={selected ? 0 : -1}'));
check('tabs support keyboard navigation', ['ArrowLeft', 'ArrowRight', 'Home', 'End'].every((key) => tabs.includes(`'${key}'`)) && tabs.includes('event.preventDefault()'));
check('dialog is modal and labelled', overlay.includes('role="dialog"') && overlay.includes('aria-modal="true"') && overlay.includes('aria-labelledby={titleId}'));
check('dialog closes with Escape', overlay.includes("event.key === 'Escape'") && overlay.includes("document.addEventListener('keydown', onKeyDown)"));
check('dialog opens focus on a labelled close control', overlay.includes("document.getElementById(`${id}-close`)?.focus()") && overlay.includes('closeLabel'));
check('progress uses semantic native element', feedback.includes('<progress') && feedback.includes('clampProgress(value)'));
check('empty state has status semantics', feedback.includes('role="status"'));
check('component guards are explicit', contract.includes('minimumTouchTargetPx: 44') && contract.includes("buttonDefaultType: 'button'") && contract.includes('logicalRtlOnly: true'));
check('barrel exports all component modules', ['Badge', 'Button', 'Card', 'Choice', 'Feedback', 'Field', 'Overlay', 'Tabs'].every((name) => barrel.includes(`./${name}.tsx`)));
check('button touch floor consumes contract', coreCss.includes('min-block-size: var(--control-height-default);'));
const iconButtonBlock = coreCss.match(/\.ui-icon-button\s*\{([\s\S]*?)\}/)?.[1] ?? '';
check('icon button is at least touch token square', iconButtonBlock.includes('inline-size: var(--size-touch-min);') && iconButtonBlock.includes('block-size: var(--size-touch-min);'));
check('focus styling is tokenized', coreCss.includes('box-shadow: var(--control-focus-shadow);'));
check('fields consume field contracts', fieldCss.includes('min-block-size: var(--field-height);') && fieldCss.includes('border-color: var(--field-border-focus);'));
check('overlay consumes bounded layer contracts', overlayCss.includes('z-index: var(--overlay-z);') && overlayCss.includes('background: var(--overlay-background);'));
check('component styles avoid raw colors', !/(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i.test(`${coreCss}
${fieldCss}
${overlayCss}
${labCss}`));
check('component source avoids inline style escape', !/style\s*=\s*\{\{/.test(`${button}
${card}
${field}
${choice}
${tabs}
${overlay}
${feedback}
${lab}`));
check('no icon-font dependency', !/(?:FontAwesome|Material Icons|material-icons|fa-[a-z])/i.test(`${button}
${lab}
${packageJson.dependencies ? JSON.stringify(packageJson.dependencies) : ''}`));
check('foundation imports component layers', ['components-core.css', 'components-fields.css', 'components-overlays.css', 'component-lab.css'].every((name) => foundationCss.includes(name)));
check('component lab route is canonical', routes.includes("components: '/foundation/components'") && router.includes('ComponentLabPage') && router.includes('ROUTES.components'));
check('component lab proves all families', ['الأزرار والإجراءات', 'البطاقات والعمق', 'الحالات', 'التبويبات', 'الحقول والتحقق', 'الخيارات', 'النوافذ والـBottom Sheet', 'التحميل والحالات الفارغة'].every((marker) => lab.includes(marker)));
check('phase 2.4 package gate exists', packageJson.scripts?.['verify:phase2.4'] === 'npm run verify:phase2.3 && npm run audit:components && npm run audit:components:selftest');
const workflowCommandPhase = Number(workflow.match(/npm run verify:phase2\.(\d+)/)?.[1] ?? -1);
const workflowLabelPhase = Number(workflow.match(/Full Phase 2\.(\d+) verification/)?.[1] ?? -1);
check('GitHub gate covers phase 2.4 or later', workflowCommandPhase >= 4 && workflowLabelPhase >= 4);
check('phase documentation declares scope', ['Button', 'TextField', 'Tabs', 'Dialog', 'BottomSheet', '44px'].every((marker) => doc.includes(marker)));

if (failures.length) {
  console.error(`ENJAZ PHASE 2.4 COMPONENT AUDIT FAIL — ${failures.length}/${checks} checks failed`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 2.4 COMPONENT AUDIT PASS — ${checks}/${checks} component, accessibility, RTL and gate invariants satisfied.`);
