export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;

export type ReportPdfLayoutProfile = Readonly<{
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginInlineStart: number;
  marginInlineEnd: number;
  footerHeight: number;
  signatureHeight: number;
  identityHeight: number;
  reservedGap: number;
}>;

export const DEFAULT_REPORT_PDF_LAYOUT: ReportPdfLayoutProfile = Object.freeze({
  pageWidth: A4_WIDTH_PT,
  pageHeight: A4_HEIGHT_PT,
  marginTop: 42,
  marginBottom: 34,
  marginInlineStart: 42,
  marginInlineEnd: 42,
  footerHeight: 24,
  signatureHeight: 58,
  identityHeight: 44,
  reservedGap: 8,
});

export type AtomicReportPdfBlock = Readonly<{
  kind: 'atomic';
  id: string;
  height: number;
}>;

export type FlowReportPdfBlock = Readonly<{
  kind: 'flow';
  id: string;
  height: number;
  minFragmentHeight?: number;
}>;

export type ReportPdfTableRow = Readonly<{
  id: string;
  height: number;
}>;

export type TableReportPdfBlock = Readonly<{
  kind: 'table';
  id: string;
  headerHeight: number;
  rows: readonly ReportPdfTableRow[];
}>;

export type ReportPdfBlock = AtomicReportPdfBlock | FlowReportPdfBlock | TableReportPdfBlock;

export type ReportPdfFragment = Readonly<{
  blockId: string;
  fragmentId: string;
  kind: ReportPdfBlock['kind'];
  y: number;
  height: number;
  rowIds?: readonly string[];
  repeatsTableHeader?: boolean;
}>;

export type ReportPdfReservedZones = Readonly<{
  bodyTop: number;
  bodyBottom: number;
  signatureTop: number;
  identityTop: number;
  footerTop: number;
}>;

export type ReportPdfPagePlan = Readonly<{
  pageNumber: number;
  fragments: readonly ReportPdfFragment[];
  zones: ReportPdfReservedZones;
}>;

export class ReportPdfContractError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ReportPdfContractError';
    this.code = code;
  }
}

function finitePositive(name: string, value: number, allowZero = false): void {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new ReportPdfContractError('REPORT_PDF_LAYOUT_INVALID', `${name} must be ${allowZero ? 'non-negative' : 'positive'} and finite`);
  }
}

function blockId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 160 || /[\r\n\u0000]/u.test(normalized)) {
    throw new ReportPdfContractError('REPORT_PDF_ID_INVALID', `${label} is invalid`);
  }
  return normalized;
}

export function reportPdfReservedZones(profile: ReportPdfLayoutProfile = DEFAULT_REPORT_PDF_LAYOUT): ReportPdfReservedZones {
  finitePositive('pageWidth', profile.pageWidth);
  finitePositive('pageHeight', profile.pageHeight);
  finitePositive('marginTop', profile.marginTop, true);
  finitePositive('marginBottom', profile.marginBottom, true);
  finitePositive('marginInlineStart', profile.marginInlineStart, true);
  finitePositive('marginInlineEnd', profile.marginInlineEnd, true);
  finitePositive('footerHeight', profile.footerHeight, true);
  finitePositive('signatureHeight', profile.signatureHeight, true);
  finitePositive('identityHeight', profile.identityHeight, true);
  finitePositive('reservedGap', profile.reservedGap, true);

  if (profile.marginInlineStart + profile.marginInlineEnd >= profile.pageWidth) {
    throw new ReportPdfContractError('REPORT_PDF_LAYOUT_INVALID', 'horizontal margins consume the page');
  }

  const footerTop = profile.pageHeight - profile.marginBottom - profile.footerHeight;
  const identityTop = footerTop - profile.reservedGap - profile.identityHeight;
  const signatureTop = identityTop - profile.reservedGap - profile.signatureHeight;
  const bodyBottom = signatureTop - profile.reservedGap;
  const bodyTop = profile.marginTop;
  if (bodyBottom <= bodyTop) {
    throw new ReportPdfContractError('REPORT_PDF_LAYOUT_INVALID', 'reserved zones leave no printable body');
  }
  return Object.freeze({ bodyTop, bodyBottom, signatureTop, identityTop, footerTop });
}

