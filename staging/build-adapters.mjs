// Capability descriptions, not connected execution clients. No credentials are
// accepted in browser drafts, exports, or this manifest.
export const buildAdapters = [
  { key: 'github', name: 'GitHub', status: 'not connected', format: 'md',
    permission: 'Selected repository contents and pull-request access; no account-wide write scope.' },
  { key: 'lovable', name: 'Lovable', status: 'not connected', format: 'txt',
    permission: 'Explicit project authorization through a documented provider interface.' },
  { key: 'vibe-sdk', name: 'Vibe SDK', status: 'not connected', format: 'txt',
    permission: 'Verified SDK identity, sandbox target and build permissions.' },
  { key: 'codex', name: 'Codex', status: 'not connected', format: 'md',
    permission: 'Authorized workspace and repository branch; deployment requires separate approval.' },
];

export function externalActionRequest({ provider, artifactId, version, action, target }) {
  if (!buildAdapters.some(adapter => adapter.key === provider) ||
      !['repository-write', 'deploy', 'delete', 'production-change'].includes(action) ||
      !artifactId || !Number.isInteger(version) || version < 1 || !target) throw Error('Invalid external action');
  return { provider, artifactId, version, action, target,
    status: 'not connected', approvalRequired: true, executed: false };
}

export async function executeExternalAction() {
  throw Error('External execution unavailable. Export the artifact for an authorized manual handoff.');
}
