import { withWorkflow } from 'workflow/next';

export default withWorkflow({
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] }];
  },
});