function validateBlocks(blocks: readonly ReportPdfBlock[]): void {
  const seen = new Set<string>();
  for (const block of blocks) {
    const id = blockId(block.id, 'block id');
    if (seen.has(id)) throw new ReportPdfContractError('REPORT_PDF_ID_DUPLICATE', `duplicate block id: ${id}`);
    seen.add(id);
    if (block.kind === 'table') {
      finitePositive('table header height', block.headerHeight);
      const rowSeen = new Set<string>();
      for (const row of block.rows) {
        const rowId = blockId(row.id, 'table row id');
        if (rowSeen.has(rowId)) throw new ReportPdfContractError('REPORT_PDF_ID_DUPLICATE', `duplicate table row id: ${rowId}`);
        rowSeen.add(rowId);
        finitePositive('table row height', row.height);
      }
    } else {
      finitePositive('block height', block.height);
      if (block.kind === 'flow' && block.minFragmentHeight !== undefined) finitePositive('minimum fragment height', block.minFragmentHeight);
    }
  }
}

function splitFlow(total: number, available: number, capacity: number, minimum: number): readonly number[] {
  const parts: number[] = [];
  let remaining = total;
  let firstAvailable = available;
  while (remaining > 0.0001) {
    let slot = firstAvailable;
    if (slot < minimum) slot = capacity;
    if (slot < minimum) throw new ReportPdfContractError('REPORT_PDF_LAYOUT_INVALID', 'body capacity is smaller than minimum fragment height');
    let take = Math.min(slot, remaining);
    const rest = remaining - take;
    if (rest > 0 && rest < minimum && take - (minimum - rest) >= minimum) take -= minimum - rest;
    if (take < minimum && remaining > minimum) {
      firstAvailable = capacity;
      continue;
    }
    parts.push(take);
    remaining -= take;
    firstAvailable = capacity;
  }
  return parts;
}

export function planReportPdfPages(
  blocks: readonly ReportPdfBlock[],
  profile: ReportPdfLayoutProfile = DEFAULT_REPORT_PDF_LAYOUT,
): readonly ReportPdfPagePlan[] {
  validateBlocks(blocks);
  const zones = reportPdfReservedZones(profile);
  const capacity = zones.bodyBottom - zones.bodyTop;
  const pages: { pageNumber: number; fragments: ReportPdfFragment[]; zones: ReportPdfReservedZones }[] = [];

  const current = () => pages.at(-1);
  const ensurePage = () => {
    if (!current()) pages.push({ pageNumber: 1, fragments: [], zones });
    return current()!;
  };
  const newPage = () => {
    pages.push({ pageNumber: pages.length + 1, fragments: [], zones });
    return current()!;
  };
  const cursor = (page = ensurePage()) => page.fragments.length
    ? page.fragments[page.fragments.length - 1]!.y + page.fragments[page.fragments.length - 1]!.height
    : zones.bodyTop;
  const remaining = (page = ensurePage()) => zones.bodyBottom - cursor(page);
  const place = (page: { fragments: ReportPdfFragment[] }, fragment: Omit<ReportPdfFragment, 'y'>) => {
    const y = cursor(page as ReturnType<typeof ensurePage>);
    if (y + fragment.height > zones.bodyBottom + 0.0001) {
      throw new ReportPdfContractError('REPORT_PDF_OVERFLOW', `fragment ${fragment.fragmentId} exceeds body bounds`);
    }
    page.fragments.push(Object.freeze({ ...fragment, y }));
  };

  for (const block of blocks) {
    if (block.kind === 'atomic') {
      if (block.height > capacity + 0.0001) {
        throw new ReportPdfContractError('REPORT_PDF_BLOCK_TOO_TALL', `atomic block ${block.id} cannot fit on one page`);
      }
      let page = ensurePage();
      if (remaining(page) + 0.0001 < block.height) page = newPage();
      place(page, { blockId: block.id, fragmentId: `${block.id}:0`, kind: 'atomic', height: block.height });
      continue;
    }

    if (block.kind === 'flow') {
      const minimum = Math.min(block.minFragmentHeight ?? 24, capacity);
      let page = ensurePage();
      const parts = splitFlow(block.height, remaining(page), capacity, minimum);
      for (let index = 0; index < parts.length; index += 1) {
        const height = parts[index]!;
        if (remaining(page) + 0.0001 < height) page = newPage();
        place(page, { blockId: block.id, fragmentId: `${block.id}:${index}`, kind: 'flow', height });
        if (index < parts.length - 1) page = newPage();
      }
      continue;
    }

    if (block.rows.length === 0) {
      if (block.headerHeight > capacity + 0.0001) {
        throw new ReportPdfContractError('REPORT_PDF_BLOCK_TOO_TALL', `table header ${block.id} cannot fit on one page`);
      }
      let page = ensurePage();
      if (remaining(page) + 0.0001 < block.headerHeight) page = newPage();
      place(page, { blockId: block.id, fragmentId: `${block.id}:0`, kind: 'table', height: block.headerHeight, rowIds: [], repeatsTableHeader: true });
      continue;
    }

    const maxRow = capacity - block.headerHeight;
    if (maxRow <= 0) throw new ReportPdfContractError('REPORT_PDF_BLOCK_TOO_TALL', `table header ${block.id} leaves no row capacity`);
    for (const row of block.rows) {
      if (row.height > maxRow + 0.0001) {
        throw new ReportPdfContractError('REPORT_PDF_ROW_TOO_TALL', `table row ${row.id} cannot fit with its repeated header`);
      }
    }

    let rowIndex = 0;
    let fragmentIndex = 0;
    let page = ensurePage();
    while (rowIndex < block.rows.length) {
      const firstRow = block.rows[rowIndex]!;
      if (remaining(page) + 0.0001 < block.headerHeight + firstRow.height) page = newPage();
      const rowIds: string[] = [];
      let height = block.headerHeight;
      while (rowIndex < block.rows.length) {
        const row = block.rows[rowIndex]!;
        if (height + row.height > remaining(page) + 0.0001) break;
        height += row.height;
        rowIds.push(row.id);
        rowIndex += 1;
      }
      if (rowIds.length === 0) {
        page = newPage();
        continue;
      }
      place(page, {
        blockId: block.id,
        fragmentId: `${block.id}:${fragmentIndex}`,
        kind: 'table',
        height,
        rowIds: Object.freeze(rowIds),
        repeatsTableHeader: true,
      });
      fragmentIndex += 1;
      if (rowIndex < block.rows.length) page = newPage();
    }
  }

  const frozen = pages.filter((page) => page.fragments.length > 0).map((page, index) => Object.freeze({
    pageNumber: index + 1,
    fragments: Object.freeze([...page.fragments]),
    zones: page.zones,
  }));
  assertReportPdfPlanSafe(frozen, profile);
  return Object.freeze(frozen);
}

