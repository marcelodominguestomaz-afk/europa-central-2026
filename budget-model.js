(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GuideBudget=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// v26 · Orçamento essencial: mesa de cada dia (a mesa escolhida, o café em casa e a ceia), ingressos do roteiro e os opcionais marcados,
// transportes e a noite de Munique. O que já foi pago aparece à parte, sem voltar a somar.
const positive=value=>Math.max(0,Number(value)||0);
const DAYS=[11,12,13,14,15,16,17,18,19,20,21,22];
function pick(list,id){if(!list?.length)return null;return list.find(o=>String(o.venueId)===String(id))||list[0];}
function calculate(D,choice={}){
 const B=D.budget,fx=c=>D.fx[c]||1,n=Math.max(1,Math.min(20,Number(choice.people)||B.people));
 const input=id=>{const x=B.inputs.find(i=>i.id===id);return x?positive(choice.inputs?.[id]??x.amount):0;};
 const defaultInput=id=>B.inputs.find(i=>i.id===id)?.amount||0;
 const options=choice.options||{};
 // Carros por aplicativo: o total informado é repartido pelos dias na proporção dos trechos.
 const appsBase=B.apps.reduce((s,a)=>s+a.cars*a.each/fx(a.currency),0),appsScale=appsBase?input('apps')/appsBase:0;
 const appsAt=day=>B.apps.filter(a=>a.n===day).map(a=>({title:a.title+(a.cars>1?` · ${a.cars} carros`:''),group:a.cars*a.each/fx(a.currency)*appsScale}));
 const transportAt=day=>{
  const items=[];
  for(const x of B.inputs){
   if(x.kind!=='transport'||x.id==='apps'||!x.days)continue;
   const share=x.days[String(day)];if(!share)continue;
   const value=input(x.id)*share;items.push({title:x.title,group:x.scope==='person'?value*n:value,person:x.scope==='person'?value:value/n});
  }
  for(const a of appsAt(day))items.push({title:a.title,group:a.group,person:a.group/n});
  return items;
 };
 const lodgingAt=day=>{const x=B.inputs.find(i=>i.kind==='lodging'&&i.days?.[String(day)]);return x?input(x.id)*x.days[String(day)]/n:0;};
 const meals=choice.meals||{};
 const rows=DAYS.map(day=>{
  const d=D.days.find(x=>x.n===day)||{};
  const picks=meals[day]||{};
  const lunch=pick(d.mealOptions,picks.meal),snack=pick(d.snackOptions,picks.snack),dinner=pick(d.dinnerOptions,picks.dinner);
  const venue=o=>o?D.dining.find(m=>m.id===o.venueId):null;
  const bf=d.breakfast||{target:0};
  const breakfast=bf.where==='casa'?(bf.target?input('breakfast')*bf.target/defaultInput('breakfast'):0):positive(bf.target);
  const ceia=d.ceia?input('ceia')*d.ceia.target/defaultInput('ceia'):0;
  let lunchAmount=lunch?positive(lunch.target):0;
  const tickets=(d.tickets||[]).map(t=>{
   const each=t.currency==='EUR'?t.amount:t.amount/fx(t.currency);
   const counted=t.status==='roteiro'||(t.status==='opcional'&&!!options[t.key]);
   return {...t,euros:each,counted,chosen:t.status==='opcional'?!!options[t.key]:undefined};
  });
  // A experiência Pilsner inclui o almoço: a mesa escolhida para o dia sai da conta.
  if(tickets.some(t=>t.key==='beer'&&t.counted))lunchAmount=0;
  const foodParts={breakfast,lunch:lunchAmount,snack:snack?positive(snack.target):0,dinner:dinner?positive(dinner.target):0,ceia};
  if(day===22)foodParts.snack=positive(B.departure?.food);
  const food=Object.values(foodParts).reduce((s,v)=>s+v,0);
  const entries=tickets.filter(t=>t.counted);
  const activities=entries.reduce((s,t)=>s+t.euros,0);
  const transportItems=transportAt(day),transport=transportItems.reduce((s,x)=>s+x.person,0);
  const lodging=lodgingAt(day);
  return {n:day,food,foodParts,lunch,snack,dinner,venues:{lunch:venue(lunch),snack:venue(snack),dinner:venue(dinner)},tickets,entries,activities,
   paidTickets:tickets.filter(t=>t.status==='pago'),transportItems,transport,lodging,total:food+activities+transport+lodging};
 });
 const arrivalItems=transportAt(10);
 const arrival={n:10,food:positive(B.arrival?.food),activities:0,transportItems:arrivalItems,transport:arrivalItems.reduce((s,x)=>s+x.person,0),lodging:0};
 arrival.total=arrival.food+arrival.transport;
 const all=[arrival,...rows],sum=k=>all.reduce((s,r)=>s+(r[k]||0),0);
 const food=sum('food'),activities=sum('activities'),transport=sum('transport'),lodging=sum('lodging');
 const base=food+activities+transport+lodging,rate=positive(choice.contingencyRate??B.contingencyRate);
 const paidGroup=B.paid.reduce((s,p)=>s+positive(p.amount),0);
 const optionalAvailable=rows.flatMap(r=>r.tickets.filter(t=>t.status==='opcional').map(t=>({...t,n:r.n})));
 return {people:n,rows,arrival,food,activities,transport,lodging,base,contingency:base*rate,rate,total:base*(1+rate),group:base*n,totalGroup:base*(1+rate)*n,
  paidGroup,paidPerson:paidGroup/n,tripPerson:paidGroup/n+base*(1+rate),tripGroup:paidGroup+base*(1+rate)*n,
  appsGroup:input('apps'),apps:B.apps.map(a=>({...a,group:a.cars*a.each/fx(a.currency)*appsScale})),optionalAvailable,
  inputs:Object.fromEntries(B.inputs.map(x=>[x.id,input(x.id)])),
  // Compatibilidade com a abertura (field-guide.js): comida e passeios por dia.
  sharedRemainingPerson:base*(1+rate),sharedRemainingGroup:base*(1+rate)*n};
}
return {calculate};
});
