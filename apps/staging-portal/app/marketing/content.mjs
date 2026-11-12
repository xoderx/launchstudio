import launch from '../../../../catalog/tool-specs/launch.json';
import grow from '../../../../catalog/tool-specs/grow.json';
import monetize from '../../../../catalog/tool-specs/monetize.json';
import scale from '../../../../catalog/tool-specs/scale.json';
import development from '../../../../catalog/tool-specs/covibecoder.json';
import playbooks from '../../../../catalog/flagship-playbooks.json';
export const businessTools = [...launch,...grow,...monetize,...scale].map(({position,key,name,category,input,outputs,exercise,metric}) => ({position,key,name,category,input,outputs,exercise,metric,
  readiness: position<=2?'Connected assessment workflow':key==='audience-dna'?'Pilot paused · verification pending':'Manual deliverable workspace'}));
export const developmentTools = development.map(({position,key,name,input,outputs,exercise})=>({position,key,name,input,outputs,exercise}));
export { playbooks };
export const stages = [
  {name:'Launch',number:'01',headline:'Turn an idea into a business worth testing.',text:'Clarify the problem, understand the market and shape an offer before you commit.',keys:['idea-validator','market-intelligence'],icon:'compass'},
  {name:'Grow',number:'02',headline:'Find the customers who need what you do.',text:'Map your funnel, sharpen your message and plan experiments with a measurable outcome.',keys:['growth-diagnostic','lead-intelligence-finder'],icon:'rocket'},
  {name:'Monetize',number:'03',headline:'Build a healthier revenue model.',text:'Review pricing, offers and margins. Turn a revenue question into a decision you can test.',keys:[],icon:'activity'},
  {name:'Scale',number:'04',headline:'Make good work repeatable.',text:'Document operations, plan capacity and decide what is ready to automate or delegate.',keys:[],icon:'workflow'},
];
export const modelLinks = [ ['GPT','KOEJIMYFST7VPG7'],['Claude','5X40O6LNOBFUY32'],['Gemini','ZF678T7OGE9A0TH'],['Grok','R02X6IY3A0918M3'] ];
export const pickaxePortal='https://studio.pickaxe.co/STUDIOSAG26QENFZXNY0957VNT/launch/';
export const faq = [
 ['What is LaunchStudio?','An AI-powered business implementation platform that connects your business context, specialist tools, reviewed deliverables and guided next steps. The goal is useful work you can return to—not another pile of disconnected prompts.'],
 ['Do I need technical experience?','You can use the business planning workspaces without writing code. CoVibeCoder helps you prepare software specifications and development handoffs; implementation still requires an authorized builder or development environment.'],
 ['Are all tools AI-powered?','The 52-tool program includes manual planning workspaces and guided exercises. Idea Validator and Market Intelligence have connected AI assessment workflows. Audience DNA is a paused pilot, and the other provider integrations are not activated. We label readiness per tool.'],
 ['How does Q/CUE work?','It reads your saved business and project state, shows assessment versions and approvals, and recommends the next step. Acknowledged workflow requests can be checked and recovered without submitting a duplicate provider request.'],
 ['What is CoVibeCoder?','A separate 13-step software development planning suite covering product requirements, architecture, coding prompts, testing and release handoffs. Repository writes, automated coding and deployment adapters are not connected.'],
 ['Can I use GPT, Claude, Gemini and Grok?','AI Workspace links to the existing Pickaxe model pages, subject to your account access and usage allowances. Native embedded conversations inside LaunchStudio are a planned upgrade, not a current capability.'],
 ['What is included in early access?','Early access is an invitation-based rollout whose scope and terms will be confirmed before access is offered. A request records your interest; it does not create an account, subscription, payment or membership entitlement.'],
 ['Can someone implement the plans for me?','You can inquire about managed implementation. Scope, availability and terms are agreed separately. No service engagement or external action is started by submitting the inquiry form.'],
];
export {routes,siteOrigin,indexable,pageMetadata} from '../../lib/marketing-seo.mjs';
