import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import type { CompanyDetailSource } from '../companies/companyService.ts';
import { loadCompanyDetailSource } from '../companies/companyService.ts';
import type { ContactProfileSource } from '../contacts/contactService.ts';
import { loadContactProfileSource } from '../contacts/contactService.ts';

export type Entity360Target = Readonly<{ kind: 'company' | 'contact'; id: string }>;
export type Entity360Counts = Readonly<{ transactions: number; companies: number; contacts: number; documents: number; openBlockers: number }>;
export type Entity360FinancialPulse = Readonly<{ amount: number | null; safe: boolean; partial: boolean }>;
export type Entity360Source =
  | Readonly<{ kind: 'company'; id: string; title: string; subtitle: string; status: string; company: CompanyDetailSource; counts: Entity360Counts; finance: Entity360FinancialPulse; truncatedScopes: readonly string[] }>
  | Readonly<{ kind: 'contact'; id: string; title: string; subtitle: string; status: string; contact: ContactProfileSource; counts: Entity360Counts; finance: Entity360FinancialPulse; truncatedScopes: readonly string[] }>;

function safeMoney(values: readonly number[]) {
  const amount = values.reduce((sum, value) => sum + value, 0);
  const safe = values.every((value) => Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100))) && Number.isSafeInteger(Math.round(amount * 100));
  return { amount: safe ? amount : null, safe };
}

export function buildCompany360Source(source: CompanyDetailSource): Entity360Source {
  const posted = source.payments.filter((row) => row.status.trim().toLowerCase() === 'posted'), money = safeMoney(posted.map((row) => row.amount)), company = source.company;
  return Object.freeze({ kind: 'company' as const, id: company.id, title: company.display_name?.trim() || company.legal_name, subtitle: company.legal_name, status: company.merged_into_id ? 'merged' : company.status, company: source,
    counts: Object.freeze({ transactions: source.transactions.length, companies: 1, contacts: source.contacts.length, documents: source.documents.length, openBlockers: source.blockers.filter((row) => !['resolved','closed','done'].includes(row.status.trim().toLowerCase())).length }),
    finance: Object.freeze({ amount: money.amount, safe: money.safe, partial: source.truncated.payments || source.truncated.ledger }),
    truncatedScopes: Object.freeze(Object.entries(source.truncated).filter(([, value]) => value).map(([key]) => key)) });
}

export function buildContact360Source(source: ContactProfileSource): Entity360Source {
  const money = safeMoney(source.transactions.map((row) => row.current_fee)), contact = source.contact;
  return Object.freeze({ kind: 'contact' as const, id: contact.id, title: contact.display_name, subtitle: contact.contact_type, status: contact.merged_into_id ? 'merged' : contact.status, contact: source,
    counts: Object.freeze({ transactions: source.transactions.length, companies: source.companyRelations.filter((row) => row.current).length, contacts: 1, documents: 0, openBlockers: 0 }),
    finance: Object.freeze({ amount: money.amount, safe: money.safe, partial: source.truncated.transactions }),
    truncatedScopes: Object.freeze([...(source.truncated.companyRelations ? ['companyRelations'] : []), ...(source.truncated.transactions ? ['transactions'] : [])]) });
}

export async function loadEntity360Source(factory: EnjazDataLayerFactory, userId: string, target: Entity360Target): Promise<Entity360Source> {
  const id = target.id.trim();
  if (!id) throw new Error('360 target id required');
  return target.kind === 'company'
    ? buildCompany360Source((await loadCompanyDetailSource(factory, userId, id)).source)
    : buildContact360Source((await loadContactProfileSource(factory, userId, id)).source);
}
