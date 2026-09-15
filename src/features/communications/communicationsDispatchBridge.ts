import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';
import { CommunicationsHubCommandError, CommunicationsHubWorkspaceUnavailableError } from './communicationsHubService.ts';

export async function sendQueuedCommunication(factory: EnjazDataLayerFactory, userId: string, commandId: string): Promise<void> {
  if (!factory.edge) throw new CommunicationsHubCommandError('COMMUNICATIONS_EDGE_UNAVAILABLE');
  const workspaceId = await factory.resolveWorkspaceId(userId);
  if (!workspaceId) throw new CommunicationsHubWorkspaceUnavailableError();
  const response = await factory.edge('enjaz-communications-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, commandId }),
  });
  const payload = await response.json().catch(() => ({ error: 'COMMUNICATION_SEND_INVALID_RESPONSE' })) as Record<string, unknown>;
  if (!response.ok) throw new CommunicationsHubCommandError(String(payload.error || 'COMMUNICATION_SEND_FAILED'));
}
