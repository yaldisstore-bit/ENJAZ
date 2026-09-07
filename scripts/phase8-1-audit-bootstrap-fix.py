from pathlib import Path

p = Path('scripts/phase8-1-workflow-government-procedure-audit.mjs')
s = p.read_text()
replacements = [
    ("  'official_fee numeric(18,2)',", "  'official_fee numeric,',"),
    ("  \"'workflow.transition.' || v_transition.transition_kind\",", "  \"'workflow.transition.'||v_transition.transition_kind\","),
    ("  'without rounding a government fee silently',", "  'instead of rounding a government fee silently',"),
]
for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'audit bootstrap marker expected once, got {count}: {old}')
    s = s.replace(old, new, 1)
p.write_text(s)
