import { withWorkflow } from 'workflow/next';

export default withWorkflow({
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  async headers() {
    const indexable = process.env.VERCEL_ENV === 'production' &&
      process.env.LAUNCHSTUDIO_MARKETING_INDEXABLE === 'true' && Boolean(process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL);
    const noindex = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };
    return [{ source: '/:path*', headers: [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] }, ...(indexable
      ? ['/app/:path*','/login','/api/:path*','/privacy','/terms','/ai-disclaimer'].map(source => ({source,headers:[noindex]}))
      : [{source:'/:path*',headers:[noindex]}])];
  },
});
