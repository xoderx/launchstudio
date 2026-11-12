'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
const legacy = new Set(['qcue','start-here','workspace','workflow','assessments','tools','tool-studio','ai-workspace','activity','account-settings','navigator','recipes','continue-working','recent-deliverables','covibecoder','business-settings','transform','enterprise-value']);
export default function LegacyLinks() {
  const router = useRouter();
  useEffect(() => {
    const route = () => {
      const fragment = location.hash.slice(1);
      if (legacy.has(fragment) || /^assessment-[a-f0-9-]+-\d+$/i.test(fragment)) router.replace('/app' + location.hash);
    };
    route(); window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, [router]);
  return null;
}
