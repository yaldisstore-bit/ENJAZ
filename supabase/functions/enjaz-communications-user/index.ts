import { createClient } from 'npm:@supabase/supabase-js@2.114.0';

type J = Record<string, unknown>;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};
const out = (status: number, body: J) => new Response(JSON.stringify(body), { status, headers: cors });
const uid = (value: unknown) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('INVALID_UUID');
  return value;
};
function serviceKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) try { const parsed = JSON.parse(modern) as Record<string, string>; if (parsed.default) return parsed.default; } catch { /* fall through */ }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  throw new Error('SERVER_SECRET_UNAVAILABLE');
}
function supabaseUrl() {
  const value = Deno.env.get('SUPABASE_URL');
  if (!value) throw new Error('SERVER_URL_UNAVAILABLE');
  return value.replace(/\/+$/, '');
}
function admin() {
  return createClient(supabaseUrl(), serviceKey(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function bearer(req: Request) {
  const value = req.headers.get('authorization') || '';
  return /^Bearer\s+.+$/i.test(value) ? value.replace(/^Bearer\s+/i, '').trim() : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return out(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const token = bearer(req);
    if (!token) return out(401, { ok: false, error: 'AUTH_REQUIRED' });
    const db = admin();
    const userResult = await db.auth.getUser(token);
    const user = userResult.data.user;
    if (userResult.error || !user) return out(401, { ok: false, error: 'AUTH_INVALID' });

    const body = await req.json() as J;
    const workspaceId = uid(body.workspaceId);
    const commandId = uid(body.commandId);
    const membership = await db.from('workspace_memberships').select('workspace_id').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data) return out(403, { ok: false, error: 'WORKSPACE_FORBIDDEN' });

    const command = await db.from('communication_outbound_commands').select('requested_by,status').eq('workspace_id', workspaceId).eq('id', commandId).maybeSingle();
    if (command.error) throw command.error;
    if (!command.data) return out(404, { ok: false, error: 'OUTBOUND_COMMAND_NOT_FOUND' });
    if (String(command.data.requested_by) !== user.id) return out(403, { ok: false, error: 'OUTBOUND_COMMAND_NOT_OWNED' });
    if (String(command.data.status) !== 'queued') return out(409, { ok: false, error: 'OUTBOUND_COMMAND_NOT_QUEUED' });

    const internalKey = Deno.env.get('ENJAZ_COMMUNICATIONS_INTERNAL_KEY') || '';
    if (internalKey.length < 32) return out(503, { ok: false, error: 'DISPATCH_BRIDGE_UNAVAILABLE' });
    const key = serviceKey();
    const response = await fetch(`${supabaseUrl()}/functions/v1/enjaz-communications?action=dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-enjaz-communications-key': internalKey,
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ workspaceId, commandId }),
    });
    const payload = await response.json().catch(() => ({ ok: false, error: 'DISPATCH_GATEWAY_INVALID_RESPONSE' })) as J;
    if (!response.ok) return out(response.status, { ok: false, error: String(payload.error || 'DISPATCH_FAILED') });
    return out(200, { ok: true, dispatch: payload.dispatch ?? null });
  } catch (error) {
    console.error('enjaz-communications-user bridge error', error);
    return out(500, { ok: false, error: 'STAFF_DISPATCH_ERROR' });
  }
});
