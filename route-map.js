'use strict';
// v26 · Mapa navegável de cada dia.
// Mostra os trechos reais do dia (ruas e estradas do OpenStreetMap, calculadas pelo OSRM) e as fichas de cada parada.
// A lista ao lado é o próprio cronograma porta a porta: escolher uma etapa destaca o trecho ou abre a ficha no mapa,
// e "Anterior" e "Próximo" percorrem o dia na ordem. Depende de guide.js (D, $, esc, points, eur, link, mapSearch)
// e de journey.js (GuideJourney.resolveStep, ícones e nomes das etapas).
(function () {
  const S = D.schedules || {};
  const LEGS = D.legs || {};
  const TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
  const KIND = { walk: 'A pé', app: 'Carro por aplicativo', taxi: 'Táxi', car: 'Carro', metro: 'Metrô', tram: 'Bonde', bus: 'Ônibus',
    coach: 'Ônibus de viagem', train: 'Trem', flight: 'Voo', boat: 'Barco', home: 'Casa', wake: 'Despertar', arrive: 'Chegada',
    visit: 'Visita', photo: 'Foto', meal: 'Refeição', snack: 'Lanche', coffee: 'Café', rest: 'Pausa', show: 'Espetáculo', night: 'Noite', park: 'Estacionar', shop: 'Compras' };
  const MOVE = new Set(['walk', 'app', 'taxi', 'car', 'metro', 'tram', 'bus', 'coach', 'train', 'flight', 'boat']);
  const instances = new Map();
  const km = m => (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const human = d => { const h = Math.floor(d / 60), m = d % 60; return h ? h + 'h' + (m ? String(m).padStart(2, '0') : '') : m + ' min'; };
  const place = id => (id && (points.get(id) || D.dining.find(x => x.id === id))) || null;
  const firstSentence = t => { const s = String(t || '').split(/(?<=[.!?])\s/)[0]; return s.length > 220 ? s.slice(0, 217) + '…' : s; };
  const icon = k => (window.GuideJourney?.icons?.[k]) || '';
  const resolve = (n, s) => (window.GuideJourney?.resolveStep ? window.GuideJourney.resolveStep(n, s) : s);
  const cityColor = n => { const day = D.journey.find(j => j.n === +n); const c = D.cities.find(x => x.id === day?.city); return +n === 22 ? '#7d6650' : (c?.color || '#155b69'); };

  // Etapas do dia, já com a refeição escolhida, os trechos e as paradas numeradas.
  function model(n) {
    const sc = S[n];
    if (!sc) return null;
    const steps = sc.steps.map((raw, i) => Object.assign({ i }, resolve(n, raw)));
    // As bases (hospedagens) aparecem com o ícone da casa; as demais paradas são numeradas na ordem do dia.
    const isBase = st => { const p = place(st.place); return p?.kind === 'base' || ['home', 'wake'].includes(st.k) && !!p; };
    const bases = new Set(steps.filter(isBase).map(st => st.place));
    const order = [];
    for (const st of steps) {
      const p = place(st.place);
      if (p?.coords && !bases.has(st.place) && !order.includes(st.place)) order.push(st.place);
    }
    // Quem escolheu outra mesa: o trecho calculado até o restaurante sugerido vira uma ligação direta até o escolhido.
    let last = null;
    steps.forEach((st, idx) => {
      const p = place(st.place);
      const lg = st.leg && LEGS[st.leg];
      if (lg) {
        const car = ['app', 'taxi', 'car'].includes(st.k);
        const g = car ? (lg.car || lg.walk) : (lg.walk || lg.car);
        if (g) {
          st.geo = { path: g.path, m: g.m, min: g.min, mode: car ? (st.k === 'car' ? 'car' : 'app') : 'walk' };
          const next = steps.slice(idx + 1).find(x => place(x.place)?.coords);
          const raw = sc.steps[next?.i];
          if (next && raw && raw.place !== next.place && lg.to === raw.place) {
            const from = place(lg.from)?.coords || g.path[0];
            st.geo = { path: [from, place(next.place).coords], m: null, min: null, mode: st.geo.mode, approx: true };
          }
        }
      }
      if (p?.coords) { st.base = bases.has(st.place); st.stop = st.base ? 0 : order.indexOf(st.place) + 1; st.coords = p.coords; last = p.coords; }
      st.near = last;
    });
    return { n, sc, steps, order, bases: [...bases] };
  }

  function totals(m) {
    let walk = 0, ride = 0;
    for (const st of m.steps) {
      if (!st.geo || st.opt) continue;
      if (st.geo.mode === 'walk' && st.geo.min) walk += st.geo.min;
      if (st.geo.mode === 'app' && st.geo.min) ride += st.geo.min;
    }
    return { walk, ride };
  }

  function stepLine(st) {
    const bits = [KIND[st.k] || ''];
    if (st.geo?.min) bits.push(human(st.geo.min));
    if (st.geo?.m) bits.push(km(st.geo.m));
    if (st.opt) bits.push('opcional');
    return bits.filter(Boolean).join(' · ');
  }

  function shell(el, n) {
    const m = model(n);
    if (!m) return null;
    const j = D.journey.find(x => x.n === +n);
    const t = totals(m);
    const gm = window.GuideUI?.routeDayURL?.(n);
    el.style.setProperty('--city', cityColor(n));
    el.innerHTML = `<header class="rm-head"><div><p class="eyebrow">Mapa do dia · ${esc(j?.date || n + '/11')} · ${esc(j?.weekday || '')}</p><h4>${esc(j?.title || '')}</h4>`
      + `<p class="rm-sum">${t.walk ? `<span class="rm-walk">${icon('walk')}${human(t.walk)} a pé entre lugares</span>` : ''}${t.ride ? `<span>${icon('taxi')}${human(t.ride)} de carro por aplicativo</span>` : ''}<span>${m.order.length} ${m.order.length === 1 ? 'parada' : 'paradas'}</span></p></div>`
      + `<div class="rm-actions"><button type="button" class="button" data-rm-all>Ver o dia inteiro</button>${gm ? `<a class="button" href="${esc(gm)}" target="_blank" rel="noopener noreferrer">Navegação no Google Maps</a>` : ''}</div></header>`
      + `<div class="rm-body"><div class="rm-map" role="region" aria-label="Mapa do dia ${esc(n)} de novembro"></div>`
      + `<aside class="rm-side"><div class="rm-nav"><button type="button" class="icon-button" data-rm-step="-1" aria-label="Etapa anterior">Anterior</button><span class="rm-pos" aria-live="polite">Toque numa etapa</span><button type="button" class="icon-button" data-rm-step="1" aria-label="Próxima etapa">Próximo</button></div>`
      + `<ol class="rm-list">${m.steps.map(st => `<li><button type="button" class="rm-step k-${esc(st.k)}${st.opt ? ' is-optional' : ''}${st.geo || st.coords ? '' : ' no-geo'}" data-rm-i="${st.i}"><time>${esc(st.t)}</time><span class="rm-ico" aria-hidden="true">${st.base ? `<i class="rm-home">${icon('home')}</i>` : st.stop ? `<b>${st.stop}</b>` : icon(st.k)}</span><span class="rm-txt"><strong>${esc(st.title)}</strong><small>${esc(stepLine(st))}</small></span></button></li>`).join('')}</ol></aside></div>`
      + `<div class="rm-card" aria-live="polite"><p class="fine">Escolha uma etapa na lista ou toque num trecho ou num número do mapa. Linha contínua: a pé; tracejada: carro por aplicativo ou táxi; mais grossa: estrada.</p></div>`;
    return m;
  }

  function arrowsFor(path) {
    // três setas ao longo do trecho, na direção do percurso
    if (!path || path.length < 2) return [];
    const seg = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const d = Math.hypot((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]);
      seg.push([a, b, d]); total += d;
    }
    const out = [];
    for (const f of [0.3, 0.55, 0.8]) {
      let acc = 0;
      for (const [a, b, d] of seg) {
        if (acc + d >= f * total && d > 0) {
          const t = (f * total - acc) / d;
          const lat = a[0] + (b[0] - a[0]) * t, lon = a[1] + (b[1] - a[1]) * t;
          const ang = Math.atan2((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI;
          out.push([[lat, lon], ang]);
          break;
        }
        acc += d;
      }
    }
    return out;
  }

  function popupHTML(id) {
    const p = place(id);
    if (!p) return '';
    const name = p.title || p.name;
    const key = p.photo;
    const media = key && D.media[key];
    const img = media ? `<img src="${esc(media.smallSrc || media.mediumSrc || media.src)}" alt="" loading="lazy" width="240" height="150">` : '';
    const text = firstSentence(p.desc || p.taste || p.coordinateNote || '');
    const hasCard = points.has(id) || D.dining.some(x => x.id === id);
    return `<div class="rm-pop">${img}<strong>${esc(name)}</strong>${text ? `<p>${esc(text)}</p>` : ''}${p.price ? `<p class="fine">${esc(firstSentence(p.price))}</p>` : ''}`
      + `<div class="rm-pop-links">${hasCard ? `<button type="button" class="button" data-open-place="${id}">Abrir ficha</button>` : ''}${link(mapSearch(p), 'Como chegar', 'button')}</div></div>`;
  }

  function cardHTML(m, st) {
    const gm = st.nav ? 'https://www.google.com/maps/dir/?' + new URLSearchParams(Object.assign({ api: '1' }, st.nav.o ? { origin: st.nav.o } : {}, { destination: st.nav.d, travelmode: st.nav.m })) : null;
    const hasCard = st.place && (points.has(st.place) || D.dining.some(x => x.id === st.place));
    return `<div class="rm-card-head"><span class="rm-card-ico" aria-hidden="true">${icon(st.k)}</span><div><p class="eyebrow">${esc(st.t)}${st.end ? '–' + esc(st.end) : ''} · ${esc(stepLine(st))}</p><h5>${esc(st.title)}</h5></div></div>`
      + `${st.text ? `<p>${esc(st.text)}</p>` : ''}${st.geo?.approx ? '<p class="fine">Trajeto aproximado até a mesa escolhida; a navegação mostra o caminho pelas ruas.</p>' : ''}`
      + `<div class="rm-card-links">${hasCard ? `<button type="button" class="button" data-open-place="${st.place}">Abrir ficha</button>` : ''}${gm ? `<a class="button" href="${esc(gm)}" target="_blank" rel="noopener noreferrer">${st.nav.m === 'walking' ? 'Rota a pé' : st.nav.m === 'driving' ? 'Rota de carro' : 'Rota de transporte'} no Google Maps</a>` : ''}</div>`;
  }

  function create(el) {
    const n = +el.dataset.routeMap;
    const m = shell(el, n);
    if (!m) return null;
    const inst = { el, n, m, map: null, layers: new Map(), markers: new Map(), arrows: null, sel: null };
    instances.set(el, inst);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-rm-i]');
      if (b) { select(inst, +b.dataset.rmI, true); return; }
      const s = e.target.closest('[data-rm-step]');
      if (s) { step(inst, +s.dataset.rmStep); return; }
      if (e.target.closest('[data-rm-all]')) reset(inst);
    });
    el.querySelector('.rm-list').addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      step(inst, e.key === 'ArrowDown' ? 1 : -1, true);
    });
    return inst;
  }

  function draw(inst) {
    if (inst.map || typeof L === 'undefined') return;
    const box = inst.el.querySelector('.rm-map');
    if (!box) return;
    const map = L.map(box, { scrollWheelZoom: false, zoomSnap: 0.25, tap: false });
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19, subdomains: 'abcd', className: 'rm-tiles' }).addTo(map);
    inst.map = map;
    const color = cityColor(inst.n);
    const all = [];
    for (const st of inst.m.steps) {
      if (!st.geo) continue;
      const style = st.geo.mode === 'walk' ? { weight: 4.5, dashArray: null } : st.geo.mode === 'car' ? { weight: 6, dashArray: null } : { weight: 4, dashArray: '9 8' };
      const halo = L.polyline(st.geo.path, { color: '#fff', weight: style.weight + 4, opacity: 0.85, interactive: false }).addTo(map);
      const line = L.polyline(st.geo.path, Object.assign({ color: st.geo.mode === 'walk' ? color : '#1d1f21', opacity: st.opt ? 0.55 : 0.92, lineCap: 'round', lineJoin: 'round' }, style)).addTo(map);
      line.bindTooltip(`${esc(st.t)} · ${esc(st.title)}${st.geo.min ? ' · ' + st.geo.min + ' min' : ''}`, { sticky: true, className: 'rm-tip' });
      line.on('click', () => select(inst, st.i, false));
      inst.layers.set(st.i, { line, halo, base: line.options.opacity });
      all.push(...st.geo.path);
    }
    for (const id of [...inst.m.bases, ...inst.m.order]) {
      const p = place(id);
      if (!p?.coords) continue;
      const first = inst.m.steps.find(s => s.place === id);
      const isHome = inst.m.bases.includes(id);
      const num = inst.m.order.indexOf(id) + 1;
      const mk = L.marker(p.coords, {
        icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: `<span class="rm-pin${isHome ? ' is-home' : ''}" style="--c:${color}">${isHome ? icon('home') : num}</span>` }),
        keyboard: false, riseOnHover: true
      }).addTo(map);
      mk.bindPopup(popupHTML(id), { maxWidth: 260, className: 'rm-popup' });
      mk.on('click', () => select(inst, first.i, false, true));
      inst.markers.set(id, mk);
      all.push(p.coords);
    }
    inst.all = all;
    reset(inst);
    setTimeout(() => map.invalidateSize(), 80);
  }

  function fit(inst, pts) {
    if (!inst.map || !pts?.length) return;
    const wide = inst.el.querySelector('.rm-map').offsetWidth > 560;
    if (pts.length === 1) inst.map.setView(pts[0], 16, { animate: true });
    else inst.map.fitBounds(L.latLngBounds(pts), { padding: wide ? [40, 40] : [24, 24], maxZoom: 16, animate: true });
  }

  function reset(inst) {
    inst.sel = null;
    inst.el.querySelectorAll('[data-rm-i]').forEach(b => b.removeAttribute('aria-current'));
    inst.el.querySelector('.rm-pos').textContent = 'Toque numa etapa';
    for (const [, l] of inst.layers) { l.line.setStyle({ opacity: l.base }); l.halo.setStyle({ opacity: 0.85 }); }
    if (inst.arrows) { inst.arrows.remove(); inst.arrows = null; }
    inst.map?.closePopup();
    fit(inst, inst.all);
  }

  function select(inst, i, fromList, fromMarker) {
    const st = inst.m.steps[i];
    if (!st) return;
    inst.sel = i;
    const pos = inst.el.querySelector('.rm-pos');
    pos.textContent = `Etapa ${i + 1} de ${inst.m.steps.length}`;
    inst.el.querySelectorAll('[data-rm-i]').forEach(b => b.toggleAttribute('aria-current', +b.dataset.rmI === i));
    const item = inst.el.querySelector(`[data-rm-i="${i}"]`);
    if (item && !fromList) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    inst.el.querySelector('.rm-card').innerHTML = cardHTML(inst.m, st);
    if (!inst.map) return;
    for (const [k, l] of inst.layers) {
      const on = k === i;
      l.line.setStyle({ opacity: on ? 1 : 0.22, weight: (l.line.options.dashArray ? 4 : l.line.options.weight > 5 ? 6 : 4.5) + (on ? 2 : 0) });
      l.halo.setStyle({ opacity: on ? 0.95 : 0.35 });
      if (on) { l.halo.bringToFront(); l.line.bringToFront(); }
    }
    if (inst.arrows) { inst.arrows.remove(); inst.arrows = null; }
    if (st.geo) {
      const grp = L.layerGroup();
      for (const [ll, ang] of arrowsFor(st.geo.path)) {
        L.marker(ll, { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: `<span class="rm-arrow" style="transform:rotate(${ang.toFixed(0)}deg)"></span>` }) }).addTo(grp);
      }
      inst.arrows = grp.addTo(inst.map);
      inst.map.closePopup();
      fit(inst, st.geo.path);
    } else if (st.coords) {
      const mk = inst.markers.get(st.place);
      inst.map.setView(st.coords, Math.max(inst.map.getZoom(), 15), { animate: true });
      if (mk && !fromMarker) mk.openPopup();
    } else if (st.near) {
      inst.map.closePopup();
    }
  }

  function step(inst, dir, focus) {
    const max = inst.m.steps.length - 1;
    let i = inst.sel === null ? (dir > 0 ? 0 : max) : Math.min(max, Math.max(0, inst.sel + dir));
    select(inst, i, false);
    if (focus) inst.el.querySelector(`[data-rm-i="${i}"]`)?.focus({ preventScroll: true });
  }

  function ensure(el) {
    let inst = instances.get(el) || create(el);
    if (!inst) return null;
    if (el.offsetParent !== null) {
      draw(inst);
      inst.map?.invalidateSize();
    }
    return inst;
  }

  // Desenha quando o mapa aparece na tela.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { ensure(e.target); }
  }, { rootMargin: '250px' }) : null;

  function mountAll(root = document) {
    root.querySelectorAll('[data-route-map]').forEach(el => {
      if (!instances.has(el)) create(el);
      if (io) io.observe(el); else ensure(el);
    });
  }

  function refresh(n) {
    for (const [el, inst] of instances) {
      if (inst.n !== +n) continue;
      if (inst.map) { inst.map.remove(); }
      instances.delete(el);
      create(el);
      if (el.offsetParent !== null) ensure(el);
    }
  }

  // Abre o dia, rola até o mapa e seleciona uma etapa.
  function focus(n, i) {
    const target = () => document.querySelector(`.city-chapter:not([hidden]) [data-route-map="${n}"]`) || document.querySelector(`[data-route-map="${n}"]`);
    const go = () => {
      const el = target();
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const inst = ensure(el);
      if (inst && Number.isInteger(i)) setTimeout(() => select(inst, i, false), 350);
    };
    if (D.days.some(d => d.n === +n) && !location.hash.startsWith('#/dia/' + n)) {
      location.hash = '#/dia/' + n;
      setTimeout(go, 120);
    } else go();
  }

  window.addEventListener('hashchange', () => setTimeout(() => {
    for (const [el, inst] of instances) if (el.offsetParent !== null) { if (!inst.map) ensure(el); else inst.map.invalidateSize(); }
  }, 60));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rm-focus]');
    if (!b) return;
    const [n, i] = b.dataset.rmFocus.split(':').map(Number);
    focus(n, i);
  });
  document.addEventListener('change', e => {
    const input = e.target.closest?.('[data-meal-pick]');
    if (input) refresh(+input.dataset.mealPick);
  });

  window.RouteMap = { mountAll, ensure: n => { const el = document.querySelector(`.city-chapter:not([hidden]) [data-route-map="${n}"]`) || document.querySelector(`[data-route-map="${n}"]`); return el ? ensure(el) : null; }, refresh, focus, model };
  mountAll();
})();
