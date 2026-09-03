import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase2-4-component-audit.mjs');
const probes = [
  { name: 'remove_icon_accessible_label', file: 'src/design-system/components/Button.tsx', mutate: (text) => text.replace('aria-label={label}', 'data-label={label}') },
  { name: 'unsafe_button_default_submit', file: 'src/design-system/components/Button.tsx', mutate: (text) => text.replaceAll("type = 'button'", "type = 'submit'") },
  { name: 'remove_loading_announcement', file: 'src/design-system/components/Button.tsx', mutate: (text) => text.replace('aria-busy={loading || undefined}', 'data-busy={loading || undefined}') },
  { name: 'shrink_icon_touch_target', file: 'src/styles/components-core.css', mutate: (text) => text.replace('inline-size: var(--size-touch-min);\n  block-size: var(--size-touch-min);', 'inline-size: var(--space-8);\n  block-size: var(--space-8);') },
  { name: 'make_card_clickable_div', file: 'src/design-system/components/Card.tsx', mutate: (text) => text.replace('<section className={classNames', '<section onClick={() => undefined} className={classNames') },
  { name: 'detach_field_label', file: 'src/design-system/components/Field.tsx', mutate: (text) => text.replace('htmlFor={id}', 'data-for={id}') },
  { name: 'remove_field_error_relation', file: 'src/design-system/components/Field.tsx', mutate: (text) => text.replaceAll('aria-describedby={descriptionIds(id, hint, error)}', 'data-describedby={descriptionIds(id, hint, error)}') },
  { name: 'break_switch_semantics', file: 'src/design-system/components/Choice.tsx', mutate: (text) => text.replace('role="switch"', 'role="button"') },
  { name: 'break_tab_selection_semantics', file: 'src/design-system/components/Tabs.tsx', mutate: (text) => text.replace('aria-selected={selected}', 'data-selected={selected}') },
  { name: 'remove_tab_keyboard_navigation', file: 'src/design-system/components/Tabs.tsx', mutate: (text) => text.replace("if (event.key === 'ArrowLeft')", "if (event.key === 'PageDown')") },
  { name: 'remove_dialog_modal_semantics', file: 'src/design-system/components/Overlay.tsx', mutate: (text) => text.replace('aria-modal="true"', 'data-modal="true"') },
  { name: 'remove_escape_dismissal', file: 'src/design-system/components/Overlay.tsx', mutate: (text) => text.replace("event.key === 'Escape'", "event.key === 'F12'") },
  { name: 'replace_native_progress', file: 'src/design-system/components/Feedback.tsx', mutate: (text) => text.replace('<progress className="ui-progress"', '<div className="ui-progress"') },
  { name: 'remove_component_route', file: 'src/core/routing/routes.ts', mutate: (text) => text.replace("  components: '/foundation/components',\n", '') },
  { name: 'inline_style_escape', file: 'src/features/foundation/pages/ComponentLabPage.tsx', mutate: (text) => text.replace('<main className="component-lab-page"', '<main style={{ display: \'block\' }} className="component-lab-page"') },
  { name: 'inject_icon_font_dependency', file: 'src/features/foundation/pages/ComponentLabPage.tsx', mutate: (text) => `${text}\n// FontAwesome fa-trash\n` },
  {
    name: 'downgrade_github_quality_gate',
    file: '.github/workflows/enjaz-quality-gate.yml',
    mutate: (text) => text
      .replace(/verify:phase2\.\d+/g, 'verify:phase2.3')
      .replace(/Full Phase 2\.\d+ verification/g, 'Full Phase 2.3 verification'),
  },
];

let passed = 0;
for (const probe of probes) {
  const base = await mkdtemp(join(tmpdir(), 'enjaz-phase24-'));
  const copy = join(base, 'project');
  try {
    await cp(root, copy, { recursive: true, filter: (source) => !source.includes('/node_modules') && !source.endsWith('.zip') });
    const target = join(copy, probe.file);
    const before = await readFile(target, 'utf8');
    const after = probe.mutate(before);
    if (after === before) throw new Error(`probe ${probe.name} made no mutation`);
    await writeFile(target, after);
    const result = spawnSync(process.execPath, [audit, copy], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`probe ${probe.name} was not rejected`);
    console.log(`PASS component destructive probe ${probe.name}: regression rejected`);
    passed += 1;
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}
console.log(`ENJAZ PHASE 2.4 COMPONENT SELFTEST PASS — ${passed}/${probes.length} deliberate component/accessibility regressions rejected.`);
