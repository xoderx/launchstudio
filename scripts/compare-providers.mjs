import {readFileSync,writeFileSync} from 'node:fs';
import {compareExecutions} from '../apps/staging-portal/lib/ai-engine.mjs';
// Offline report only. Operators supply approved synthetic execution records.
// No dispatch, credentials, customer export or automatic provider cutover.
const fixture={id:'synthetic-transformation-brief-v1',sources:[{assessmentId:'synthetic-source',version:1}],
 prompt:'Create a reviewable action plan for a fictional bicycle repair shop. Separate supplied facts, evidence gaps, assumptions and next actions.'};
const input=process.argv[2];
const results=input?JSON.parse(readFileSync(input,'utf8')):[{provider:'pickaxe',status:'not-run'},{provider:'vercel-ai-gateway',status:'not-run'}];
const report=compareExecutions(fixture,results);
writeFileSync(new URL('../work/evidence/provider-comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
