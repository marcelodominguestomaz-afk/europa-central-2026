(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GuideBudget=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const positive=value=>Math.max(0,Number(value)||0);
const cents=value=>Math.round((value+Number.EPSILON)*100)/100;
function calculate(D,choice={}){
 const B=D.budget,n=Math.max(1,Number(choice.people)||B.people);
 const stays=B.nights.map(s=>({...s,
  amount:s.paidComplete?positive(s.amount):positive(choice.lodging?.[s.city]?.amount??s.amount),
  fees:positive(choice.lodging?.[s.city]?.fees??s.fees),
  undiscriminated:s.amount===null
 }));
 const lodgingAt=date=>stays.reduce((total,s)=>{
  const dates=s.amountDates||s.dates;
  const amount=dates.includes(date)?s.amount/dates.length/n:0;
  return total+amount+(s.dates.includes(date)?s.fees/s.dates.length/n:0);
 },0);
 const tariffs=new Map(D.prices.map(p=>[p[0],p[2]/D.fx[p[3]]]));
 const bath=B.bathOptions.find(x=>x.id===(choice.bath||B.bathDefault))||B.bathOptions[0];
 const cruise=B.cruiseOptions.find(x=>x.id===(choice.cruise||B.cruiseDefault))||B.cruiseOptions[0];
 const ngpFreeDay17=choice.ngpFreeDay17??B.ngpFreeDay17;
 const transports=B.transport.map(t=>({...t,amount:positive(choice.transports?.[t.id]??t.amount)}));
 const connection=transports.find(t=>t.id==='prg-kra');
 if(choice.krakowMode==='train')connection.amount=positive(choice.krakowTrainPerson??connection.trainAmount);
 const busFees=choice.krakowMode==='train'?0:positive(choice.busServiceFeeGroup??connection.serviceFeeGroup)+positive(choice.busExtrasGroup??connection.extrasGroup);
 const car=(list,values)=>list.reduce((s,x)=>s+positive(values?.[x.id]??x.amount),0);
 const hall=car(B.carHall,choice.carHall),bra=car(B.carBratislava,choice.carBratislava);
 const selectedCar=choice.bratislava?bra:hall;
 const localMode=choice.localMode||'walk';
 const local=localMode==='uber'?positive(choice.transports?.local??B.localUberGroupReference):localMode==='car'?positive(choice.cityCarDays??B.cityCarDays)*positive(choice.cityCarDayPrice??B.cityCarDayPrice)+positive(choice.cityCarExtras):0;
 const airportMode=choice.airportMode||'pending';
 const coreTransfers=(B.coreTransfers||[]).map(t=>{
  let euros=t.amount/D.fx[t.currency];
  const airport=t.id==='kra-airport';
  if(airport&&airportMode==='bus')euros=B.airportBusPerson*n;
  if(airport&&airportMode==='taxi')euros=B.airportTaxiGroup;
  if(airport&&airportMode==='car')euros=positive(choice.airportCarGroup??50);
  const automatic=airport&&['bus','taxi','car'].includes(airportMode);
  return {...t,enabled:airport?airportMode!=='pending':!!choice.includeCoreTransfers,euros:automatic?euros:positive(choice.coreTransfers?.[t.id]??euros)};
 });
 const coreAt=date=>localMode==='uber'?0:coreTransfers.filter(t=>t.enabled&&t.n===date&&!(choice.bratislava&&['bud-terminal','vie-arrival'].includes(t.id))).reduce((s,t)=>s+t.euros/(t.scope==='group'?n:1),0);
 const baggage=positive(choice.baggageStorageGroup??B.baggageStorageGroup);
 const occasions=B.baggageOccasions||[];
 const baggageAt=date=>occasions.filter(x=>x===date).length*baggage/n;
 const localCities=['bud','vie','prg','kra'];
 const localDates=new Map(localCities.map(id=>[id,D.days.filter(d=>d.city===id).map(d=>d.n)]));
 localDates.get('bud').unshift(10);
 const localAt=date=>{const dates=[...localDates.values()].find(ds=>ds.includes(date));return dates?local/localCities.length/dates.length/n:0;};
 const paidOperaGroup=positive(choice.paidOperaGroup??B.paidOperaGroup);
 const rows=B.food.map(f=>{
  const foodParts={...f,...choice.food?.[f.n]};
  for(const key of ['breakfast','lunch','dinner','home','extras'])foodParts[key]=positive(foodParts[key]);
  const food=foodParts.breakfast+foodParts.lunch+foodParts.dinner+foodParts.home+foodParts.extras;
  const entries=(B.programmes[f.n]||[]).filter(id=>!(f.n===19&&ngpFreeDay17&&id===113)).map(id=>{
   let amount=tariffs.get(id)||0;
   if(id===58&&choice.muchaStudent)amount-=100/D.fx.CZK/n;
   if(id===111&&choice.czartoryskiStudent)amount-=15/D.fx.PLN/n;
   const p=D.prices.find(p=>p[0]===id);
   return {id,title:p[1],amount:Math.max(0,amount),paid:false,url:p[5]};
  });
  if(f.n===11)for(const id of [bath.priceId,cruise.priceId]){
   const p=D.prices.find(p=>p[0]===id);entries.push({id,title:p[1],amount:tariffs.get(id),paid:false,url:p[5]});
  }
  if(f.n===13)entries.push({id:'opera',title:'Volksoper · já paga',amount:paidOperaGroup/n,paid:true,url:D.places.find(p=>p.id===109)?.url});
  if(f.n===12&&choice.wine)entries.push({id:'wine',title:'Prova de vinho',amount:B.options.wine.amount/D.fx.HUF,paid:false,url:B.options.wine.url});
  if(f.n===19&&choice.beer)entries.push({id:'beer',title:'Pilsner + almoço · parcela da experiência',amount:Math.max(0,B.options.beer.amount/D.fx.CZK-foodParts.lunch),paid:false,url:B.options.beer.url});
  if(f.n===16&&choice.funicular)entries.push({id:'funicular',title:'Funicular de Hallstatt',amount:B.options.funicular.amount/D.fx[B.options.funicular.currency],paid:false,url:B.options.funicular.url});
  const activities=entries.reduce((s,e)=>s+e.amount,0);
  let transport=localAt(f.n)+coreAt(f.n)+baggageAt(f.n);
  for(const t of transports){
   if(t.id==='local'||t.n!==f.n||(t.id==='bud-vie'&&choice.bratislava))continue;
   transport+=t.scope==='group'?t.amount/n:t.amount;
  }
  if(f.n===16)transport+=selectedCar/n;
  if(f.n===20)transport+=busFees/n;
  const lodging=lodgingAt(f.n+'/11');
  return {n:f.n,foodParts,food,activities,entries,experience:food+activities,lodging,transport,total:food+activities+lodging+transport};
 });
 const sum=k=>rows.reduce((s,r)=>s+r[k],0);
 const arrival={n:10,food:positive(choice.arrivalDinnerPerson??B.arrivalDinnerPerson),lodging:lodgingAt('10/11'),transport:localAt(10)+coreAt(10)};
 arrival.total=arrival.food+arrival.lodging+arrival.transport;
 const food=sum('food')+arrival.food,activities=sum('activities'),lodging=stays.reduce((s,x)=>s+x.amount+x.fees,0)/n,transport=sum('transport')+arrival.transport;
 const remainingLodgingGroup=stays.reduce((s,x)=>s+(x.paidComplete?0:x.amount)+x.fees,0);
 const paidRecords=B.shared.paid.map(p=>({...p,amount:p.id==='opera'?paidOperaGroup:p.amount}));
 const sharedPaidGroup=cents(paidRecords.reduce((s,p)=>s+p.amount,0));
 const sharedRemainingGroup=cents(remainingLodgingGroup+transport*n);
 const sharedTotalGroup=cents(sharedPaidGroup+sharedRemainingGroup);
 const activitiesRemainingGroup=Math.max(0,activities*n-paidOperaGroup);
 const remainingGroup=sharedRemainingGroup+food*n+activitiesRemainingGroup;
 const group=sharedTotalGroup+food*n+activitiesRemainingGroup;
 const base=group/n,rate=positive(choice.contingencyRate??B.contingencyRate);
 const activitiesByCity=D.cities.map(c=>({city:c.id,total:rows.filter(r=>D.days.find(d=>d.n===r.n)?.city===c.id).reduce((s,r)=>s+r.activities,0),entries:rows.filter(r=>D.days.find(d=>d.n===r.n)?.city===c.id).flatMap(r=>r.entries)}));
 const foodParts=Object.fromEntries(['breakfast','lunch','dinner','home','extras'].map(k=>[k,rows.reduce((s,r)=>s+r.foodParts[k],0)]));
 const coreTransferGroup=coreAt(10)*n+rows.reduce((s,r)=>s+coreAt(r.n)*n,0);
 return {bath:bath.id,cruise:cruise.id,ngpFreeDay17,localMode,localTransportGroup:local,coreTransferGroup,coreTransfers,baggageGroup:baggage*occasions.length,remainingLodgingGroup,remainingGroup,remainingPerson:remainingGroup/n,people:n,rows,arrival,stays,pendingFees:[],activitiesByCity,busFees,krakowTransport:connection.amount*n+busFees,food,foodParts,activities,activitiesRemainingGroup,activitiesRemainingPerson:activitiesRemainingGroup/n,lodging,transport,base,group,contingency:base*rate,total:base*(1+rate),totalGroup:group*(1+rate),foodActivities:sum('experience'),average:sum('experience')/B.foodDays,cap:B.capDaily*B.foodDays,headroom:B.capDaily*B.foodDays-sum('experience'),hallCar:hall,bratislavaCar:bra,selectedCar,paidOperaGroup,paidRecords,sharedPaidGroup,sharedRemainingGroup,sharedTotalGroup,sharedPerson:sharedTotalGroup/n,sharedRemainingPerson:sharedRemainingGroup/n,unallocatedPaidGroup:paidRecords.find(p=>p.id==='previous').amount};
}
return {calculate};
});
