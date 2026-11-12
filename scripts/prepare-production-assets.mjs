import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git('status','--porcelain')) throw Error('Commit the reviewed source before packaging. Working tree must be clean.');
const commit=git('rev-parse','HEAD');
const output=resolve(root,'work','production-release',commit);
mkdirSync(output,{recursive:true});
// Do not import deployment credentials into a local compilation or archive.
// A true Vercel production deployment must rebuild with its reviewed target env.
execFileSync('npm',['run','build'],{cwd:join(root,'apps/staging-portal'),stdio:'inherit',env:{...process.env,VERCEL_ENV:'production',LAUNCHSTUDIO_MARKETING_INDEXABLE:'false'}});
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
const migrations=readdirSync(join(root,'staging/supabase/migrations')).filter(f=>f.endsWith('.sql')).sort().map(file=>({file,sha256:checksum(readFileSync(join(root,'staging/supabase/migrations',file)))}));
execFileSync('git',['archive','--format=tar.gz',`--output=${join(output,'source.tar.gz')}`,commit],{cwd:root});
copyFileSync(join(root,'release/production.env.example'),join(output,'production.env.example'));
writeFileSync(join(output,'manifest.json'),JSON.stringify({commit,createdAt:new Date().toISOString(),node:process.version,target:'production-local-compilation',build:'PASS',indexable:false,sourceSha256:checksum(readFileSync(join(output,'source.tar.gz'))),migrations,productionDeployment:false,productionCredentialsVerified:false,schemaComplete:false,releaseApproved:false,notes:['Source archive contains committed files only; no local env files or build caches.','Local Next.js output remains in apps/staging-portal/.next; this archive is not a Vercel --prebuilt deployment.','Hosted-only qcue_bridge_initial must be reconciled before production migration.','Rebuild on Vercel with approved Production variables; test the unaliased production deployment before promotion.']},null,2)+'\n');
console.log(`Production preparation assets: ${output}`);