export function assertReportPdfPlanSafe(
  pages: readonly ReportPdfPagePlan[],
  profile: ReportPdfLayoutProfile = DEFAULT_REPORT_PDF_LAYOUT,
): void {
  const zones = reportPdfReservedZones(profile);
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex]!;
    if (page.pageNumber !== pageIndex + 1) throw new ReportPdfContractError('REPORT_PDF_PAGE_SEQUENCE_INVALID', 'page numbers are not contiguous');
    if (page.fragments.length === 0) throw new ReportPdfContractError('REPORT_PDF_BLANK_PAGE', `blank page ${page.pageNumber} is forbidden`);
    let cursor = zones.bodyTop;
    for (const fragment of page.fragments) {
      if (fragment.y < zones.bodyTop - 0.0001 || fragment.y + fragment.height > zones.bodyBottom + 0.0001) {
        throw new ReportPdfContractError('REPORT_PDF_OVERFLOW', `fragment ${fragment.fragmentId} enters a reserved zone`);
      }
      if (fragment.y < cursor - 0.0001) throw new ReportPdfContractError('REPORT_PDF_OVERLAP', `fragment ${fragment.fragmentId} overlaps previous content`);
      cursor = fragment.y + fragment.height;
    }
  }
}

export type ReportPdfIdentityInput = Readonly<{
  workspaceId: string;
  reportKind: string;
  reportId: string;
  fingerprint: string;
  version?: number;
}>;

function identityToken(value: string, label: string, max = 160): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !/^[A-Za-z0-9._-]+$/u.test(normalized)) {
    throw new ReportPdfContractError('REPORT_PDF_IDENTITY_INVALID', `${label} is not a stable identity token`);
  }
  return normalized;
}

export function buildReportPdfIdentity(input: ReportPdfIdentityInput): string {
  const workspace = identityToken(input.workspaceId, 'workspaceId');
  const kind = identityToken(input.reportKind, 'reportKind', 80);
  const report = identityToken(input.reportId, 'reportId');
  const fingerprint = identityToken(input.fingerprint, 'fingerprint', 256);
  const version = input.version ?? 1;
  if (!Number.isSafeInteger(version) || version < 1) throw new ReportPdfContractError('REPORT_PDF_IDENTITY_INVALID', 'version must be a positive safe integer');
  const payload = `ENJAZ:REPORT:v${version}:${workspace}:${kind}:${report}:${fingerprint}`;
  if (payload.length > 640) throw new ReportPdfContractError('REPORT_PDF_IDENTITY_INVALID', 'identity payload is too large');
  return payload;
}
