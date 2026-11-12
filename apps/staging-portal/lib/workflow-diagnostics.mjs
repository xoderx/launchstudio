const categories = new Map([
  ['SELF_SIGNED_CERT_IN_CHAIN', 'tls_certificate'],
  ['DEPTH_ZERO_SELF_SIGNED_CERT', 'tls_certificate'],
  ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'tls_certificate'],
  ['UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'tls_certificate'],
  ['CERT_HAS_EXPIRED', 'tls_certificate'],
  ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls_certificate'],
  ['ENOTFOUND', 'dns'], ['EAI_AGAIN', 'dns'],
  ['ECONNREFUSED', 'connection'], ['ECONNRESET', 'connection'],
  ['ENETUNREACH', 'connection'], ['EHOSTUNREACH', 'connection'],
  ['ETIMEDOUT', 'timeout'], ['57014', 'timeout'],
  ['28P01', 'database_authentication'], ['28000', 'database_authentication'],
  ['42501', 'database_permission'],
  ['42P01', 'database_schema'], ['42703', 'database_schema'],
  ['26000', 'prepared_statement'], ['42P05', 'prepared_statement'],
  ['08P01', 'database_protocol'], ['0A000', 'unsupported_feature'],
  ['53300', 'database_capacity'],
]);

function category(stage, error) {
  for (let current = error, i = 0; current && i < 4; current = current.cause, i++) {
    const known = categories.get(current.code);
    if (known) return known;
    if (current.name === 'TimeoutError') return 'timeout';
    // pg-pool reports connection timeouts without an error code.
    if (current.message === 'timeout exceeded when trying to connect' ||
        current.message === 'Connection terminated due to connection timeout') return 'timeout';
  }
  if (stage === 'public_config' || stage === 'database_config') return 'configuration';
  if (stage === 'session_verification') return 'auth_upstream';
  if (stage === 'workflow_dispatch') return 'workflow_runtime';
  return 'unexpected';
}

export async function workflowStage(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    // Serialize only fixed labels. Driver/SDK messages and causes can contain secrets.
    console.error(JSON.stringify({ event: 'assessment_workflow_failure', stage, category: category(stage, error) }));
    throw error;
  }
}
