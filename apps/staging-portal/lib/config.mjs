export const stagingProjectRef = 'exghrllltefuhsgnagym';
const stagingOrigin = `https://${stagingProjectRef}.supabase.co`;

export function projectReference() {
  if (process.env.VERCEL_ENV !== 'production') return stagingProjectRef;
  const reference = process.env.LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF?.trim();
  if (!/^[a-z]{20}$/.test(reference ?? '') || reference === stagingProjectRef) {
    throw new Error('A separate production Supabase project reference is required');
  }
  return reference;
}

export function audienceEnabled() {
  return process.env.VERCEL_ENV === 'preview' && process.env.AUDIENCE_DNA_ENABLED === 'true' &&
    Boolean(process.env.AUDIENCE_DNA_PILOT_PROJECT_ID);
}

export function publicConfig() {
  const reference = projectReference();
  const origin = process.env.VERCEL_ENV === 'production'
    ? `https://${reference}.supabase.co` : stagingOrigin;
  if (process.env.SUPABASE_URL?.replace(/\/$/, '') !== origin ||
      !process.env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
    throw new Error('Supabase configuration must match the deployment environment');
  }
  return { url: origin, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY, audienceDNA: audienceEnabled() };
}
