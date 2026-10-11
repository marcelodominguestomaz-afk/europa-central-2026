'use strict';
// v26 · Orçamento essencial e a ficha de cada dia. Depende das constantes globais de guide.js (D, $, esc, eur, amount, link, choice, result,
// mealPicks, BUDGET_STORAGE, Budget e city).
const BUDGET_SCOPE={group:'€ · grupo',person:'€ · pessoa',breakfast:'€ · pessoa/dia',ceia:'€ · pessoa'};
const TICKET_STATUS={roteiro:'no roteiro',opcional:'opcional',pago:'já pago',livre:'livre'};
const dayLabel=n=>n===10?'Ida a Budapeste':n===22?'Volta a Coimbra':n===16?'Alpes':n===17?'Baviera e Boêmia':city(D.days.find(d=>d.n===n)?.city).name||'';
function saveBudget(){try{localStorage.setItem(BUDGET_STORAGE,JSON.stringify(choice));}catch{}}
function budgetOptions(){return D.days.flatMap(d=>(d.tickets||[]).filter(t=>t.status==='opcional').map(t=>({...t,n:d.n})));}
function renderBudget(){
 const B=D.budget;
 const field=x=>`<label class="b-input"><span class="b-label">${esc(x.title)}<small>${esc(x.note||'')}</small></span><span class="b-field"><input type="number" min="0" step="1" data-budget-input="${x.id}" value="${choice.inputs?.[x.id]??x.amount}" aria-label="${esc(x.title)} em euros"><em>${BUDGET_SCOPE[x.scope]||'€'}</em></span></label>`;
 $('budget').innerHTML=`
 <div class="b-hero">
  <article class="b-figure is-main"><p>Falta pagar · por pessoa</p><div class="value" id="b-person"></div><p class="fine">Mesa, ingressos, transportes e a noite de Munique, com a contingência.</p></article>
  <article class="b-figure"><p>Já pago · grupo</p><div class="value" id="b-paid"></div><p class="fine">Voos, hospedagens e a opereta.</p></article>
  <article class="b-figure"><p>A viagem inteira · por pessoa</p><div class="value" id="b-trip"></div><p class="fine">O que já foi pago mais o que falta.</p></article>
 </div>
 <div class="b-split" id="b-split" aria-label="Para onde vai o dinheiro"></div>
 <section class="b-days" aria-labelledby="b-days-title"><div class="b-head"><h3 id="b-days-title">Dia a dia</h3><p class="fine">Por pessoa, com a mesa escolhida em cada dia e os opcionais marcados. Toque num dia para abrir a ficha.</p></div><div id="b-days" class="table-scroll"></div></section>
 <section class="b-fill" aria-labelledby="b-fill-title"><div class="b-head"><h3 id="b-fill-title">O que ainda é previsão</h3><p class="fine">Só os valores sem reserva. As mesas se escolhem em cada dia; os opcionais, aqui ou na ficha do dia.</p></div>
  <div class="b-inputs"><label class="b-input"><span class="b-label">Viajantes</span><span class="b-field"><input id="b-people" type="number" min="1" max="20" value="${choice.people||B.people}" aria-label="Número de viajantes"><em>pessoas</em></span></label>${B.inputs.map(field).join('')}<label class="b-input"><span class="b-label">Contingência<small>Para o imprevisto.</small></span><span class="b-field"><input id="b-rate" type="number" min="0" max="50" value="${Math.round((choice.contingencyRate??B.contingencyRate)*100)}" aria-label="Contingência em porcentagem"><em>%</em></span></label></div>
  <h4 class="b-subhead">Opcionais</h4><div class="b-options" id="b-options"></div>
  <button class="button" type="button" id="b-reset">Voltar aos valores do guia</button>
 </section>
 <details class="panel"><summary>Carros por aplicativo, trecho a trecho</summary><div id="b-apps" class="table-scroll"></div></details>
 <details class="panel"><summary>Já pago</summary><div id="b-paid-list" class="table-scroll"></div></details>
 <div class="b-notes">${B.notes.map(x=>`<p class="fine">${esc(x)}</p>`).join('')}<p class="fine">Câmbio: referência do BCE de ${esc(D.fx.date)} · €1 = ${D.fx.HUF} HUF, ${D.fx.CZK} CZK e ${D.fx.PLN} PLN. ${link(D.fx.url,'Fonte oficial')}</p></div>`;
 $('b-options').innerHTML=budgetOptions().map(t=>`<label class="check"><input type="checkbox" data-budget-option="${esc(t.key)}"${choice.options?.[t.key]?' checked':''}><span><b>${t.n}/11</b> ${esc(t.title)} · ${t.amount?amount(t.amount,t.currency):'livre'}</span></label>`).join('');
 $('b-reset').addEventListener('click',()=>{choice={meals:{...mealPicks}};saveBudget();renderBudget();});
 if(!$('budget').dataset.bound){$('budget').dataset.bound='1';$('budget').addEventListener('change',e=>{if(e.target.matches('[data-budget-input],#b-people,#b-rate'))readBudget();});}
 if($('prices-table'))$('prices-table').innerHTML=`<div class="table-scroll"><table><thead><tr><th>Atração / modalidade</th><th>Preço de referência</th><th>≈ Euros por pessoa</th><th>Condição e fonte</th></tr></thead><tbody>${D.prices.map(p=>`<tr><td><strong>${esc(p[1])}</strong></td><td>${amount(p[2],p[3])}</td><td class="money">${eur(p[2]/D.fx[p[3]])}</td><td>${esc(p[4])}<br>${link(p[5],'Instituição / operador')}</td></tr>`).join('')}</tbody></table></div><p class="fine">Cada preço mantém a data de verificação da sua referência.</p>`;
 updateBudget();
}
function readBudget(){
 const val=x=>Math.max(0,Number(x.value)||0);
 const inputs={};document.querySelectorAll('[data-budget-input]').forEach(x=>{inputs[x.dataset.budgetInput]=val(x);});
 choice={...choice,people:Math.max(1,Math.min(20,val($('b-people'))||D.budget.people)),contingencyRate:val($('b-rate'))/100,inputs,meals:{...mealPicks}};
 saveBudget();updateBudget();
}
function toggleOption(key,on){choice={...choice,options:{...(choice.options||{}),[key]:on},meals:{...mealPicks}};saveBudget();updateBudget();}
document.addEventListener('change',e=>{const x=e.target.closest?.('[data-budget-option]');if(x)toggleOption(x.dataset.budgetOption,x.checked);});
function ticketHTML(t){
 const price=t.amount?amount(t.amount,t.currency):'livre';
 const euros=t.amount&&t.currency!=='EUR'?`<small>≈ ${eur(t.euros)}</small>`:'';
 const tag=t.status==='opcional'?`<label class="ds-opt"><input type="checkbox" data-budget-option="${esc(t.key)}"${t.chosen?' checked':''}>${t.chosen?'incluído':'incluir'}</label>`:`<em class="ds-tag is-${t.status}">${TICKET_STATUS[t.status]}</em>`;
 return `<li class="ds-ticket is-${t.status}${t.counted?' is-counted':''}"><span class="ds-what">${t.place?`<button type="button" class="ds-link" data-open-place="${t.place}">${esc(t.title)}</button>`:esc(t.title)}${t.note?`<small>${esc(t.note)}</small>`:''}</span><span class="ds-price"><b>${price}</b>${euros}</span>${tag}</li>`;
}
function daySheetHTML(n){
 const r=result.rows.find(x=>x.n===n),d=D.days.find(x=>x.n===n);if(!r||!d)return '';
 const people=result.people,line=(label,detail,value,extra='')=>`<li${extra}><span class="ds-what">${label}${detail?`<small>${detail}</small>`:''}</span><span class="ds-price"><b>${eur(value)}</b></span></li>`;
 const food=[];
 if(d.breakfast)food.push(line(d.breakfast.where==='casa'?'Café da manhã em casa':'Café da manhã',esc(d.breakfast.text),r.foodParts.breakfast));
 if(r.lunch)food.push(line(`Almoço · ${esc(r.venues.lunch?.name||'')}`,esc(r.lunch.dish),r.foodParts.lunch,r.foodParts.lunch===0&&r.lunch?' class="is-off"':''));
 if(r.snack)food.push(line(`Lanche · ${esc(r.venues.snack?.name||'')}`,esc(r.snack.dish),r.foodParts.snack));
 if(r.dinner)food.push(line(`Jantar · ${esc(r.venues.dinner?.name||'')}`,esc(r.dinner.dish),r.foodParts.dinner));
 if(d.ceia)food.push(line(`${esc(d.ceia.title)} em casa`,esc(d.ceia.text),r.foodParts.ceia));
 if(n===22&&r.foodParts.snack)food.push(line('Café no aeroporto do Porto','',r.foodParts.snack));
 const move=r.transportItems.map(x=>line(esc(x.title),'',x.person)).join('')||'<li><span class="ds-what">A pé o dia todo</span><span class="ds-price"><b>€0</b></span></li>';
 const ticketsTotal=r.activities;
 return `<header class="ds-head"><div><p class="eyebrow">A ficha do dia</p><h4>Quanto custa e o que levar em conta</h4></div><p class="ds-total"><span>Por pessoa</span><b>${eur(r.total)}</b><small>${eur(r.total*people)} para os ${people}</small></p></header>
 <div class="ds-grid">
  <section class="ds-block"><h5>Ingressos <span>${eur(ticketsTotal)}</span></h5>${r.tickets.length?`<ul>${r.tickets.map(ticketHTML).join('')}</ul>`:'<p class="fine">Sem ingressos neste dia.</p>'}</section>
  <section class="ds-block"><h5>Mesa <span>${eur(r.food)}</span></h5><ul>${food.join('')}</ul>${d.mealOptions?`<a class="ds-more" href="#mesa-dia-${n}">Trocar a mesa</a>`:''}</section>
  <section class="ds-block"><h5>${r.lodging?'Transporte e hotel':'Transporte'} <span>${eur(r.transport+r.lodging)}</span></h5><ul>${move}${r.lodging?line('Hotel em Munique','Provisão, a reservar.',r.lodging):''}</ul></section>
 </div>
 ${d.attention?.length?`<section class="ds-attention"><h5>Atenção</h5><ul>${d.attention.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}`;
}
function updateBudget(){
 result=Budget.calculate(D,{...choice,meals:{...mealPicks}});const n=result.people;
 const small=(t)=>`<small>${t}</small>`;
 if($('b-person')){
  $('b-person').innerHTML=eur(result.total)+small(`${eur(result.totalGroup)} para os ${n}`);
  $('b-paid').innerHTML=eur(result.paidGroup)+small(`${eur(result.paidPerson)} por pessoa`);
  $('b-trip').innerHTML=eur(result.tripPerson)+small(`${eur(result.tripGroup)} para os ${n}`);
  const parts=[['Mesa',result.food],['Ingressos',result.activities],['Transportes',result.transport],['Hotel em Munique',result.lodging],['Contingência',result.contingency]];
  const max=Math.max(...parts.map(p=>p[1]),1);
  $('b-split').innerHTML=parts.map(([t,a])=>`<div class="b-part"><span>${t}</span><b>${eur(a)}</b><i style="--w:${(a/max*100).toFixed(1)}%"></i><small>${eur(a*n)} para os ${n}</small></div>`).join('');
  const row=(r,label,href)=>`<tr><th scope="row"><a href="${href}">${label}</a></th><td class="money">${eur(r.food)}</td><td class="money">${eur(r.activities||0)}</td><td class="money">${eur(r.transport+(r.lodging||0))}</td><td class="money"><b>${eur(r.total)}</b></td></tr>`;
  $('b-days').innerHTML=`<table class="b-table"><thead><tr><th>Dia</th><th class="num">Mesa</th><th class="num">Ingressos</th><th class="num">Transporte e hotel</th><th class="num">Total</th></tr></thead><tbody>${row(result.arrival,'10/11 · Ida a Budapeste','#/cronograma/10')}${result.rows.map(r=>row(r,`${r.n}/11 · ${esc(dayLabel(r.n))}`,r.n===22?'#/cronograma/22':'#/dia/'+r.n)).join('')}</tbody><tfoot><tr><th scope="row">Soma</th><td class="money">${eur(result.food)}</td><td class="money">${eur(result.activities)}</td><td class="money">${eur(result.transport+result.lodging)}</td><td class="money"><b>${eur(result.base)}</b></td></tr><tr><th scope="row">Com ${Math.round(result.rate*100)}% de contingência</th><td colspan="3"></td><td class="money"><b>${eur(result.total)}</b></td></tr></tfoot></table>`;
  $('b-apps').innerHTML=`<table class="b-table"><thead><tr><th>Dia</th><th>Trecho</th><th class="num">Por carro</th><th class="num">Grupo</th></tr></thead><tbody>${result.apps.map(a=>`<tr><td>${a.n}/11</td><td>${esc(a.title)}${a.cars>1?` · ${a.cars} carros`:''}</td><td class="money">${amount(a.each,a.currency)}</td><td class="money">${eur(a.group)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row" colspan="3">Total previsto</th><td class="money"><b>${eur(result.appsGroup)}</b></td></tr></tfoot></table><p class="fine">Estimativas das tarifas vistas em outubro; o aplicativo mostra o preço antes de confirmar.</p>`;
  $('b-paid-list').innerHTML=`<table class="b-table"><tbody>${D.budget.paid.map(p=>`<tr><td>${esc(p.title)}${p.note?`<span class="fine">${esc(p.note)}</span>`:''}</td><td class="money">${eur(p.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total pago pelo grupo</th><td class="money"><b>${eur(result.paidGroup)}</b></td></tr></tfoot></table>`;
  document.querySelectorAll('#b-options [data-budget-option]').forEach(x=>{x.checked=!!choice.options?.[x.dataset.budgetOption];});
 }
 document.querySelectorAll('[data-day-sheet]').forEach(x=>{x.innerHTML=daySheetHTML(+x.dataset.daySheet);});
 if($('summary-budget'))$('summary-budget').textContent=eur(result.total)+' por pessoa ainda a pagar · '+eur(result.totalGroup)+' pelo grupo';
 window.dispatchEvent(new CustomEvent('guide:budget'));
}
