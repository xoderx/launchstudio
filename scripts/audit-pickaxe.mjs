import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const registry=JSON.parse(readFileSync(join(root,'catalog/agent-registry.json')));
const inventory=JSON.parse(readFileSync(join(root,'catalog/inventory.json')));
const files=[];
function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next','public'].includes(item.name))continue;const path=join(dir,item.name);if(item.isDirectory())scan(path);else if(/\.(mjs|jsx|js|json)$/.test(item.name)){const lines=readFileSync(path,'utf8').split('\n');const references=lines.flatMap((line,i)=>/pickaxe|STUDIOSAG26QENFZXNY0957VNT|YL7LGN8AV2|RYAET6419X|SCV7PECQF3/i.test(line)?[i+1]:[]);if(references.length)files.push({path:relative(root,path),lines:references,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}}}
scan(join(root,'apps/staging-portal'));scan(join(root,'staging'));scan(join(root,'site'));
const out={generatedAt:new Date().toISOString(),secretValuesExported:false,
 agents:registry.agents.map(a=>({position:a.position,name:a.name,id:a.id??null,commanderId:a.commanderId??null,promptFile:a.promptFile??null,
  modelSnapshot:inventory.mapped?.find(x=>x.position===a.position)?.model??null,
  execution:a.position<=2?'existing assessment workflow':a.id==='SCV7PECQF3'?'paused pilot':'API entitlement unverified; manual workspace'})),
 endpoints:['POST https://api.pickaxe.co/v1/completions','GET https://api.pickaxe.co/v1/completions/{submissionId}'],
 credentials:['PICKAXE_STAGING_API_KEY','PICKAXE_STAGING_WORKSPACE_ID','PICKAXE_PRODUCTION_API_KEY','PICKAXE_PRODUCTION_WORKSPACE_ID'],
 references:files,
 caveats:['Model snapshots are archived metadata, not current routing promises.','Provider execution entitlement, remaining credits and membership/billing mapping are not proven by metadata.','Do not cancel memberships, change prompts or switch traffic using this audit.','Workspace IDs and keys are server secret bindings, not exported values.']};
mkdirSync(join(root,'docs/lifecycle'),{recursive:true});writeFileSync(join(root,'docs/lifecycle/pickaxe-inventory.json'),JSON.stringify(out,null,2)+'\n');
console.log(`Audited ${out.agents.length} registry positions and ${files.length} source references; no secret values exported.`);
