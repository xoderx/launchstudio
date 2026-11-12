import {generateText,Output,jsonSchema} from 'ai';
// AI SDK 7.0.170 bundled docs/source verified. No live call until the caller's
// durable reservation, verified credentials, allowlist and budget gates pass.
export function gatewayAdapter({generate=generateText}={}){
 return {provider:'vercel-ai-gateway',async generate(request){
  const result=await generate({model:request.model,prompt:request.prompt,maxRetries:0,maxOutputTokens:request.maxOutputTokens,
   abortSignal:AbortSignal.timeout(45000),
   output:Output.object({schema:jsonSchema({type:'object',additionalProperties:false,properties:{summary:{type:'string'},evidence:{type:'array',items:{type:'string'}},assumptions:{type:'array',items:{type:'string'}},actions:{type:'array',items:{type:'string'}}},required:['summary','evidence','assumptions','actions']})})});
  if(!result.output||typeof result.output.summary!=='string'||!Array.isArray(result.output.evidence))throw Error('Structured result invalid');
  return {output:result.output,usage:result.usage,providerMetadata:result.providerMetadata,responseId:result.response?.id,model:request.model};
 }};
}
