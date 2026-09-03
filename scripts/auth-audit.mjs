import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.cwd());
const files = {
  env: await readFile(resolve(root, 'src/core/config/env.ts'), 'utf8'),
  client: await readFile(resolve(root, 'src/core/supabase/client.ts'), 'utf8'),
  auth: await readFile(resolve(root, 'src/features/auth/services/authService.ts'), 'utf8'),
  authGateway: await readFile(resolve(root, 'src/core/auth/SupabaseAuthGateway.ts'), 'utf8'),
  routes: await readFile(resolve(root, 'src/core/routing/routes.ts'), 'utf8'),
  migration: await readFile(resolve(root, 'database/migrations/phase_1_3_auth_workspace_bootstrap.sql'), 'utf8'),
  example: await readFile(resolve(root, '.env.example'), 'utf8'),
};

const checks = [
  ['publishable key prefix enforced', files.env.includes("startsWith('sb_publishable_')")],
  ['secret/service client key absent', !/sb_secret_|service[_-]?role|VITE_SUPABASE_SECRET/i.test(Object.values(files).join('\n'))],
  ['PKCE enabled', /flowType:\s*'pkce'/.test(files.client)],
  ['session persistence enabled', /persistSession:\s*true/.test(files.client)],
  ['automatic token refresh enabled', /autoRefreshToken:\s*true/.test(files.client)],
  ['redirect auth detection enabled', /detectSessionInUrl:\s*true/.test(files.client)],
  ['server-verified user lookup used', /auth\.getUser\(\)/.test(files.authGateway)],
  ['password reset implemented', /resetPasswordForEmail/.test(files.authGateway)],
  ['feature auth service is Supabase-decoupled', !/supabase/i.test(files.auth)],
  ['bootstrap is security invoker', /security\s+invoker/i.test(files.migration)],
  ['bootstrap is not security definer', !/security\s+definer/i.test(files.migration)],
  ['bootstrap public execution revoked', /revoke all on function public\.bootstrap_personal_workspace\(text, text\) from public/i.test(files.migration)],
  ['bootstrap anon execution revoked', /revoke all on function public\.bootstrap_personal_workspace\(text, text\) from anon/i.test(files.migration)],
  ['bootstrap authenticated execution explicit', /grant execute on function public\.bootstrap_personal_workspace\(text, text\) to authenticated/i.test(files.migration)],
  ['auth routes present', ['/auth/login','/auth/signup','/auth/forgot-password','/auth/update-password'].every((route) => files.routes.includes(route))],
  ['example contains placeholders only', !files.example.includes('juzxriirhkuzviwnhkbd') && !/sb_publishable_[A-Za-z0-9_-]{20,}/.test(files.example.replace('sb_publishable_REPLACE_ME',''))],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error('ENJAZ AUTH AUDIT FAIL');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}
console.log(`ENJAZ AUTH AUDIT PASS — ${checks.length}/${checks.length} auth/security invariants satisfied.`);
