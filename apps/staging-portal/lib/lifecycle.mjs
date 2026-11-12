export const transformationDimensions = [
 ['financial','Financial health and cash flow','Cash runway, collection timing, source periods and reconciled figures'],
 ['revenue','Revenue quality and customer concentration','Recurring income, top-customer share and renewal exposure'],
 ['sales','Sales effectiveness and retention','Funnel definitions, cohort retention and qualified conversion evidence'],
 ['operations','Operational efficiency','Cycle time, capacity, rework and bottlenecks'],
 ['leadership','Leadership and owner dependency','Decisions, relationships and processes dependent on one person'],
 ['technology','AI and technology maturity','Authorized systems, security, automation and human oversight'],
 ['data','Data quality and reporting','Source ownership, reporting definitions and reconciliation gaps'],
 ['strategy','Positioning and competitive risks','Differentiation, competitive evidence and strategic exposure'],
 ['systems','Systems, policies and process documentation','Current SOPs, access policies and accountable owners'],
 ['continuity','Business continuity and operational risk','Recovery plans, suppliers, controls and continuity tests'],
];
export const exitIntake = [
 ['goals','Owner goals and time horizon'],['ownership','Ownership structure'],['options','Desired transition options'],
 ['history','Revenue and profitability history (optional; periods and currency)'],['concentration','Customer concentration'],
 ['keyPeople','Key-person dependencies'],['recurring','Recurring revenue characteristics'],['ip','Intellectual property'],
 ['reporting','Financial reporting quality'],['continuity','Business continuity'],['diligence','Due diligence preparation status'],
];
export const transformArtifacts = [
 ['health','Business health assessment'],['opportunities','Transformation opportunity map'],['ninetyDay','Prioritized 90-day plan'],
 ['valueDrivers','Value-driver improvement plan'],['kpi','Operating KPI dashboard specifications'],['dependency','Process and owner-dependency map'],
 ['automation','Automation opportunities'],['execution','Transformation execution checklist'],['quarterly','Quarterly review package'],
];
export const exitArtifacts = [
 ['readiness','Exit Readiness Diagnostic'],['value','Value Driver Assessment'],['valuation','Preliminary Valuation Scenario Planner'],
 ['dependency','Owner Dependency Assessment'],['acceleration','Value Acceleration Plan'],['succession','Succession Readiness'],
 ['diligence','Due Diligence Checklist'],['inventory','Document and Evidence Inventory'],['advisors','Advisor Collaboration Plan'],['transition','Transition Roadmap'],
];
export const programSpec = program => program === 'transform' ? { name:'TransformOS',artifacts:transformArtifacts } : { name:'ExitReady',artifacts:exitArtifacts };
export const emptyLifecycle = () => ({intake:{},dimensions:{},artifacts:{},initiatives:[],decisions:'',scenario:{}});
export function lifecycleProgress(data) {
  const dimensions=Object.values(data.dimensions ?? {});
  const evidenced=dimensions.filter(d=>d.facts?.trim()&&d.evidence?.trim()).length;
  const verified=dimensions.filter(d=>d.verified===true&&d.evidence?.trim()).length;
  const initiatives=data.initiatives ?? [];
  return {evidenced,verified,completed:initiatives.filter(i=>i.status==='completed').length,total:initiatives.length,
    next:initiatives.find(i=>i.status!=='completed')?.action || 'Document evidence and a responsible owner before choosing an improvement initiative.'};
}
export function scenarioRange(s) {
  const values=['earnings','low','high','debt','cash'].map(k=>Number(s[k]));
  if(!['earnings','low','high','debt','cash'].every(k=>String(s[k]??'').trim())||!values.every(Number.isFinite)||values.some(v=>v<0)||values[2]<values[1]||!s.basis?.trim()||!s.currency?.trim())return null;
  const [earnings,low,high,debt,cash]=values;
  return {enterpriseLow:earnings*low,enterpriseHigh:earnings*high,equityLow:earnings*low-debt+cash,equityHigh:earnings*high-debt+cash};
}
export function advancedRecommendation(goal,data){
 if(lifecycleProgress(data).verified<1)return null;
 if(/\b(exit|succession|transition)\b/i.test(goal))return {href:'#enterprise-value',label:'Review optional ExitReady planning',reason:'Your stated transition goal and manually verified diagnostic evidence support a readiness review. No sale is required.'};
 if(/\b(transform|efficiency|operations|dependency)\b/i.test(goal))return {href:'#transform',label:'Continue TransformOS planning',reason:'Your stated improvement goal and manually verified evidence support an accountable transformation plan.'};
 return null;
}
