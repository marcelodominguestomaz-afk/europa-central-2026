'use strict';
(function(){
 const cities=D.cities.map(c=>c.id),pageNames=['inicio','cronograma','hospedagens','passeios','mapas','arte','gratis','gastronomia','transportes','orcamento','reservas','fontes',...cities];
 const legacy={inicio:['inicio'],logistica:['transportes'],mapas:['transportes'],precos:['orcamento'],reservas:['reservas'],fontes:['fontes']};
 $('home-cities').innerHTML=D.cities.map(c=>`<a class="destination-card" href="#/${c.id}/roteiro" style="--city:${c.color}"><span class="destination-photo">${photo(c.cardPhoto||c.photo,c.name)}</span><span class="destination-label"><small>${esc(c.dates)}</small><strong>${esc(c.name)}</strong></span></a>`).join('');
 // v26: os dias 16 e 17 aparecem como duas regiões, Alpes e Baviera, cada uma com as suas cidades.
 const cityEntry=c=>`<div class="menu-city" style="--city:${c.color}"><a class="menu-city-main" href="#/${c.id}/roteiro"><span class="menu-city-flag" aria-hidden="true">${c.flag}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.dates)}</small></span></a><span class="menu-city-tabs"><a href="#/${c.id}/roteiro">Roteiro</a><a href="#/${c.id}/visitas">Visitas</a><a href="#/${c.id}/mesa">Comer</a><a href="#/${c.id}/mapa">Mapa</a></span></div>`;
 const regionEntry=(label,members)=>{const lead=members[0];return `<div class="menu-city menu-region" style="--city:${lead.color}"><a class="menu-city-main" href="#/${lead.id}/roteiro"><span class="menu-city-flag" aria-hidden="true">${lead.flag}</span><span><strong>${esc(label)}</strong><small>${esc(lead.dates)}${members.length>1?' · '+members.map(c=>esc(c.name)).join(' e '):''}</small></span></a><span class="menu-towns">${members.flatMap(c=>(c.towns||[]).map(t=>`<a href="${esc(t.href||'#'+t.target)}"${t.annex?' class="is-annex"':''}>${t.annex?`<i>${esc(t.annex)}</i>`:''}<b>${esc(t.label)}</b><small>${esc(t.note)}</small></a>`)).join('')}</span><span class="menu-city-tabs">${members.map(c=>`<a href="#/${c.id}/roteiro">${esc(c.name)}</a>`).join('')}<a href="#/${lead.id}/mesa">Comer</a><a href="#/${lead.id}/mapa">Mapa</a></span></div>`;};
 const seen=new Set();
 $('destination-links').innerHTML=D.cities.map(c=>{if(!c.group)return cityEntry(c);if(seen.has(c.group))return '';seen.add(c.group);return regionEntry(c.group,D.cities.filter(x=>x.group===c.group));}).join('');
 $('gastronomy-content').innerHTML=D.cities.map(c=>{const days=D.days.filter(d=>d.city===c.id&&d.mealOptions);return `<section class="gastronomy-city"><h3>${esc(c.name)}</h3><p>${esc(c.food)}</p><div class="dining-index">${days.map(d=>`<article><p class="eyebrow">${esc(d.date)} · ${esc(d.mealTime)}</p><figure class="dining-index-photo">${foodFigure(D.dining.find(m=>m.id===d.mealId))}</figure><h4>${esc(d.mealOptions[0].dish)}</h4><p>${esc(D.dining.find(m=>m.id===d.mealId).name)} · ${eur(d.mealOptions[0].target)} / pessoa</p><a class="button" href="#comer-dia-${d.n}">Ver refeições e alternativas</a></article>`).join('')}</div><div class="actions"><a class="button" href="#/${c.id}/mesa">${c.id==='sal'?'Jantar em Salzburgo':['hall','bav'].includes(c.id)?'Comer na estrada':'Comer em '+esc(c.name)}</a><a class="button" href="#/${c.id}/mapa">Mapa da cidade</a></div></section>`;}).join('')+`<details class="panel"><summary>Bratislava · se escolherem viajar de carro</summary>${D.dining.filter(m=>m.city==='bra').map(diningCard).join('')}</details>`;
 function route(){
  document.querySelectorAll('[data-trip-day]').forEach(x=>x.hidden=false);
  let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{hash='';}let page='inicio',pane='roteiro',target=null;
  // v26: Salzburgo agora está dentro do capítulo dos Alpes.
  let salzburg=false;if(/^\/?sal(\/|$)/.test(hash)){const p=hash.replace(/^\/?sal\/?/,'').split('/')[0]||'roteiro';salzburg=p==='roteiro';hash='/hall/'+p;}
  if(hash.startsWith('/')){const parts=hash.slice(1).split('/');if(parts[0]==='dia'){const d=D.days.find(d=>d.n===+parts[1]);page=d?.city||'inicio';pane='roteiro';target=d?$('dia-'+d.n):null;}else{page=pageNames.includes(parts[0])?parts[0]:'inicio';if(page==='cronograma'&&parts[1])target=$('cronograma-'+parts[1]);pane=parts[1]||'roteiro';}}
  else if(cities.includes(hash))page=hash;
  else if(legacy[hash]){page=legacy[hash][0];target=$(hash);}
  else if(hash){target=$(hash);const parent=target?.closest('[data-page]');if(parent){page=parent.dataset.page;pane=target.closest('[data-pane]')?.dataset.pane||'roteiro';}}
  if(cities.includes(page)&&['arte','alternativas','custos'].includes(pane)){const section=pane==='arte'?D.art.find(a=>a.city===page):null;target=target||$(pane==='arte'&&section?'arte-'+section.id:pane==='custos'?'custos-'+page:'alternativas-'+page);pane='visitas';}
  if(cities.includes(page)&&!document.querySelector(`#${page} [data-pane="${pane}"]`))pane='roteiro';
  if(salzburg)target=$('salzburgo');
  document.querySelectorAll('[data-page]').forEach(x=>x.hidden=x.dataset.page!==page);
  document.body.dataset.activePage=page;
  $('citynav').hidden=!cities.includes(page);document.querySelectorAll('#citynav a').forEach(a=>a.getAttribute('href')===`#/${page}/roteiro`?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));document.querySelector('.cities-menu>summary').setAttribute('aria-current',cities.includes(page)&&!hash.startsWith('/dia/')?'page':'false');document.querySelector('.days-menu>summary').setAttribute('aria-current',hash.startsWith('/dia/')?'page':'false');document.querySelector('.explore-menu>summary').setAttribute('aria-current',['hospedagens','passeios','mapas','gastronomia','arte','gratis'].includes(page)?'page':'false');document.querySelector('.plan-menu>summary').setAttribute('aria-current',['cronograma','transportes','orcamento','reservas','fontes'].includes(page)?'page':'false');
  if(cities.includes(page)){
   document.querySelectorAll(`#${page} [data-pane]`).forEach(x=>x.hidden=x.dataset.pane!==pane);
   document.querySelectorAll(`#${page} [data-city-tab]`).forEach(a=>a.dataset.cityTab===pane?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
   if(pane==='mapa'){const ctl=ensureMap(page);ctl?.map?.invalidateSize();renderMap(page);}
  }
  document.querySelectorAll('[data-nav]').forEach(a=>a.dataset.nav===page?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  document.querySelectorAll('.destination-menu').forEach(x=>x.open=false);
  $('main-nav').classList.remove('open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');
  document.title=(cities.includes(page)?city(page).name:({'inicio':'Europa Central','cronograma':'Cronogramas porta a porta','gastronomia':'Gastronomia','transportes':'Transportes','orcamento':'Orçamento','reservas':'Reservas','fontes':'Fontes','hospedagens':'Hospedagens','passeios':'Passeios a pé','mapas':'Mapas e rotas','arte':'Arte e museus','gratis':'Visitas gratuitas'})[page])+' · novembro de 2026';
  if(page==='transportes')initTripMap();
  window.FieldGuide?.decorateRoute();
  if(target){let el=target.parentElement;while(el){if(el.tagName==='DETAILS')el.open=true;el=el.parentElement;}target.scrollIntoView({block:'start',behavior:'instant'});}
  else{window.scrollTo?.({top:0,behavior:'instant'});$('inicio').focus({preventScroll:true});}
 }
 window.GuideNavigation={open:(id,pane='roteiro')=>{history.pushState(null,'',`#/${id}/${pane}`);route();},route};
 window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
 document.querySelector('.menu-toggle').addEventListener('click',e=>{const open=$('main-nav').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));});
 document.addEventListener('click',e=>{if(!e.target.closest('.destination-menu'))document.querySelectorAll('.destination-menu').forEach(x=>x.open=false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.destination-menu').forEach(x=>x.open=false);$('main-nav').classList.remove('open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');}});
 $('secret-key').addEventListener('click',()=>{const p=D.discovery;if(!p)return;$('discovery-content').innerHTML=`${photo(p.photo,p.photoAlt||p.title)}<p class="eyebrow">UMA HISTÓRIA PARA DESCOBRIR</p><h3 id="discovery-title">A Fábrica de Schindler</h3><p>O museu apresenta Cracóvia durante a ocupação de 1939–1945. É uma visita adicional em Podgórze, com tempo e ingresso próprios; pode substituir uma parte do programa se o grupo a escolher.</p><p class="price-line">${esc(p.price)}</p><p>${esc(p.hours)}</p><div class="links">${link(p.url,'Informação e bilhetes')}${link(mapSearch(p),'Como chegar')}</div>`;const d=$('discovery');if(d.showModal)d.showModal();else d.setAttribute('open','');});
 function closeDiscovery(){const d=$('discovery');if(d.close)d.close();else d.removeAttribute('open');$('secret-key').focus();}
 document.querySelector('.dialog-close').addEventListener('click',closeDiscovery);
 $('discovery').addEventListener('click',e=>{if(e.target===$('discovery'))closeDiscovery();});
 $('discovery').addEventListener('cancel',()=>setTimeout(()=>$('secret-key').focus(),0));
 let printState=[];
 window.addEventListener('beforeprint',()=>{printState=[...document.querySelectorAll('details')].map(x=>[x,x.open]);printState.forEach(([x])=>{if(!x.classList.contains('destination-menu'))x.open=true;});});
 window.addEventListener('afterprint',()=>{printState.forEach(([x,open])=>x.open=open);printState=[];route();});
 document.querySelectorAll('.print-guide').forEach(b=>b.addEventListener('click',()=>window.print()));
 route();
})();
