import assert from 'node:assert/strict';import {test} from 'node:test';
import {indexable,siteOrigin,pageMetadata,robotsDefinition,routes} from './marketing-seo.mjs';
test('Preview cannot be indexed; production indexing requires explicit approval and a canonical origin',t=>{
 const keys=['VERCEL_ENV','LAUNCHSTUDIO_MARKETING_INDEXABLE','LAUNCHSTUDIO_PUBLIC_SITE_URL'];const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));t.after(()=>{for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}});
 process.env.VERCEL_ENV='preview';process.env.LAUNCHSTUDIO_MARKETING_INDEXABLE='true';process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL='https://launch.example';assert.equal(indexable(),false);assert.equal(robotsDefinition().rules.disallow,'/');assert.equal(pageMetadata('Title','Description').robots.index,false);
 process.env.VERCEL_ENV='production';assert.equal(indexable(),true);assert.equal(pageMetadata('Tools','Description','/tools').alternates.canonical,'https://launch.example/tools');assert.ok(robotsDefinition().rules.disallow.includes('/app'));assert.ok(robotsDefinition().rules.disallow.includes('/api/'));
 process.env.LAUNCHSTUDIO_MARKETING_INDEXABLE='false';assert.equal(indexable(),false);
 process.env.LAUNCHSTUDIO_PUBLIC_SITE_URL='https://launch.example/wrong-path';assert.throws(siteOrigin,/HTTPS origin/);
 assert.equal(routes.length,13);assert.ok(!routes.some(path=>['/app','/login'].includes(path)));
});
