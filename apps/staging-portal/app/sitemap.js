import { routes,siteOrigin } from './marketing/content.mjs';
export default function sitemap(){return routes.map(path=>({url:siteOrigin()+path,changeFrequency:'monthly',priority:path==='/'?1:0.7}));}
