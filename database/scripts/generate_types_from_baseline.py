from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DDL = ROOT / 'database' / 'baseline' / 'phase1_2_schema.sql'
OUT = ROOT / 'src' / 'core' / 'supabase' / 'database.types.ts'

TYPE_MAP = {
    'uuid': 'string',
    'text': 'string',
    'timestamptz': 'string',
    'timestamp': 'string',
    'date': 'string',
    'time': 'string',
    'boolean': 'boolean',
    'integer': 'number',
    'bigint': 'number',
    'jsonb': 'Json',
    'json': 'Json',
}

@dataclass(frozen=True)
class Column:
    name: str
    pg_type: str
    nullable: bool
    has_default: bool


def split_top_level(body: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    quote: str | None = None
    i = 0
    while i < len(body):
        ch = body[i]
        if quote:
            current.append(ch)
            if ch == quote:
                if i + 1 < len(body) and body[i + 1] == quote:
                    current.append(body[i + 1])
                    i += 1
                else:
                    quote = None
        else:
            if ch in "'\"":
                quote = ch
                current.append(ch)
            elif ch == '(':
                depth += 1
                current.append(ch)
            elif ch == ')':
                depth -= 1
                current.append(ch)
            elif ch == ',' and depth == 0:
                part = ''.join(current).strip()
                if part:
                    parts.append(part)
                current = []
            else:
                current.append(ch)
        i += 1
    part = ''.join(current).strip()
    if part:
        parts.append(part)
    return parts


def ts_type(pg_type: str) -> str:
    raw = pg_type.lower().strip()
    if raw.endswith('[]'):
        return f"{ts_type(raw[:-2])}[]"
    if raw.startswith('numeric') or raw.startswith('decimal') or raw.startswith('double') or raw.startswith('real'):
        return 'number'
    return TYPE_MAP.get(raw, 'unknown')


def parse_tables(sql: str) -> dict[str, list[Column]]:
    tables: dict[str, list[Column]] = {}
    pattern = re.compile(r'create\s+table\s+public\.([a-z0-9_]+)\s*\(', re.I)
    for match in pattern.finditer(sql):
        name = match.group(1)
        start = match.end()
        depth = 1
        quote: str | None = None
        i = start
        while i < len(sql) and depth:
            ch = sql[i]
            if quote:
                if ch == quote:
                    if i + 1 < len(sql) and sql[i + 1] == quote:
                        i += 1
                    else:
                        quote = None
            else:
                if ch in "'\"":
                    quote = ch
                elif ch == '(':
                    depth += 1
                elif ch == ')':
                    depth -= 1
            i += 1
        body = sql[start:i - 1]
        columns: list[Column] = []
        for definition in split_top_level(body):
            normalized = ' '.join(definition.split())
            lower = normalized.lower()
            if lower.startswith(('constraint ', 'primary key ', 'foreign key ', 'unique ', 'check ')):
                continue
            m = re.match(r'^([a-z_][a-z0-9_]*)\s+([a-z]+(?:\([^)]*\))?(?:\[\])?)\b(.*)$', normalized, re.I)
            if not m:
                raise RuntimeError(f'Cannot parse column in {name}: {normalized}')
            col_name, pg_type, rest = m.groups()
            rest_lower = rest.lower()
            nullable = 'not null' not in rest_lower and 'primary key' not in rest_lower
            has_default = ' default ' in f' {rest_lower} ' or 'generated ' in rest_lower or 'primary key' in rest_lower and 'default ' in rest_lower
            columns.append(Column(col_name, pg_type, nullable, has_default))
        tables[name] = columns
    return tables


def render_object(columns: list[Column], mode: str) -> str:
    lines: list[str] = []
    for col in columns:
        base = ts_type(col.pg_type)
        value_type = f'{base} | null' if col.nullable else base
        if mode == 'Row':
            optional = ''
        elif mode == 'Insert':
            optional = '?' if col.nullable or col.has_default else ''
        elif mode == 'Update':
            optional = '?'
        else:
            raise ValueError(mode)
        lines.append(f'          {col.name}{optional}: {value_type}')
    return '\n'.join(lines)


def main() -> None:
    sql = DDL.read_text(encoding='utf-8')
    tables = parse_tables(sql)
    if len(tables) != 45:
        raise SystemExit(f'Expected 45 tables, found {len(tables)}')

    out: list[str] = [
        '// AUTO-GENERATED from database/baseline/phase1_2_schema.sql by database/scripts/generate_types_from_baseline.py.',
        '// Phase 1.4 freezes this full 45-table snapshot; do not hand-edit.',
        '',
        'export type Json =',
        '  | string',
        '  | number',
        '  | boolean',
        '  | null',
        '  | { [key: string]: Json | undefined }',
        '  | Json[]',
        '',
        'export type Database = {',
        '  __InternalSupabase: { PostgrestVersion: \"14.5\" }',
        '  public: {',
        '    Tables: {',
    ]
    for name, columns in tables.items():
        out.extend([
            f'      {name}: {{',
            '        Row: {',
            render_object(columns, 'Row'),
            '        }',
            '        Insert: {',
            render_object(columns, 'Insert'),
            '        }',
            '        Update: {',
            render_object(columns, 'Update'),
            '        }',
            '        Relationships: []',
            '      }',
        ])
    out.extend([
        '    }',
        '    Views: Record<string, never>',
        '    Functions: {',
        '      bootstrap_personal_workspace: {',
        '        Args: { p_display_name: string; p_workspace_name?: string }',
        '        Returns: string',
        '      }',
        '    }',
        '    Enums: Record<string, never>',
        '    CompositeTypes: Record<string, never>',
        '  }',
        '}',
        '',
        'export type PublicTables = Database[\'public\'][\'Tables\']',
        'export type PublicTableName = keyof PublicTables',
        'export type TableRow<T extends PublicTableName> = PublicTables[T][\'Row\']',
        'export type TableInsert<T extends PublicTableName> = PublicTables[T][\'Insert\']',
        'export type TableUpdate<T extends PublicTableName> = PublicTables[T][\'Update\']',
        '',
    ])
    OUT.write_text('\n'.join(out), encoding='utf-8')
    print(f'Generated {OUT.relative_to(ROOT)} with {len(tables)} tables')

if __name__ == '__main__':
    main()
