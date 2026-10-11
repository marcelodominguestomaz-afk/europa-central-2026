'use strict';
(function(){
 const dates=D.journey;
 let selectedDay=11,currentCity=null,activePlace=null,returnedTo=null;
 const last=(()=>{try{return Number(localStorage.getItem('europa-guide-day'));}catch{return 11;}})();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(today.startsWith('2026-11-')&&+today.slice(-2)>=10&&+today.slice(-2)<=22)selectedDay=+today.slice(-2);
 else if(dates.some(d=>d.n===last))selectedDay=last;
 const day=n=>D.days.find(d=>d.n===+n);
 const overview=n=>dates.find(d=>d.n===+n);
 const normal=s=>String(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const homeCover=document.createElement('span');homeCover.className='home-cover';homeCover.setAttribute('aria-hidden','true');document.querySelector('.guide-heading')?.prepend(homeCover);
 function scenicKey(n){return day(n)?.previewPhoto||(n===22?'coimbra':city(overview(n)?.city||'bud').previewPhoto||city(overview(n)?.city||'bud').photo);}
 function setScenery(key,cid){
  const m=D.media[key],c=D.cities.find(c=>c.id===cid);if(!m)return;
  const theme=document.documentElement.style;
  theme.setProperty('--scenic-image',`image-set(url("${m.largeSrc||m.src}") 1x, url("${m.src}") 2x)`);
  theme.setProperty('--scene-position',m.position||'50% 50%');
  theme.setProperty('--scene-tint',c?.tint||'#deebeb');
  theme.setProperty('--scene-accent',c?.color||'#155b69');
 }
 function contextCity(n){return n===22?'Coimbra':n===16?'Alpes e Salzburgo':n===17?'Baviera e Praga':city(overview(n)?.city).name;}
 function timeline(){
  $('journey-timeline').innerHTML=dates.map(d=>`<button role="tab" id="journey-tab-${d.n}" aria-controls="journey-preview" aria-selected="${d.n===selectedDay}" tabindex="${d.n===selectedDay?0:-1}" data-select-day="${d.n}" style="--city:${city(d.city).color}"><span class="timeline-dot"></span><strong>${d.n}<small>NOV</small></strong><span class="timeline-city">${esc(d.n===16?'Alpes':d.n===17?'Baviera':d.n===22?'Coimbra':city(d.city).name)}</span></button>`).join('');
 }
 function selectDay(n,focus=false,source='code'){
  if(!overview(n))return;selectedDay=+n;
  try{localStorage.setItem('europa-guide-day',String(n));}catch{}
  document.querySelectorAll('[data-select-day]').forEach(b=>{const on=+b.dataset.selectDay===selectedDay;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  const o=overview(n),d=day(n),picked=window.GuideUI?.getChoice?.().meals?.[n]?.meal,mealOption=d?.mealOptions?.find(x=>String(x.venueId)===String(picked))||d?.mealOptions?.[0],meal=D.dining.find(m=>m.id===mealOption?.venueId)||D.dining.find(m=>m.id===d?.mealId),photoKey=scenicKey(n),cost=n===10?result.arrival:result.rows.find(r=>r.n===+n);
  const heroKey=D.homePhoto||'scenic-hall';if(homeCover.dataset.key!==heroKey){homeCover.innerHTML=photo(heroKey,'');homeCover.dataset.key=heroKey;}
  $('journey-preview').style.setProperty('--city',city(o.city).color);
  if(!currentCity)setScenery(photoKey,o.city);
  $('journey-preview').setAttribute('aria-labelledby','journey-tab-'+n);
  $('journey-preview').innerHTML=`<figure class="preview-figure">${photo(photoKey,D.media[photoKey]?.caption||contextCity(n))}<figcaption>${esc(D.media[photoKey]?.caption||contextCity(n))}</figcaption></figure><div class="preview-body"><div class="preview-title"><div><p class="eyebrow">${o.date} · ${esc(o.weekday)} · ${esc(contextCity(n))}</p><h3>${esc(o.title)}</h3><p class="preview-status">${esc(o.status)}${n===13?' · Volksoper 19h':''}${d?.sun?` · <span class="nowrap">sol ${esc(d.sun)}</span>`:''}</p></div><div class="preview-controls"><button class="icon-button" data-step-day="-1" aria-label="Consultar o dia anterior" ${n===10?'disabled':''}>Anterior</button><button class="icon-button" data-step-day="1" aria-label="Consultar o dia seguinte" ${n===22?'disabled':''}>Próximo</button></div></div><div class="preview-periods">${d?d.blocks.filter(b=>b.time!=='—').map(b=>`<div><span>${esc(b.label)}</span><strong>${esc(b.title)}</strong><small>${esc(b.time)}</small></div>`).join(''):`<div><span>Chegada</span><strong>Voo e chegada de madrugada</strong><small>${esc(o.text)}</small></div>`}</div><div class="preview-footer"><p>${meal?`<strong>À mesa</strong> ${esc(meal.name)} · ${esc(d.mealTime)} · previsão ${eur(mealOption?.target??meal.target)} por pessoa`:'<strong>Preparação</strong> '+(n===22?'Despertar às 3h e sair às 3h45 para o aeroporto. Voo 5h50 → Porto 8h40 e ônibus direto do aeroporto para Coimbra; em casa por volta das 12h20.':'Saída de casa, em Coimbra, às 12h30: ônibus direto até o aeroporto de Lisboa. Voo 19h35 → Budapeste 00h20. Traslado noturno, check-in de madrugada e descanso.')}<br><span class="fine">${cost?'Comida e passeios '+eur((cost.food||0)+(cost.activities||0))+' / pessoa.':''} Horários locais. As viagens sem bilhete ainda precisam ser confirmadas.</span></p><div class="actions"><a class="button primary-button" href="${d?'#/dia/'+n:'#/bud/roteiro'}">${n===10?'Abrir Budapeste':'Consultar este dia'}</a>${d?`<button class="button" data-show-day="${n}">Abrir mapa</button>`:`<a class="button" href="#/transportes">Chegada e transportes</a>`}</div></div></div>`;
  if($('journey-day-select'))$('journey-day-select').value=String(n);
  organizePhotos();
  const tab=$('journey-tab-'+n);if(focus)tab?.focus({preventScroll:true});if(tab&&$('home-page').hidden===false)tab.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  updateTools();
  window.dispatchEvent(new CustomEvent('guide:day',{detail:{n:selectedDay,source}}));
 }
 function updateTools(){
  const d=day(selectedDay)||{n:10,city:'bud'},cid=currentCity||d.city;$('trip-tools').innerHTML=`<a href="${d.n===10?'#/bud/roteiro':'#/dia/'+d.n}" data-tool="day"><span>${d.n===10?'Chegada':'Dia '+d.n}</span><small>${esc(d.n===22?'Regresso':city(cid).name)}</small></a><button data-show-day="${d.n===10?'all':d.n}" data-tool-map-city="${cid}"><span>Mapa</span><small>Percurso do dia</small></button><a href="${d.n===22?'#/dia/22':d.n===10?'#/reservas':'#/'+cid+'/mesa'}"><span>${d.n===22?'Em casa':'Comer'}</span><small>${d.n===22?'Antes do voo':'Duas escolhas'}</small></a><a href="#/transportes"><span>Embarques</span><small>Entre cidades</small></a>`;
 }
 // v26: a largura pedida acompanha o espaço real da foto, inclusive o recorte em "cover", e a densidade da tela.
 // Assim o navegador nunca escolhe uma cópia menor do que a área visível e a foto não aparece ampliada demais.
 function photoNeed(slot,m){
  const r=slot.getBoundingClientRect();if(!r.width||!r.height)return 0;
  const ar=(m.originalWidth&&m.originalHeight)?m.originalWidth/m.originalHeight:(m.width&&m.height?m.width/m.height:1.5);
  const img=slot.querySelector('img'),fit=img?getComputedStyle(img).objectFit:'cover';
  return Math.ceil(fit==='contain'||fit==='scale-down'?Math.min(r.width,r.height*ar):Math.max(r.width,r.height*ar));
 }
 // Repeated views reuse the same cached file while every item keeps its own image.
 function organizePhotos(){
  for(const slot of document.querySelectorAll('.photo-slot')){
   const key=slot.dataset.photo,m=D.media[key];if(!m)continue;
   const image=slot.querySelector('img');
   const cover=slot.closest('.chapter-photo,.home-cover');
   const eager=slot.closest('.home-cover,.preview-figure')||(cover&&!slot.closest('[data-page]')?.hidden);
   const need=photoNeed(slot,m),sizes=need?need+'px':cover?'(max-width:1260px) 100vw, 1260px':slot.closest('.preview-figure')?'(max-width:760px) 92vw, (max-width:1100px) 44vw, 530px':slot.closest('.destination-card')?'(max-width:560px) 92vw, (max-width:1000px) 46vw, 400px':slot.closest('.menu-city-photo')?'72px':slot.closest('.visit-thumb')?'84px':'(max-width:760px) 92vw, 600px';
   const widths=new Set();const variants=[[m.smallSrc,m.smallWidth],[m.mediumSrc,m.mediumWidth],[m.hdSrc,m.hdWidth],[m.largeSrc,m.largeWidth],[m.src,m.width],[m.xlSrc,m.xlWidth]].filter(([src,width])=>{if(!src||!width||widths.has(width))return false;widths.add(width);return true;});
   if(!image||image.getAttribute('src')!==m.src)slot.innerHTML=`<img src="${esc(m.src)}" ${variants.length>1?`srcset="${variants.map(x=>`${esc(x[0])} ${x[1]}w`).join(', ')}" sizes="${sizes}"`:''} data-need="${need}" alt="${esc(slot.dataset.photoAlt)}" loading="${eager?'eager':'lazy'}" ${slot.closest('.home-cover')?'fetchpriority="high"':''} decoding="async" width="${m.width||1200}" height="${m.height||800}">`;
   else if(need>(+image.dataset.need||0)){image.sizes=need+'px';image.dataset.need=need;}
   if(m.position)slot.style.setProperty('--photo-position',m.position);
   slot.classList.remove('photo-reference');slot.dataset.photoOwner='true';
  }
  document.querySelectorAll('.reference-only').forEach(x=>x.classList.remove('reference-only'));
 }
 let photoResize=0;window.addEventListener('resize',()=>{clearTimeout(photoResize);photoResize=setTimeout(organizePhotos,350);});
 function openCard(id){
  closePlace(false);
  const m=D.dining.find(m=>m.id===+id),p=points.get(+id),card=m?$('restaurante-'+id):$('visita-'+id)||$('alternativa-'+id);
  if(card){
   if(m&&!card.querySelector('.food-figure')){const f=document.createElement('div');f.className='dialog-only-photo';f.innerHTML=foodFigure(m);card.prepend(f);}
   activePlace=card;returnedTo=document.activeElement;card.querySelectorAll('details.story').forEach(x=>{if(!x.dataset.wasOpen)x.dataset.wasOpen=x.open?'1':'0';x.open=true;});
   const marker=document.createElement('span');marker.id='return-card-marker';card.before(marker);
   $('place-content').replaceChildren(card);card.classList.add('in-dialog');
   const title=card.querySelector('h4');title?.setAttribute('id','place-title');
  }else if(p){
   returnedTo=document.activeElement;
   $('place-content').innerHTML=`${p.photo?`<figure class="place-reference-photo">${photo(p.photo,p.photoAlt||p.title)}<figcaption>${esc(p.photoContext||D.media[p.photo]?.caption)}</figcaption></figure>`:''}<p class="eyebrow">${p.kind==='transport'?'TRANSPORTE':p.kind==='base'?'REFERÊNCIA DE HOSPEDAGEM':'NO PERCURSO'}</p><h3 id="place-title">${esc(p.title)}</h3><p>${esc(p.desc||p.coordinateNote||'Referência pública para organizar o deslocamento.')}</p><p class="price-line">${esc(p.price)}</p><p>${esc(p.hours)}</p>${p.address?`<p>${esc(p.address)}</p>`:''}<div class="links">${link(p.url,'Informação oficial')}${link(mapSearch(p),'Como chegar')}</div>`;
  }else return;
  organizePhotos();const dialog=$('place-detail');if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 function closePlace(returnFocus=true){
  const dialog=$('place-detail');if(dialog.open&&dialog.close)dialog.close();else dialog.removeAttribute('open');
  if(activePlace){const marker=$('return-card-marker');if(marker)marker.replaceWith(activePlace);activePlace.classList.remove('in-dialog');activePlace.querySelectorAll('details.story').forEach(x=>{x.open=x.dataset.wasOpen==='1';delete x.dataset.wasOpen;});activePlace.querySelector('.dialog-only-photo')?.remove();activePlace.querySelector('#place-title')?.removeAttribute('id');activePlace=null;}
  else $('place-content').replaceChildren();
  if(returnFocus&&returnedTo?.isConnected)returnedTo.focus({preventScroll:true});
  returnedTo=null;
 }
 const photoDialog=document.createElement('dialog');photoDialog.id='photo-view';photoDialog.setAttribute('aria-label','Fotografia ampliada');photoDialog.innerHTML='<button class="photo-close" aria-label="Fechar fotografia">Fechar</button><figure id="photo-view-body"></figure>';
 document.body.append(photoDialog);let photoMarker=null,photoImage=null,photoFocus=null;
 function openPhoto(key){
  const m=D.media[key];if(!m)return;photoFocus=document.activeElement;
  const img=document.createElement('img');img.src=m.src;img.alt=m.caption||'';
  const cap=document.createElement('figcaption');cap.textContent=m.caption;
  $('photo-view-body').replaceChildren(img,cap);
  if(photoDialog.showModal)photoDialog.showModal();else photoDialog.setAttribute('open','');
 }
 function closePhoto(){if(photoDialog.close&&photoDialog.open)photoDialog.close();else photoDialog.removeAttribute('open');$('photo-view-body').replaceChildren();photoFocus?.focus({preventScroll:true});photoFocus=null;}
 document.querySelector('.photo-close').addEventListener('click',closePhoto);photoDialog.addEventListener('cancel',e=>{e.preventDefault();closePhoto();});
 photoDialog.addEventListener('click',e=>{if(e.target===photoDialog)closePhoto();});
 document.querySelector('.place-close').addEventListener('click',()=>closePlace());$('place-detail').addEventListener('cancel',e=>{e.preventDefault();closePlace();});$('place-detail').addEventListener('click',e=>{if(e.target===$('place-detail'))closePlace();});
 document.addEventListener('click',e=>{
  const select=e.target.closest('[data-select-day]');if(select){selectDay(+select.dataset.selectDay,false,'user');return;}
  const step=e.target.closest('[data-step-day]');if(step){selectDay(selectedDay+(+step.dataset.stepDay),false,'user');return;}
  const place=e.target.closest('[data-open-place]');if(place){openCard(+place.dataset.openPlace);return;}
  const ph=e.target.closest('[data-open-photo]');if(ph){openPhoto(ph.dataset.openPhoto);return;}
  const map=e.target.closest('[data-show-day]');if(map&&!map.closest('.day-quick')){const cid=map.dataset.toolMapCity;if(window.RouteMap&&/^\d+$/.test(map.dataset.showDay)){window.RouteMap.focus(+map.dataset.showDay);return;}if(cid){window.GuideNavigation.open(cid,'mapa');const input=$('map-day-'+cid);if(input){input.value=String(map.dataset.showDay);renderMap(cid);}}else showDay(+map.dataset.showDay);}
  if(e.target.closest('#secret-key'))organizePhotos();
 });
 $('journey-timeline').addEventListener('keydown',e=>{const keys=['ArrowRight','ArrowLeft','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const n=e.key==='Home'?10:e.key==='End'?22:Math.min(22,Math.max(10,selectedDay+(e.key==='ArrowRight'?1:-1)));selectDay(n,true,'user');});
 function decorateRoute(){
  const h=location.hash,parts=h.startsWith('#/')?h.slice(2).split('/'):[],n=parts[0]==='dia'?+parts[1]:h.startsWith('#dia-')?+h.slice(5):null;
  document.querySelectorAll('[data-trip-day]').forEach(el=>el.hidden=!!n&&+el.dataset.tripDay!==n);
  const visibleCity=[...document.querySelectorAll('.city-chapter')].find(x=>!x.hidden)?.id;currentCity=visibleCity||null;
  const tabs=currentCity?document.querySelector('#'+currentCity+' .local-links'):null;
  document.documentElement.style.setProperty('--city-tabs-height',(tabs?.getBoundingClientRect().height||80)+'px');
  if(currentCity)setScenery(city(currentCity).photo,currentCity);else setScenery(scenicKey(selectedDay),overview(selectedDay)?.city);
  const d=day(n);if(d){selectDay(n);document.body.classList.add('day-focus');}
  else{document.body.classList.remove('day-focus');if(currentCity){const available=D.days.filter(d=>d.city===currentCity||(currentCity==='sal'&&d.n===16));if(!available.some(d=>d.n===selectedDay)&&available.length)selectDay(available[0].n);}}
  updateTools();
  for(const bar of document.querySelectorAll('.day-switcher')){
   bar.hidden=!n||bar.closest('.city-chapter').hidden;
   if(!bar.hidden)bar.innerHTML=`${n>11?`<a class="button" href="#/dia/${n-1}">Dia ${n-1} · ${esc(contextCity(n-1))}</a>`:'<a class="button" href="#/inicio">Visão geral</a>'}<span>${n} de novembro · ${esc(contextCity(n))}</span>${n<22?`<a class="button" href="#/dia/${n+1}">Dia ${n+1} · ${esc(contextCity(n+1))}</a>`:'<a class="button" href="#/inicio">Visão geral</a>'}`;
  }
  organizePhotos();
  document.querySelectorAll('.day-index a').forEach(a=>+a.getAttribute('href').split('/').at(-1)===n?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  const here=parts[0];document.querySelectorAll('#trip-tools a').forEach(a=>((here==='dia'&&a.dataset.tool==='day')||a.getAttribute('href')===h)?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
 }
 window.addEventListener('hashchange',()=>{closePhoto();closePlace(false);});
 // Search leads to the atual card rather than duplicating its contents.
 const searchButton=document.createElement('button');searchButton.className='search-toggle';searchButton.type='button';searchButton.textContent='Pesquisar';searchButton.setAttribute('aria-label','Pesquisar visitas, restaurantes e obras');document.querySelector('.menu-toggle').before(searchButton);
 const searchDialog=document.createElement('dialog');searchDialog.id='guide-search';searchDialog.setAttribute('aria-labelledby','search-title');searchDialog.innerHTML='<button class="search-close">Fechar</button><h3 id="search-title">Encontrar no guia</h3><label>Visita, restaurante, obra ou cidade<input type="search" id="global-search" placeholder="Mucha, Bruegel, almoço…" autocomplete="off"></label><p class="fine">Pesquise uma visita ou escolha uma cidade para consultar o seu capítulo.</p><div id="search-results" aria-live="polite"></div>';document.body.append(searchDialog);
 let searchFocus=null;
 function closeSearch(){if(searchDialog.close&&searchDialog.open)searchDialog.close();else searchDialog.removeAttribute('open');searchFocus?.focus({preventScroll:true});}
 searchButton.addEventListener('click',()=>{searchFocus=document.activeElement;if(searchDialog.showModal)searchDialog.showModal();else searchDialog.setAttribute('open','');$('global-search').focus();});
 searchDialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeSearch();}});
 document.querySelector('.search-close').addEventListener('click',closeSearch);searchDialog.addEventListener('cancel',e=>{e.preventDefault();closeSearch();});searchDialog.addEventListener('click',e=>{if(e.target===searchDialog)closeSearch();});
 const records=[...D.cities.map(c=>({label:c.name,detail:'Guia da cidade',city:c.id,url:'#/'+c.id+'/roteiro'})),...D.alternatives.map(p=>({label:p.title,detail:p.desc,city:p.city,id:p.id})),...D.places.map(p=>({label:p.title,detail:p.desc,city:p.city,id:p.id})),...D.dining.map(p=>({label:p.name,detail:p.taste,city:p.city,id:p.id})),...D.experiences.map(x=>({label:x.title,detail:x.desc,city:x.city,url:'#experiencia-'+x.city+'-'+x.n})),...D.art.flatMap(a=>a.works.map(w=>({label:w[1],detail:w[0],city:a.city,url:'#arte-'+a.id})))];
 $('global-search').addEventListener('input',()=>{const q=normal($('global-search').value.trim());if(!q){$('search-results').replaceChildren();return;}const matches=records.filter(r=>normal(r.label+' '+r.detail+' '+city(r.city).name).includes(q));$('search-results').innerHTML=matches.length?matches.slice(0,30).map(r=>`<button class="search-result" ${r.id?'data-search-id="'+r.id+'"':'data-search-url="'+esc(r.url)+'"'}><strong>${esc(r.label)}</strong><small>${esc(city(r.city).name)} · ${esc(r.detail.slice(0,105))}</small></button>`).join(''):'<p>Nenhuma correspondência. Experimente o nome da cidade, do artista ou da visita.</p>';});
 $('search-results').addEventListener('click',e=>{const b=e.target.closest('.search-result');if(!b)return;closeSearch();if(b.dataset.searchId)openCard(+b.dataset.searchId);else location.hash=b.dataset.searchUrl;});
 const offline=document.createElement('div');offline.className='offline-tools';offline.innerHTML='<span id="connection-status" role="status"></span><button id="save-offline" class="button">Salvar o guia no aparelho</button><p id="offline-status" class="fine" aria-live="polite">Salve o conteúdo e as fotos para consulta sem internet. Bilhetes, cardápios externos e navegação continuam nos sites dos operadores.</p>';$('booking-content').before(offline);
 const connection=()=>{$('connection-status').textContent=navigator.onLine?'Conectado à internet':'Sem internet · consultar o conteúdo salvo';document.body.classList.toggle('offline',!navigator.onLine);};connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
 let worker=null;
 if('serviceWorker'in navigator){navigator.serviceWorker.register('service-worker.js').then(()=>navigator.serviceWorker.ready).then(r=>{worker=r.active;}).catch(()=>{$('offline-status').textContent='Este navegador não permitiu salvar o guia. A consulta online permanece disponível.';$('save-offline').disabled=true;});navigator.serviceWorker.addEventListener('message',e=>{const m=e.data||{};if(m.type==='CACHE_REMOTE_PROGRESS'){$('offline-status').textContent=`Salvando as fotos do Commons: ${m.done} de ${m.total}.`;}
   if(m.type==='CACHE_PROGRESS'){$('offline-status').textContent=`Salvando ${m.done} de ${m.total} recursos.`;}if(m.type==='CACHE_COMPLETE'){$('save-offline').disabled=false;$('offline-status').textContent=m.failed?`Ficaram ${m.failed} recursos sem salvar. Com internet, tente de novo.`:'Guia, cronogramas, fotografias e mapas de referência salvos neste aparelho.'+(m.remoteFailed?` ${m.remoteFailed} de ${m.remoteTotal} fotos do Wikimedia Commons ficaram de fora; com internet, tente de novo.`:'')+' Links externos e mapa interativo precisam de internet.';}if(m.type==='CACHE_ERROR'){$('save-offline').disabled=false;$('offline-status').textContent='Não foi possível concluir a gravação. Verifique o espaço disponível e tente novamente.';}});}else{$('save-offline').disabled=true;$('offline-status').textContent='A consulta sem internet não é suportada neste navegador. O guia continua disponível online.';}
 $('save-offline').addEventListener('click',async()=>{if(!navigator.onLine){$('offline-status').textContent='Conecte-se à internet para salvar os recursos que ainda faltam.';return;}if(!worker){try{const r=await navigator.serviceWorker.ready;worker=r.active;}catch{}}if(worker){$('save-offline').disabled=true;worker.postMessage({type:'CACHE_GUIDE'});}else{$('offline-status').textContent='A preparação ainda não terminou. Tente novamente dentro de instantes.';}});
 window.FieldGuide={organizePhotos,selectDay,openCard,decorateRoute,selectedDay:()=>selectedDay};
 window.addEventListener('guide:budget',()=>selectDay(selectedDay));
 const picker=document.createElement('label');picker.className='day-picker';picker.innerHTML='Escolher uma data<select id="journey-day-select" aria-label="Escolher o dia da viagem">'+dates.map(d=>`<option value="${d.n}">${d.date} · ${esc(contextCity(d.n))}</option>`).join('')+'</select>';document.querySelector('.trip-heading').append(picker);
 $('journey-day-select').addEventListener('change',e=>selectDay(+e.target.value,false,'user'));
 const topbar=document.querySelector('.topbar'),toolsBar=$('trip-tools');const sizeHeader=()=>{document.documentElement.style.setProperty('--topbar-height',topbar.getBoundingClientRect().height+'px');document.documentElement.style.setProperty('--trip-tools-height',toolsBar.getBoundingClientRect().height+'px');};if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(sizeHeader);observer.observe(topbar);observer.observe(toolsBar);}window.addEventListener('resize',sizeHeader);sizeHeader();
 timeline();selectDay(selectedDay);organizePhotos();window.GuideNavigation.route();
})();
