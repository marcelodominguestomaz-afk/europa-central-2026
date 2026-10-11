'use strict';
// v26 · Abertura em mosaico, mapa macro da viagem, menu de dias e cronogramas porta a porta.
// Depende das constantes globais de guide.js (D, $, esc, city, points, eur, photo, selectedMeal).
(function () {
  const S = D.schedules || {};
  const MACRO = D.macro || { segments: [], stays: [], stops: [] };
  const MONTAGE = D.montage || [];
  const DAYS = D.journey.map(j => j.n);
  const journeyDay = n => D.journey.find(j => j.n === +n);
  const guideDay = n => D.days.find(d => d.n === +n);
  const SHORT = { 'segunda-feira': 'seg', 'terça-feira': 'ter', 'quarta-feira': 'qua', 'quinta-feira': 'qui', 'sexta-feira': 'sex', 'sábado': 'sáb', 'domingo': 'dom' };
  const PLACE = { 10: 'Saída de Coimbra', 16: 'Alpes e Salzburgo', 17: 'Baviera e Pilsen', 22: 'Volta a Coimbra' };
  const dayColor = n => (+n === 22 ? '#7d6650' : city(journeyDay(n)?.city).color || '#155b69');
  const dayPlace = n => PLACE[n] || city(journeyDay(n)?.city).name || '';
  const minutes = t => { const m = /^(\d{1,2})h(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const span = (a, b) => { const x = minutes(a); let y = minutes(b); if (x === null || y === null) return 0; if (y < x) y += 1440; return y - x; };
  const human = d => { if (!d) return ''; const h = Math.floor(d / 60), m = d % 60; return h ? h + 'h' + (m ? String(m).padStart(2, '0') : '') : m + ' min'; };
  const gmaps = nav => 'https://www.google.com/maps/dir/?' + new URLSearchParams(Object.assign({ api: '1' }, nav.o ? { origin: nav.o } : {}, { destination: nav.d, travelmode: nav.m }));

  // ------------------------------------------------------------------ ícones (traço simples, 24 × 24)
  const svg = body => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const ICONS = {
    home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>'),
    wake: svg('<path d="M12 3v3M4.9 7.2l2 2M19.1 7.2l-2 2M2.5 16h19"/><path d="M7 16a5 5 0 0 1 10 0"/><path d="M5 20h14"/>'),
    walk: svg('<circle cx="13" cy="4.5" r="1.8"/><path d="m10.5 21 2-6.5 3 3V21"/><path d="M8 12.5 10.5 9l3.5.5 2.5 3"/><path d="m10.5 9-1 5.5"/>'),
    metro: svg('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8.5 14h.01M15.5 14h.01M8 17l-2 4M16 17l2 4"/><path d="M9.5 7h5"/>'),
    tram: svg('<rect x="5" y="5" width="14" height="12" rx="3"/><path d="M9 2h6M12 2v3M5 11h14M8.5 14h.01M15.5 14h.01M8 17l-2 4M16 17l2 4"/>'),
    bus: svg('<path d="M5 4h14a2 2 0 0 1 2 2v11H3V6a2 2 0 0 1 2-2z"/><path d="M3 11h18M7 17v2M17 17v2"/><circle cx="7.5" cy="14" r=".6"/><circle cx="16.5" cy="14" r=".6"/>'),
    train: svg('<path d="M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><path d="M4 10h16M12 3v7M8 17l-2.5 4M16 17l2.5 4M8 13.5h.01M16 13.5h.01"/>'),
    car: svg('<path d="M3 15.5V13l2.2-5A2 2 0 0 1 7 7h10a2 2 0 0 1 1.8 1.1L21 13v2.5"/><path d="M3 13h18M3 15.5v2h2.5M21 15.5v2h-2.5"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
    taxi: svg('<path d="M10 4h4l.6 3"/><path d="M3 15.5V13l2.2-5A2 2 0 0 1 7 7h10a2 2 0 0 1 1.8 1.1L21 13v2.5"/><path d="M3 13h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
    flight: svg('<path d="M21 15.5 13.5 12V5.5a1.5 1.5 0 0 0-3 0V12L3 15.5v2l7.5-2V20L8 21.5V23l4-1 4 1v-1.5L13.5 20v-4.5l7.5 2z"/>'),
    arrive: svg('<path d="M3 20h18"/><path d="m4.5 10.5 2.2-1 3.4 2.2 4.6-2.4c1.4-.7 3.3-.4 3.8.6.4.9-.4 2-1.6 2.6L8 16.5 3 13.8z"/>'),
    boat: svg('<path d="M3 15h18l-2.5 4.5h-13z"/><path d="M6.5 15v-4h11v4M9.5 11V8h5v3"/><path d="M3 21.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>'),
    visit: svg('<path d="M3 21h18M5 21V10.5M19 21V10.5M9.5 21V10.5M14.5 21V10.5"/><path d="M3 10.5 12 4l9 6.5z"/>'),
    photo: svg('<path d="M4 8h3l1.8-2.5h6.4L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.4"/>'),
    meal: svg('<path d="M7 3v7.5M5 3v5a2 2 0 0 0 4 0V3M7 10.5V21"/><path d="M17 3c-2.2 2-2.2 7 0 8.5V21"/>'),
    snack: svg('<path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c-.8 1 .8 2 0 3M12 3c-.8 1 .8 2 0 3"/>'),
    coffee: svg('<path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M3 21h14"/>'),
    rest: svg('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'),
    show: svg('<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14.5 6v2.5M14.5 11v2M14.5 15.5V18"/>'),
    night: svg('<path d="M7.5 3h9l-1.2 7a3.3 3.3 0 0 1-6.6 0z"/><path d="M12 13.5V20M8.5 21h7"/>'),
    park: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M10 17V7h3.2a3 3 0 0 1 0 6H10"/>'),
  };
  ICONS.coach = ICONS.bus;
  ICONS.app = ICONS.taxi;
  ICONS.shop = svg('<path d="M4 8h16l-1.6 11.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/><path d="M9.5 12.5v4M14.5 12.5v4"/>');
  const KIND = { home: 'Casa', wake: 'Despertar', walk: 'A pé', metro: 'Metrô', tram: 'Bonde', bus: 'Ônibus', coach: 'Ônibus de viagem', train: 'Trem', car: 'Carro', taxi: 'Táxi', app: 'Carro por aplicativo', flight: 'Voo', arrive: 'Chegada', boat: 'Barco', visit: 'Visita', photo: 'Foto', meal: 'Refeição', snack: 'Lanche', coffee: 'Café', rest: 'Pausa', show: 'Espetáculo', night: 'Noite', park: 'Estacionar', shop: 'Compras' };
  const MOVE = new Set(['walk', 'metro', 'tram', 'bus', 'coach', 'train', 'car', 'taxi', 'app', 'flight', 'boat']);
  const TRANSIT = new Set(['metro', 'tram', 'bus', 'taxi']);

  // ------------------------------------------------------------------ cronograma porta a porta
  function resolveStep(n, step) {
    const d = guideDay(n);
    let title = step.title, text = step.text || '', place = step.place;
    for (const kind of ['meal', 'snack', 'dinner']) {
      const list = kind === 'meal' ? d?.mealOptions : kind === 'dinner' ? d?.dinnerOptions : d?.snackOptions;
      const fits = kind === 'dinner' ? step.slot === 'dinner' : kind === 'meal' ? step.k === 'meal' && step.slot !== 'dinner' : step.k === 'snack' || step.k === 'coffee';
      if (!fits || !list?.some(o => o.venueId === place)) continue;
      const picked = typeof selectedMeal === 'function' ? selectedMeal(d, kind) : list[0];
      if (picked && picked.venueId !== place) {
        const m = D.dining.find(x => x.id === picked.venueId);
        if (m) { title = ({ meal: 'Almoço escolhido · ', snack: 'Lanche escolhido · ', dinner: 'Jantar escolhido · ' })[kind] + m.name; text = picked.dish + ' · previsão ' + eur(picked.target) + ' por pessoa.'; place = m.id; }
      }
    }
    return Object.assign({}, step, { title, text, place });
  }
  function hasCard(id) { return points.has(id) || D.dining.some(x => x.id === id); }
  function stepHTML(n, raw, i) {
    const st = resolveStep(n, raw);
    const dur = st.dur ? human(st.dur) : st.end ? human(span(st.t, st.end)) : '';
    const navLabel = st.nav ? (st.nav.m === 'walking' ? 'Rota a pé' : st.nav.m === 'driving' ? 'Rota de carro' : 'Rota de transporte') : '';
    const links = (st.nav ? `<a class="dtd-nav" href="${esc(gmaps(st.nav))}" target="_blank" rel="noopener noreferrer">${navLabel}</a>` : '') + (st.place && hasCard(st.place) ? `<button type="button" class="dtd-card" data-open-place="${st.place}">Ficha</button>` : '') + ((st.leg || st.place) && guideDay(n) && Number.isInteger(i) ? `<button type="button" class="dtd-map" data-rm-focus="${n}:${i}">Ver no mapa</button>` : '');
    return `<li class="dtd-step k-${esc(st.k)}${MOVE.has(st.k) ? ' is-move' : ''}${st.opt ? ' is-optional' : ''}"><div class="dtd-time"><time>${esc(st.t)}</time>${st.end ? `<small>${esc(st.end)}</small>` : ''}</div><div class="dtd-icon" aria-hidden="true">${ICONS[st.k] || ICONS.visit}</div><div class="dtd-body"><p class="dtd-kind">${esc(KIND[st.k] || '')}${dur ? ' · ' + dur : ''}${st.opt ? ' · opcional' : ''}</p><h5>${esc(st.title)}</h5>${st.text ? `<p>${esc(st.text)}</p>` : ''}${links ? `<div class="dtd-links">${links}</div>` : ''}</div></li>`;
  }
  function totals(steps) {
    const t = { walk: 0, transit: 0, app: 0, car: 0, train: 0, coach: 0, flight: 0 };
    for (const s of steps) {
      if (s.opt) continue;
      const lw = s.leg && D.legs?.[s.leg]?.walk;
      if (lw && !['app', 'taxi', 'car'].includes(s.k)) { t.walk += lw.min; continue; }
      if (!s.end) continue;
      const m = s.dur || span(s.t, s.end);
      if (s.k === 'app') { t.app += m; continue; }
      if (s.k === 'walk') t.walk += m; else if (TRANSIT.has(s.k)) t.transit += m; else if (s.k === 'car') t.car += m; else if (s.k === 'train') t.train += m; else if (s.k === 'coach') t.coach += m; else if (s.k === 'flight' && /→/.test(s.title)) t.flight += m;
    }
    return [[t.flight, 'de voo', 'flight'], [t.train, 'de trem', 'train'], [t.coach, 'de ônibus', 'coach'], [t.car, 'de carro', 'car'], [t.app, 'de carro por aplicativo', 'app'], [t.transit, 'em transporte local', 'metro'], [t.walk, 'a pé entre lugares', 'walk']].filter(x => x[0] > 0);
  }
  function summary(n) {
    const sc = S[n];
    const steps = sc.steps, first = steps[0], core = steps.filter(s => !s.opt), last = core[core.length - 1] || steps[steps.length - 1];
    const leave = steps.find(s => MOVE.has(s.k)) || first;
    return { first, last, leave, sleep: sc.sleep };
  }
  function scheduleHTML(n, opts = {}) {
    const sc = S[n]; if (!sc) return '';
    const j = journeyDay(n), sm = summary(n);
    const tot = totals(sc.steps);
    return `<header class="dtd-head"><div><p class="eyebrow">PORTA A PORTA · ${esc(j.date)} · ${esc(j.weekday)}</p><h4>${opts.title ? esc(j.title) : 'Da saída à chegada'}</h4></div><dl class="dtd-facts"><div><dt>Começa</dt><dd>${esc(sm.first.t)}</dd></div><div><dt>Sai de casa</dt><dd>${esc(sm.leave.t)}</dd></div><div><dt>Termina</dt><dd>${esc(sm.last.t)}</dd></div><div class="dtd-sleep"><dt>Dorme em</dt><dd>${esc(sm.sleep)}</dd></div></dl></header>${tot.length ? `<p class="dtd-totals">${tot.map(x => `<span>${ICONS[x[2]]}${human(x[0])} ${x[1]}</span>`).join('')}</p>` : ''}<ol class="dtd-list">${sc.steps.map((st, i) => stepHTML(n, st, i)).join('')}</ol><p class="fine dtd-note">Horários locais, como metas de planejamento. Os links “Rota” abrem cada trecho no Google Maps; “Ficha” mostra preço, horário e endereço.</p>`;
  }
  function renderDaySchedules() {
    for (const art of document.querySelectorAll('article.day[id^="dia-"]')) {
      const n = +art.id.slice(4);
      if (!S[n]) continue;
      let sec = art.querySelector(':scope > .dtd');
      if (!sec) {
        sec = document.createElement('section');
        sec.className = 'dtd'; sec.id = 'cronograma-dia-' + n; sec.dataset.dtdDay = n;
        sec.setAttribute('aria-label', 'Cronograma porta a porta de ' + journeyDay(n).date);
        (art.querySelector(':scope > .day-sheet') || art.querySelector(':scope > .day-quick') || art.querySelector(':scope > .day-heading')).after(sec);
      }
      sec.innerHTML = scheduleHTML(n);
    }
  }
  function renderSchedulePage() {
    const box = $('cronograma-index'); if (!box) return;
    box.innerHTML = `<nav class="dtd-daynav" aria-label="Escolher o dia do cronograma">${DAYS.map(n => `<a href="#/cronograma/${n}" style="--city:${dayColor(n)}"><strong>${n}</strong><small>${esc(SHORT[journeyDay(n).weekday] || '')}</small></a>`).join('')}</nav>` + DAYS.map(n => {
      const j = journeyDay(n), d = guideDay(n);
      return `<article class="dtd-day" id="cronograma-${n}" style="--city:${dayColor(n)}"><div class="dtd-day-head"><div class="day-date"><strong>${n}</strong><span>NOV</span></div><div><p class="eyebrow">${esc(j.weekday)} · ${esc(dayPlace(n))}</p><h3>${esc(j.title)}</h3><p class="fine">${esc(j.status || '')}</p></div>${d ? `<a class="button" href="#/dia/${n}">Abrir o dia</a>` : '<a class="button" href="#/transportes">Chegada e transportes</a>'}</div><section class="dtd" data-dtd-day="${n}">${scheduleHTML(n)}</section></article>`;
    }).join('');
  }
  function previewSchedule(n) {
    const box = $('journey-preview'); if (!box || !S[n]) return;
    box.querySelector('.preview-dtd')?.remove();
    const sc = S[n], sm = summary(n);
    const key = sc.steps.filter(s => !s.opt && ['visit', 'meal', 'show', 'train', 'coach', 'flight', 'night', 'boat', 'photo'].includes(s.k)).slice(0, 5);
    const el = document.createElement('div');
    el.className = 'preview-dtd';
    el.innerHTML = `<p class="eyebrow">PORTA A PORTA</p><ol><li><time>${esc(sm.leave.t)}</time><span>Saída · ${esc(resolveStep(n, sm.leave).title)}</span></li>${key.map(s => `<li><time>${esc(s.t)}</time><span>${esc(resolveStep(n, s).title)}</span></li>`).join('')}<li><time>${esc(sm.last.t)}</time><span>${esc(sm.last.title)} · dorme em ${esc(sm.sleep)}</span></li></ol><a class="text-link" href="${guideDay(n) ? '#cronograma-dia-' + n : '#/cronograma/' + n}">Cronograma completo, ${sc.steps.length} etapas →</a>`;
    const footer = box.querySelector('.preview-footer');
    if (footer) footer.before(el); else box.append(el);
  }

  // ------------------------------------------------------------------ menu de dias
  function renderDaysMenu() {
    const box = $('days-links'); if (!box) return;
    const groups = [['Budapeste', [10, 11, 12]], ['Viena', [13, 14, 15]], ['Alpes', [16]], ['Baviera', [17]], ['Praga', [18, 19]], ['Cracóvia e volta', [20, 21, 22]]];
    box.innerHTML = groups.map(([label, ns]) => `<div class="days-group" style="--city:${dayColor(ns[ns.length > 1 ? 1 : 0])}"><p class="days-group-title">${esc(label)}</p>${ns.map(n => { const j = journeyDay(n); return `<a href="${guideDay(n) ? '#/dia/' + n : '#/cronograma/' + n}" data-day-link="${n}" style="--city:${dayColor(n)}"><b>${n}</b><span><strong>${esc(SHORT[j.weekday] || j.weekday)} · ${esc(dayPlace(n))}</strong><small>${esc(j.title)}</small></span></a>`; }).join('')}</div>`).join('') + `<a class="days-all" href="#/cronograma" data-nav="cronograma">Todos os cronogramas, porta a porta →</a>`;
  }

  // ------------------------------------------------------------------ abertura em mosaico
  // O percurso da abertura, como uma linha de trem: cada estação acende as fotos do seu trecho.
  const ROUTE = [
    { label: 'Coimbra', date: '10/11', href: '#/cronograma/10', days: [10] },
    { label: 'Budapeste', date: '10–13/11', href: '#/bud/roteiro', days: [11, 12] },
    { label: 'Viena', date: '13–16/11', href: '#/vie/roteiro', days: [13, 14, 15] },
    { label: 'Alpes', date: '16/11', href: '#/hall/roteiro', days: [16] },
    { label: 'Baviera', date: '17/11', href: '#/bav/roteiro', days: [17] },
    { label: 'Praga', date: '17–20/11', href: '#/prg/roteiro', days: [18, 19] },
    { label: 'Cracóvia', date: '20–22/11', href: '#/kra/roteiro', days: [20, 21] },
    { label: 'Coimbra', date: '22/11', href: '#/cronograma/22', days: [22] },
  ];
  function renderMontage() {
    const grid = $('montage-grid'); if (!grid) return;
    grid.querySelectorAll('.montage-tile').forEach(x => x.remove());
    grid.insertAdjacentHTML('beforeend', MONTAGE.map(t => {
      const j = journeyDay(t.day);
      return `<a class="montage-tile" data-area="${esc(t.area)}" data-day="${t.day}" href="${esc(t.href || (guideDay(t.day) ? '#/dia/' + t.day : '#/cronograma/' + t.day))}" style="grid-area:${esc(t.area)};--city:${dayColor(t.day)}">${photo(t.photo, t.place + ' · ' + t.line)}<span class="montage-label"><b>${esc(t.dates || t.day + ' NOV · ' + (SHORT[j.weekday] || ''))}</b><strong>${esc(t.place)}</strong><small>${esc(t.line)}</small></span></a>`;
    }).join(''));
    const line = $('route-line'); if (!line) return;
    line.innerHTML = ROUTE.map((r, i) => `<li><a href="${r.href}" data-route="${i}"><strong>${esc(r.label)}</strong><small>${esc(r.date)}</small></a></li>`).join('');
    const light = i => {
      const stop = ROUTE[i];
      grid.classList.toggle('is-tracing', !!stop);
      grid.querySelectorAll('.montage-tile').forEach(tile => tile.classList.toggle('is-lit', !!stop && stop.days.includes(+tile.dataset.day)));
      line.querySelectorAll('a').forEach(a => a.classList.toggle('is-lit', !!stop && +a.dataset.route === i));
    };
    line.addEventListener('pointerover', e => { const a = e.target.closest('[data-route]'); if (a) light(+a.dataset.route); });
    line.addEventListener('focusin', e => { const a = e.target.closest('[data-route]'); if (a) light(+a.dataset.route); });
    line.addEventListener('pointerleave', () => light(-1));
    line.addEventListener('focusout', () => light(-1));
    grid.addEventListener('pointerover', e => {
      const tile = e.target.closest('.montage-tile'); if (!tile) return;
      line.querySelectorAll('a').forEach(a => a.classList.toggle('is-lit', ROUTE[+a.dataset.route].days.includes(+tile.dataset.day)));
    });
    grid.addEventListener('pointerleave', () => line.querySelectorAll('a').forEach(a => a.classList.remove('is-lit')));
  }
  function renderCountdown() {
    const el = $('trip-countdown'); if (!el) return;
    const now = new Date(), start = Date.UTC(2026, 10, 10, 12, 30), end = Date.UTC(2026, 10, 22, 12, 20);
    if (now < start) {
      const [y, mo, da] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number);
      const days = Math.round((Date.UTC(2026, 10, 10) - Date.UTC(y, mo - 1, da)) / 86400000);
      el.innerHTML = days <= 0 ? '<b>É hoje</b> · ônibus em Coimbra 13h00, voo 19h35' : days === 1 ? '<b>É amanhã</b> · de Coimbra a Budapeste' : `<b>Faltam ${days} dias</b> · 10/11, de Coimbra a Budapeste`;
    } else if (now <= end) {
      const day = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', day: 'numeric' }).format(now);
      el.innerHTML = `<b>Hoje · dia ${day - 9} de 13</b> · ${esc(journeyDay(day)?.title || '')}`;
    } else el.innerHTML = '<b>Viagem concluída</b> · boas lembranças!';
  }

  // ------------------------------------------------------------------ mapa macro
  function segCoords(seg) {
    if (seg.path) return seg.path;
    if (seg.ids) return seg.ids.map(id => points.get(id)?.coords).filter(Boolean);
    return arc(seg.from, seg.to);
  }
  function arc(a, b, steps = 56) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy), k = 0.22 * len / (len || 1);
    let px = -dy * k, py = dx * k; if (px < 0) { px = -px; py = -py; }
    const c = [mx + px, my + py], out = [];
    for (let i = 0; i <= steps; i++) { const t = i / steps, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
    return out;
  }
  const STYLE = {
    flight: { weight: 2.4, dashArray: '2 7', opacity: .9 },
    train: { weight: 4, dashArray: '9 6', opacity: .95 },
    car: { weight: 4.6, opacity: .95 },
    bus: { weight: 3, opacity: .9 },
    metro: { weight: 3, opacity: .9 },
    coach: { weight: 4, dashArray: '1 7', lineCap: 'round', opacity: .95 },
    taxi: { weight: 3, opacity: .9 },
    local: { weight: 3, opacity: .85 },
  };
  const LABEL = { flight: 'Avião', train: 'Trem', coach: 'Ônibus', car: 'Carro', bus: 'Ônibus', metro: 'Metrô', taxi: 'Traslado', local: 'Na cidade' };
  const maps = [];
  function createMacroMap(el, opts = {}) {
    if (!el || el.dataset.ready || typeof L === 'undefined') {
      if (el && typeof L === 'undefined') el.innerHTML = '<div class="map-fallback">O mapa interativo precisa de internet. O cronograma de cada dia continua disponível abaixo.</div>';
      return null;
    }
    el.dataset.ready = '1';
    const mobile = L.Browser.mobile;
    const map = L.map(el, { scrollWheelZoom: false, dragging: !mobile, tap: false, zoomSnap: .25, minZoom: 3, worldCopyJump: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18, className: 'macro-tiles' }).addTo(map);
    const byDay = new Map(), central = [], badges = [];
    for (const seg of MACRO.segments) {
      const coords = segCoords(seg); if (coords.length < 2) continue;
      const color = seg.mode === 'flight' ? '#9a6a33' : dayColor(seg.day);
      const halo = L.polyline(coords, { color: '#fff', weight: (STYLE[seg.mode]?.weight || 3) + 3.5, opacity: seg.mode === 'flight' ? 0 : .75, interactive: false }).addTo(map);
      const line = L.polyline(coords, Object.assign({ color }, STYLE[seg.mode] || STYLE.local)).addTo(map);
      line.bindTooltip(`<b>${seg.day}/11</b> · ${esc(seg.label)}${seg.detail ? '<br>' + esc(seg.detail) : ''}`, { sticky: true, className: 'macro-tooltip' });
      line.on('click', () => window.FieldGuide?.selectDay(seg.day, false, 'map'));
      if (!byDay.has(seg.day)) byDay.set(seg.day, []);
      byDay.get(seg.day).push({ line, halo, seg, base: Object.assign({ color }, STYLE[seg.mode] || STYLE.local) });
      if (seg.mode !== 'flight' && seg.frame !== false) central.push(...coords);
      if (['train', 'coach', 'car', 'flight'].includes(seg.mode)) {
        const mid = coords[Math.floor(coords.length * (seg.mode === 'car' && seg.day === 16 ? .33 : .5))];
        const badge = L.marker(mid, { icon: L.divIcon({ html: `<span class="macro-badge" style="--c:${dayColor(seg.day)}">${seg.day}</span>`, className: 'macro-badge-wrap', iconSize: [30, 30], iconAnchor: [15, 15] }), keyboard: false, zIndexOffset: 400 }).addTo(map);
        badge.on('click', () => window.FieldGuide?.selectDay(seg.day, false, 'map'));
        badges.push(badge);
      }
    }
    for (const st of MACRO.stays) {
      const pos = st.coords || points.get(st.point)?.coords; if (!pos) continue;
      const first = st.day || DAYS.find(n => journeyDay(n)?.city === st.city && guideDay(n)) || null;
      const m = L.marker(pos, { icon: L.divIcon({ html: `<span class="macro-stay${st.city ? '' : ' is-home'}" style="--c:${st.color || city(st.city).color || '#155b69'}"><i></i><span><b>${esc(st.label)}</b><small>${esc(st.nights)}</small></span></span>`, className: 'macro-stay-wrap', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 600 }).addTo(map);
      m.bindTooltip(`<b>${esc(st.label)}</b> · ${esc(st.nights)}`, { direction: 'top', className: 'macro-tooltip' });
      if (first) m.on('click', () => window.FieldGuide?.selectDay(first, false, 'map'));
    }
    const stopTips = [];
    for (const sp of MACRO.stops) {
      const p = points.get(sp.point) || D.dining.find(x => x.id === sp.point); if (!p) continue;
      const m = L.circleMarker(p.coords, { radius: 4.5, color: '#fff', weight: 2, fillColor: dayColor(sp.day), fillOpacity: 1 }).addTo(map);
      m.bindTooltip(esc(sp.label), { permanent: true, direction: 'right', offset: [6, 0], className: 'macro-stop-tip day-' + sp.day });
      m.on('click', () => window.FieldGuide?.selectDay(sp.day, false, 'map'));
      stopTips.push(m);
    }
    const centralBounds = L.latLngBounds(central);
    const fitAll = () => map.fitBounds(centralBounds, { padding: [22, 22] });
    fitAll();
    let selected = null;
    function highlight(n, zoom) {
      selected = n;
      el.dataset.day = n || '';
      for (const [day, items] of byDay) {
        const on = n === null || day === +n;
        for (const it of items) {
          it.line.setStyle({ opacity: on ? 1 : .16, weight: (it.base.weight || 3) + (n !== null && on ? 1.6 : 0) });
          it.halo.setStyle({ opacity: on && it.seg.mode !== 'flight' ? .8 : 0 });
          if (n !== null && on) it.line.bringToFront();
        }
      }
      const cap = el.parentElement?.querySelector('.macro-caption');
      if (cap) cap.innerHTML = n === null ? '' : captionHTML(+n);
      el.parentElement?.classList.toggle('has-selection', n !== null);
      if (zoom && n !== null && byDay.has(+n)) {
        const pts = byDay.get(+n).flatMap(it => it.line.getLatLngs());
        // A legenda do dia ocupa o canto inferior esquerdo: o trajeto fica acima dela.
        const below = cap && cap.offsetParent ? cap.offsetHeight + 24 : 36;
        map.flyToBounds(L.latLngBounds(pts), { paddingTopLeft: [36, 36], paddingBottomRight: [36, below], maxZoom: 13, duration: .6 });
      }
    }
    function reset() { highlight(null); fitAll(); }
    const api = { map, highlight, reset, fitAll, el, get selected() { return selected; } };
    maps.push(api);
    setTimeout(() => map.invalidateSize(), 60);
    return api;
  }
  function captionHTML(n) {
    const j = journeyDay(n), segs = MACRO.segments.filter(s => s.day === n), d = guideDay(n), sc = S[n];
    const travel = segs.filter(s => s.mode !== 'local').map(s => s.label + (s.detail ? ' · ' + s.detail : ''));
    return `<p class="eyebrow" style="color:${dayColor(n)}">${n} NOV · ${esc(j.weekday)}</p><strong>${esc(j.title)}</strong>${travel.length ? `<small>${travel.map(esc).join('<br>')}</small>` : ''}${sc ? `<small>Dorme em ${esc(sc.sleep)}</small>` : ''}<span class="macro-caption-links">${d ? `<a href="#/dia/${n}">Abrir o dia</a>` : ''}<a href="${d ? '#cronograma-dia-' + n : '#/cronograma/' + n}">Porta a porta</a></span>`;
  }
  function legendHTML() {
    return ['car', 'train', 'coach', 'flight', 'local'].map(m => `<span class="legend-${m}"><i></i>${LABEL[m]}</span>`).join('') + '<span class="legend-stay"><i></i>Onde dormimos</span>';
  }
  let homeMap = null;
  function initHomeMap() {
    const el = $('macro-map'); if (!el || homeMap) return;
    homeMap = createMacroMap(el);
  }
  function overviewMap(id) {
    const el = $(id); if (!el || el.dataset.ready) { maps.forEach(m => m.el.id === id && m.map.invalidateSize()); return; }
    el.classList.add('macro-map');
    const wrap = el.parentElement;
    if (wrap && !wrap.querySelector('.macro-legend')) el.insertAdjacentHTML('afterend', `<div class="macro-legend">${legendHTML()}</div>`);
    createMacroMap(el);
  }

  // ------------------------------------------------------------------ fotografias: substituição pelo Commons
  const FILE = /commons\.wikimedia\.org\/wiki\/File:(.+)$/;
  function commonsVariant(m) {
    const f = FILE.exec(m.source || ''); if (!f) return null;
    const name = decodeURIComponent(f[1]).replace(/ /g, '_');
    const at = w => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=' + w;
    return { src: at(1920), largeSrc: at(1920), largeWidth: 1920, mediumSrc: at(960), mediumWidth: 960, smallSrc: at(500), smallWidth: 500, width: m.width || 1920, height: m.height || 1280, remote: true };
  }
  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const slot = img.closest('.photo-slot'); if (!slot) return;
    const m = D.media[slot.dataset.photo];
    if (m && slot.dataset.fallback !== 'commons') {
      if (!m.remote) { const alt = commonsVariant(m); if (alt) Object.assign(m, alt); }
      if (m.remote && img.getAttribute('src') !== m.src) {
        slot.dataset.fallback = 'commons';
        img.removeAttribute('srcset');
        img.src = m.src;
        return;
      }
    }
    slot.classList.add('photo-missing');
    slot.dataset.missingLabel = slot.dataset.photoAlt || '';
  }, true);

  // ------------------------------------------------------------------ ligações com o resto do guia
  window.addEventListener('guide:day', e => {
    const { n, source } = e.detail || {};
    previewSchedule(n);
    if (source === 'user' || source === 'map') maps.forEach(m => m.highlight(n, true));
  });
  document.addEventListener('change', e => {
    const input = e.target.closest?.('[data-meal-pick]'); if (!input) return;
    const n = +input.dataset.mealPick;
    document.querySelectorAll(`.dtd[data-dtd-day="${n}"]`).forEach(sec => { sec.innerHTML = scheduleHTML(n); });
    if (window.FieldGuide?.selectedDay() === n) previewSchedule(n);
  });
  document.addEventListener('click', e => {
    const reset = e.target.closest('[data-macro-reset]');
    if (reset) { maps.forEach(m => m.reset()); return; }
  });
  window.addEventListener('hashchange', () => setTimeout(() => {
    maps.forEach(m => { if (m.el.offsetParent) m.map.invalidateSize(); });
    const h = location.hash.match(/^#\/cronograma\/(\d+)/);
    if (h) $('cronograma-' + h[1])?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, 30));

  // ------------------------------------------------------------------ início
  renderMontage();
  renderCountdown();
  renderDaysMenu();
  renderDaySchedules();
  renderSchedulePage();
  const legend = $('macro-legend'); if (legend) legend.innerHTML = legendHTML();
  if ('IntersectionObserver' in window && $('macro-map')) {
    const io = new IntersectionObserver(entries => { if (entries.some(x => x.isIntersecting)) { initHomeMap(); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe($('macro-map'));
  } else initHomeMap();
  const roadPath = n => MACRO.segments.find(x => x.day === +n && x.mode === 'car')?.path || null;
  window.GuideJourney = { scheduleHTML, overviewMap, initHomeMap, roadPath, resolveStep, icons: ICONS, kinds: KIND, highlight: n => maps.forEach(m => m.highlight(n, true)), maps };
})();
