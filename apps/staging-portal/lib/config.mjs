const stagingOrigin = 'https://exghrllltefuhsgnagym.supabase.co';

export function audienceEnabled() {
  return process.env.VERCEL_ENV === 'preview' && process.env.AUDIENCE_DNA_ENABLED === 'true' &&
    Boolean(process.env.AUDIENCE_DNA_PILOT_PROJECT_ID);
}

export function publicConfig() {
  if (process.env.VERCEL_ENV === 'production' ||
      process.env.SUPABASE_URL?.replace(/\/$/, '') !== stagingOrigin ||
      !process.env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
    throw new Error('Staging Supabase configuration required');
  }
  return { url: stagingOrigin, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY, audienceDNA: audienceEnabled() };
}
