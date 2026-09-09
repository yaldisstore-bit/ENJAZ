import { buildTransactionListPreviewSource } from '../../features/transactions/transactionListPreview.ts';
import type { SearchableRecord } from './find-anything-model.ts';

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
