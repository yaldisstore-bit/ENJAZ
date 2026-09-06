import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../../data/createDataLayer.ts';
import { createPhase62PreviewDataFactory, PHASE62_PREVIEW_USER_ID } from '../contacts/contactPreviewDataLayer.ts';

export const PHASE63_PREVIEW_USER_ID = PHASE62_PREVIEW_USER_ID;

const emptyRepository = Object.freeze({
  async list(request: Readonly<{ offset?: number; limit?: number }> = {}) {
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 100;
    return Object.freeze({ items: Object.freeze([]), offset, limit, total: 0, hasMore: false });
  },
  async getById() { return null; },
});

export function createPhase63PreviewDataFactory(): EnjazDataLayerFactory {
  const base = createPhase62PreviewDataFactory();
  return Object.freeze({
    resolveWorkspaceId(userId: string) { return base.resolveWorkspaceId(userId); },
    forWorkspace(workspaceId: string): EnjazWorkspaceDataLayer {
      const layer = base.forWorkspace(workspaceId);
      return Object.freeze({ ...layer, documents: emptyRepository, blockers: emptyRepository }) as unknown as EnjazWorkspaceDataLayer;
    },
  });
}
