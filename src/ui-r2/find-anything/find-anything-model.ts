import {
  R2_DESTINATIONS,
  R2_SEARCH_ALIASES,
  getR2Destination,
  type R2DestinationId,
} from '../architecture/navigation-contract.ts';
import { buildTransactionListPreviewSource } from '../../features/transactions/transactionListPreview.ts';

export type R2FindAnythingKind = 'feature' | 'transaction';
export type R2FindAnythingSource = 'navigation' | 'preview-record';

export type R2FindAnythingResult = {
  key: string;
  kind: R2FindAnythingKind;
  label: string;
  secondary: string;
  destinationId: R2DestinationId;
  transactionId: string | null;
  source: R2FindAnythingSource;
  score: number;
};

type SearchableRecord = {
  key: string;
  kind: 'transaction';
  label: string;
  secondary: string;
  destinationId: 'transactions.detail';
  transactionId: string;
  terms: readonly string[];
};

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const SPACE = /\s+/g;

export function normalizeR2Search(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ar-IQ')
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(SPACE, ' ')
    .trim();
}

function tokenScore(query: string, terms: readonly string[]): number {
  if (!query) return 0;
  let best = 0;
  const queryTokens = query.split(' ').filter(Boolean);
  for (const rawTerm of terms) {
    const term = normalizeR2Search(rawTerm);
    if (!term) continue;
    if (term === query) best = Math.max(best, 100);
    else if (term.startsWith(query)) best = Math.max(best, 84);
    else if (term.includes(query)) best = Math.max(best, 72);
    else if (queryTokens.length > 1 && queryTokens.every((token) => term.includes(token))) best = Math.max(best, 62);
  }
  return best;
}

function buildFeatureResults(query: string): R2FindAnythingResult[] {
  const aliasTargets = new Map<R2DestinationId, string[]>();
  for (const [alias, id] of Object.entries(R2_SEARCH_ALIASES)) {
    const current = aliasTargets.get(id) ?? [];
    current.push(alias);
    aliasTargets.set(id, current);
  }

  return R2_DESTINATIONS
    .filter((item) => item.kind !== 'system_boundary')
    .map((item) => {
      const aliases = aliasTargets.get(item.id) ?? [];
      const score = tokenScore(query, [item.label, item.id, ...aliases]);
      return {
        key: `feature:${item.id}`,
        kind: 'feature' as const,
        label: item.label,
        secondary: item.kind === 'launcher_destination' ? 'ميزة · منزل قانوني واحد' : 'وجهة نظام',
        destinationId: item.id,
        transactionId: null,
        source: 'navigation' as const,
        score,
      };
    })
    .filter((item) => item.score > 0);
}

export function buildR2PreviewSearchRecords(): readonly SearchableRecord[] {
  const source = buildTransactionListPreviewSource();
  const companies = new Map(source.companies.map((company) => [company.id, company]));
  return source.transactions
    .filter((transaction) => !transaction.deleted_at)
    .slice(0, 80)
    .map((transaction) => {
      const company = companies.get(transaction.company_id);
      const companyLabel = company?.display_name || company?.legal_name || 'شركة غير متاحة';
      const shortId = transaction.legacy_id || transaction.id.slice(0, 8);
      return {
        key: `transaction:${transaction.id}`,
        kind: 'transaction' as const,
        label: `#${shortId} · ${transaction.type}`,
        secondary: `${companyLabel} · ${transaction.department || 'جهة غير محددة'} · عينة Preview`,
        destinationId: 'transactions.detail' as const,
        transactionId: transaction.id,
        terms: [shortId, transaction.id, transaction.type, transaction.department || '', companyLabel],
      };
    });
}

function buildRecordResults(query: string, records: readonly SearchableRecord[]): R2FindAnythingResult[] {
  return records
    .map((record) => ({
      key: record.key,
      kind: record.kind,
      label: record.label,
      secondary: record.secondary,
      destinationId: record.destinationId,
      transactionId: record.transactionId,
      source: 'preview-record' as const,
      score: tokenScore(query, record.terms),
    }))
    .filter((item) => item.score > 0);
}

const DEFAULT_SHORTCUTS: readonly R2DestinationId[] = [
  'transactions',
  'today',
  'companies',
  'finance',
  'automation',
  'documents',
];

export function buildR2FindAnythingResults(
  rawQuery: string,
  options: { limit?: number; records?: readonly SearchableRecord[] } = {},
): readonly R2FindAnythingResult[] {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 20);
  const query = normalizeR2Search(rawQuery);

  if (!query) {
    return DEFAULT_SHORTCUTS.slice(0, limit).map((id, index) => {
      const destination = getR2Destination(id);
      return {
        key: `feature:${id}`,
        kind: 'feature',
        label: destination.label,
        secondary: 'اختصار سريع · منزل قانوني واحد',
        destinationId: id,
        transactionId: null,
        source: 'navigation',
        score: 100 - index,
      };
    });
  }

  const records = options.records ?? buildR2PreviewSearchRecords();
  return [...buildRecordResults(query, records), ...buildFeatureResults(query)]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'ar'))
    .slice(0, limit);
}
