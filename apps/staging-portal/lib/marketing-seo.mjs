export const routes=['/','/product','/solutions','/tools','/academy','/covibecoder','/pricing','/about','/contact','/partners','/early-access'];
export function siteOrigin() {
  const configured=process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL;
  if(configured){const u=new URL(configured);if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash)throw Error('Public site URL must be an HTTPS origin');return u.origin;}
  return process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:'http://localhost:3000';
}
export const indexable=()=>process.env.VERCEL_ENV==='production'&&process.env.LAUNCHSTUDIO_MARKETING_INDEXABLE==='true'&&Boolean(process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL);
export function pageMetadata(title,description,path='/') {
  return {title:`${title} · LaunchStudio`,description,alternates:{canonical:siteOrigin()+path},robots:{index:indexable(),follow:indexable()},
    openGraph:{title:`${title} · LaunchStudio`,description,url:siteOrigin()+path,siteName:'LaunchStudio',type:'website',images:[{url:siteOrigin()+'/opengraph-image',width:1200,height:630,alt:'LaunchStudio — Stop collecting AI tools. Start building your business.'}]},
    twitter:{card:'summary_large_image',title:`${title} · LaunchStudio`,description,images:[siteOrigin()+'/opengraph-image']}};
}

export function robotsDefinition(){return {rules:indexable()?{userAgent:'*',allow:'/',disallow:['/app','/login','/api/','/privacy','/terms','/ai-disclaimer']}:{userAgent:'*',disallow:'/'},sitemap:siteOrigin()+'/sitemap.xml'};}
