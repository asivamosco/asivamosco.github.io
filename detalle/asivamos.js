/* Así Vamos · motor compartido (carrusel, pestañas, listas, Top, Destacados, gráficas).
   Cada indicador solo aporta una configuración: AV.init({...}). Ver inflacion.html y desempleo.html. */
(function () {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = (n, d = 2) => n == null ? '—' : Number(n).toLocaleString('es-CO', {minimumFractionDigits: d, maximumFractionDigits: d});
const sg = (n, d = 2) => n == null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);
// Subir es lo malo (gris, 'up') y bajar lo bueno (ámbar, 'dn'); los colores se definen en :root
const cls = n => n == null || Math.abs(n) < 0.005 ? '' : n > 0 ? 'up' : 'dn';
const flecha = n => n == null || Math.abs(n) < 0.005 ? '■' : n > 0 ? '▲' : '▼';
const nm = s => String(s ?? '').replace(/\b(Y|De|Del|La|El|Los|Las|Para|Por|En|Con|A|O)\b/g, (m, _, o) => o ? m.toLowerCase() : m);
const vp = (l, v, t) => `<div><span class="mute">${l}</span><b class="${cls(v)}">${flecha(v)} ${t}</b></div>`;
const MOV = matchMedia('(max-width:600px)');
let renderCb = null;

// Celular: el select va invisible sobre un título que muestra completo el valor elegido
function selTitle() {
  const sl = document.getElementById('selLista'), t = document.getElementById('selT');
  if (sl && t) t.textContent = sl.selectedOptions[0] ? sl.selectedOptions[0].textContent : '';
}
document.addEventListener('change', e => { if (e.target.id === 'selLista') selTitle(); });

// Carrusel de fichas (celular): flechas con el título de la ficha anterior y la próxima, más puntos
const dosPaso = d => d.firstElementChild.offsetWidth + 12;
const carFichas = c => [...c.children].filter(x => getComputedStyle(x).display !== 'none');
function carNav(forzar) {
  const c = $('.car'), n = $('#cnav'); if (!c || !n) return;
  const f = carFichas(c), i = Math.max(0, Math.min(f.length - 1, Math.round(c.scrollLeft / dosPaso(c))));
  const clave = f.map(x => x.dataset.lbl).join('|') + '#' + i;
  if (!forzar && n.dataset.k === clave) return;
  n.dataset.k = clave;
  const a = f[i - 1], b = f[i + 1];
  n.innerHTML = `<button type="button" data-cdir="-1"${a ? '' : ' disabled'} aria-label="Anterior">${a ? '‹ ' + esc(a.dataset.lbl) : ''}</button>
    <span class="cd" aria-hidden="true">${f.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
    <button type="button" data-cdir="1"${b ? '' : ' disabled'} aria-label="Siguiente">${b ? esc(b.dataset.lbl) + ' ›' : ''}</button>`;
}
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('car')) carNav(); }, true);
document.addEventListener('click', e => {
  const b = e.target.closest('.cnav button'); if (!b || b.disabled) return;
  const c = $('.car'); if (!c) return;
  const f = carFichas(c), i = Math.round(c.scrollLeft / dosPaso(c)), j = Math.max(0, Math.min(f.length - 1, i + Number(b.dataset.cdir)));
  c.scrollTo({left: j * dosPaso(c), behavior: 'smooth'});
});
MOV.addEventListener('change', () => { if (renderCb) renderCb(); });

function init(cfg) {
  const IND = new URLSearchParams(location.search).get('ind') || cfg.ind, URL_JSON = `data/detalle_${IND}.json`;
  const dims = cfg.dims, G = cfg.g, K = Object.keys(dims);
  const esNac = cfg.esNac || (() => false), esVarMes = cfg.esVarMes || (() => false);
  let D, st = {vista: 'gen', g: null, sel: {}, htab: 'ent'};
  const items = v => ((D.dimensiones || {})[dims[v].k] || {}).items || [];
  const ord = v => [...items(v)].sort(dims[v].ord);
  const cur = () => st.vista === 'gen' ? st.g : st.sel[st.vista];
  const entSerie = (v, d) => ({nombre: dims[v].nom(d), datos: dims[v].serie(d), tipo: v, d});
  const hallaz = () => (D.hallazgos || []).filter(x => !esNac(x) && !esVarMes(x));
  const hayTop = v => items(v).length && dims[v].top;
  // cfg.graf(d, mm, ctx) es opcional: ctx 'nac' (fichas de Nacional) o 'ent' (elemento elegido). Si no devuelve nada, se usa la gráfica estándar.
  const graf = (d, mm, ctx) => (cfg.graf && cfg.graf(d, mm, ctx)) || grafica(d, mm, ctx);
  // Formatos opcionales de G: dec (número o (serie, ctx) => número), unit (texto o (ctx, D) => texto), vd (decimales de las variaciones), nulo (texto cuando no hay variación)
  const dcv = (d, ctx) => typeof G.dec === 'function' ? G.dec(d, ctx) : G.dec;
  const ucv = ctx => typeof G.unit === 'function' ? G.unit(ctx, D) : G.unit;
  // Títulos opcionales de las fichas: cfg.tit = {c12, cmm, ent}, texto o D => texto
  const tit = (k, def) => { const v = cfg.tit && cfg.tit[k]; return esc(typeof v === 'function' ? v(D) : v || def); };
  const med = c => typeof c.medida === 'function' ? c.medida(D) : c.medida;
  const subx = (c, x) => { const t = c.sub && c.sub(x); return t ? `<small class="mute">${esc(t)}</small>` : ''; };
  renderCb = () => { if (D) render(); };

  fetch(URL_JSON, {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => {
      D = d; st.g = {nombre: cfg.nacTitle, datos: D.serie.doce_meses, nac: true, tipo: 'nac'};
      K.forEach(v => { const p = ord(v)[0]; st.sel[v] = p ? entSerie(v, p) : null; });
      // Si el JSON no trae una dimensión (o no hay destacados), se oculta su pestaña del header
      document.querySelectorAll('[data-vista]').forEach(b => {
        const v = b.dataset.vista;
        if ((dims[v] && !items(v).length) || (v === 'dest' && !hallaz().length)) b.style.display = 'none';
      });
      render();
    })
    .catch(() => { $('#app').innerHTML = `<div class="card err">No se pudo cargar <b>${esc(URL_JSON)}</b>.<br><span class="mute">Publícalo en la carpeta data/ junto a esta página (si abres el HTML desde el disco, el navegador bloquea la lectura: usa un servidor local).</span></div>`; });

  function titulo() {
    const p = D.periodo || {}, norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const busca = t => (norm(t).match(/\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\b/) || [])[1];
    const m = busca(p.mes_nombre) || busca(p.etiqueta), t = $('#hdTitle');
    t.textContent = m ? `${cfg.title} - ${m[0].toUpperCase()}${m.slice(1)}` : cfg.title;
    const dlt = cfg.deltaMes(D);
    if (dlt != null && Math.abs(dlt) >= 0.005) {
      const ar = document.createElement('span');
      ar.className = 'ar ' + (dlt > 0 ? 'up' : 'dn'); ar.textContent = dlt > 0 ? '▲' : '▼';
      ar.setAttribute('aria-label', dlt > 0 ? 'subió frente al mes anterior' : 'bajó frente al mes anterior');
      t.appendChild(ar);
    }
  }

  function render() {
    document.title = `${cfg.docTitle} · Así Vamos`; titulo();
    const v = st.vista;
    document.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-pressed', b.dataset.vista === v));
    if (v === 'gen') {
      // Carrusel: Indicador → Últimos 12 meses → Mismo mes por año → Top de cada dimensión
      const tops = K.filter(hayTop).map(k => `
        <section class="card ctop" data-lbl="Top ${dims[k].plural.toLowerCase()}" aria-label="Top ${dims[k].plural.toLowerCase()}"><h2 class="ctt">Top · ${dims[k].plural}</h2>${topHtml(k)}</section>`).join('');
      $('#app').innerHTML = `
      <div class="top g" id="top">
        <div class="cnav" id="cnav"></div>
        <div class="carw"><div class="car">
          <section class="card hero" id="hero" aria-label="Indicador"></section>
          <section class="card cg cs1" data-lbl="Últimos 12 meses" aria-label="Últimos 12 meses"><h3 class="cgt">${tit('c12', 'Últimos 12 meses')}</h3><div class="gch" id="c12"></div></section>
          <section class="card cg cs2" data-lbl="Mismo mes por año" aria-label="Mismo mes por año"><h3 class="cgt">${tit('cmm', 'Mismo mes por año')}</h3><div class="gch" id="cmm"></div></section>${tops}
        </div></div>
      </div>`;
    } else if (v === 'dest') {
      $('#app').innerHTML = `<section class="card cdest" aria-label="Destacados"><h2>Destacados</h2>${hallazgosHtml()}</section>`;
    } else if (dims[v]) {
      const c = dims[v];
      $('#app').innerHTML = `
      <div class="top" id="top">
        <section class="card cl" aria-label="${c.titulo}">
          <div class="head"><h2>${c.titulo}</h2><small class="mute">${med(c)}</small></div>
          <div class="clfoot"><small class="mute clm">${med(c)}</small><p class="ref">${c.ref(D)}</p></div>
          <div class="selW"><span class="selT" id="selT"></span><select class="selL" id="selLista" aria-label="Elegir"></select></div>
          <div class="list" id="lista"></div>
        </section>
        <div class="cnav" id="cnav"></div>
        <div class="carw"><div class="car">
          <section class="card hero" id="hero" aria-label="Indicador"></section>${c.hijos ? `
          <section class="card hero gr cacts" id="heroHijos" data-lbl="${esc(c.hijos.label)}" aria-label="${esc(c.hijos.label)}"></section>` : ''}
          <section class="card cg" data-lbl="Últimos 12 meses" aria-label="Serie">
            <div class="head"><h2 id="serieT"></h2></div>
            <div id="chart"></div>
          </section>
        </div></div>
      </div>`;
      lista();
    } else if (cfg.custom && cfg.custom[v]) { cfg.custom[v](D); carNav(true); }
    if (v === 'gen' || dims[v]) { hero(); serie(); }
  }

  function hero() {
    const s = cur(), per = D.periodo, c = dims[s.tipo], enE = !!c, h = enE ? c.hero(s.d, D) : cfg.nac(D);
    const src = h.src || `${per.etiqueta} · Fuente: ${D.fuente}`;
    let prev = '';
    if (!enE && cfg.prevTitle) {
      const ant = (s.datos || []).slice(-5, -1).reverse().filter(p => p.valor != null);
      if (ant.length) prev = `<div class="prev"><span class="th">${cfg.prevTitle}</span>${ant.map(p => `<div class="pr"><span>${esc(p.mes)}${p.anio !== per.anio ? ' ' + p.anio : ''}</span><b>${fmt(p.valor, dcv([p], 'nac'))}${ucv('nac')}</b><small class="${cls(p[G.vf])}">${p[G.vf] == null ? '—' : flecha(p[G.vf]) + ' ' + sg(p[G.vf], G.vd) + G.vs}</small></div>`).join('')}</div>`;
    }
    const hj = enE && c.hijos;
    if (MOV.matches && st.htab === 'hijos') st.htab = 'ent';   // en celular los hijos son una ficha del carrusel
    const gr = !!hj && st.htab === 'hijos', nH = hj ? c.hijos.get(s.d).length : 0;
    $('#hero').className = 'card hero' + (hj ? ' wt' + (gr ? ' gr' : '') : '');
    const tabsH = hj ? `<div class="tabs htabs" role="group" aria-label="Contenido del panel">
      <button data-htab="ent" aria-pressed="${!gr}">${c.una}</button>
      <button data-htab="hijos" aria-pressed="${gr}">${c.hijos.label}${nH ? ` (${nH})` : ''}</button></div>` : '';
    const cuerpo = gr ? hijosHtml(s.d, c) : `<div class="big${h.bigCls ? ' ' + h.bigCls : ''}">${h.big}${h.unit ? `<span>${h.unit}</span>` : ''}</div>
      <div class="vars">${h.filas}</div>${prev}
      <small class="mute src">${h.com ? esc(h.com) + '<br>' : ''}${h.extra ? h.extra + '<br>' : ''}${esc(src)}${cfg.nota ? '<br>' + cfg.nota : ''}</small>`;
    $('#hero').innerHTML = `${enE ? `<div class="kick kv"><span class="kk">${esc(c.kick)}</span><span class="kc">${esc(h.ttl)}</span></div>` : ''}${tabsH}
      <div class="ttl">${esc(h.ttl)}</div>${cuerpo}`;
    $('#hero').dataset.lbl = enE ? c.una : 'Total';
    const hh = $('#heroHijos');
    if (hh && hj) hh.innerHTML = `<div class="ttl">${c.hijos.label}${nH ? ` (${nH})` : ''}</div>${hijosHtml(s.d, c)}`;
    carNav(true);
  }

  function hijosHtml(d, c) {
    const hs = c.hijos.get(d);
    if (!hs.length) return `<div class="gwrap"><p class="vacio">Sin detalle de ${c.hijos.label.toLowerCase()}.</p></div>`;
    return `<div class="gwrap"><div class="glist" tabindex="0" aria-label="${esc(c.hijos.label)}">${hs.map((h, i) => `
      <div class="tr g">
        <span class="rk">${c.hijos.rank === false ? '•' : i + 1}</span>
        <span class="nm"><span class="wrap">${esc(h.nombre)}</span><span class="bar"><b class="${cls(h.bar !== undefined ? h.bar : h.delta)}" style="width:${h.w}%"></b></span></span>
        <span class="vl"><strong class="${cls(h.val)}">${h.valTxt}</strong><small class="${cls(h.delta)}">${h.sub || ''}</small></span></div>`).join('')}</div>
      <p class="ref">${typeof c.hijos.nota === 'function' ? c.hijos.nota(d, D) : c.hijos.nota}</p></div>`;
  }

  function marcar() {
    const v = st.vista, its = items(v), sel = st.sel[v].d, sl = $('#selLista');
    document.querySelectorAll('#lista [data-e]').forEach(x => x.setAttribute('aria-pressed', its[x.dataset.e] === sel));
    if (sl) sl.value = its.indexOf(sel); selTitle();
  }

  function lista() {
    const v = st.vista, c = dims[v], todas = items(v), its = ord(v), sel = st.sel[v].d;
    const ts = its.map(x => c.val(x) || 0), mx = Math.max(...ts), mn = Math.min(...ts), l = $('#lista');
    l.innerHTML = its.map((x, i) => {
      const a = .08 + .52 * ((c.val(x) || 0) - mn) / ((mx - mn) || 1), vr = c.vr(x);
      return `<button class="row" style="--a:${a.toFixed(2)}" data-e="${todas.indexOf(x)}" data-v="${v}" title="${esc(c.nom(x))}" aria-pressed="${sel === x}">
        <span class="rk">${i + 1}</span>
        <span class="nm"><span>${esc(c.nom(x))}</span>${subx(c, x)}</span>
        <span class="vl"><strong>${c.valTxt(x)}</strong><small class="${cls(vr)}">${vr == null ? (G.nulo || '') : sg(vr, G.vd) + G.vs}</small></span></button>`;
    }).join('');
    const r = l.querySelector('[aria-pressed=true]');
    if (r) l.scrollTop = Math.max(0, r.offsetTop - l.offsetTop - (l.clientHeight - r.offsetHeight) / 2);
    const sl = $('#selLista');
    sl.setAttribute('aria-label', 'Elegir ' + c.una.toLowerCase());
    sl.innerHTML = its.map(x => `<option value="${todas.indexOf(x)}"${sel === x ? ' selected' : ''}>${esc(c.opt ? c.opt(x, D) : `${c.valTxt(x)} · ${c.nom(x)}`)}</option>`).join(''); selTitle();
  }

  // Top: todos los elementos que aumentaron / redujeron frente a hace un año, de mayor a menor cambio
  function topHtml(v) {
    const c = dims[v], todas = items(v), its = todas.filter(x => c.vr(x) != null), mx = Math.max(...its.map(x => Math.abs(c.vr(x))), 0.01);
    const bloque = k => {
      const arr = (k === 'up' ? its.filter(x => c.vr(x) > 0).sort((a, b) => c.vr(b) - c.vr(a)) : its.filter(x => c.vr(x) < 0).sort((a, b) => c.vr(a) - c.vr(b)));
      const tt = c.topTxt || {}, verbo = k === 'up' ? tt.up || 'aumentaron' : tt.dn || 'redujeron', verbo1 = k === 'up' ? tt.upS || 'aumentó' : tt.dnS || 'redujo';
      const vacio = `${c.ning} ${verbo1} frente a hace un año.`;
      return `<div class="t5"><h2 class="${k}">${c.plural} que ${verbo} <small>(${arr.length})</small></h2>${arr.length ? `<div class="glist" tabindex="0">${arr.map((x, i) => `
        <button class="tr" data-e="${todas.indexOf(x)}" data-v="${v}" title="${esc(c.nom(x))}" aria-pressed="false">
          <span class="rk">${i + 1}</span>
          <span class="nm"><span>${esc(c.nom(x))}</span>${subx(c, x)}<span class="bar"><b class="${k}" style="width:${100 * Math.abs(c.vr(x)) / mx}%"></b></span></span>
          <span class="vl"><strong class="${k}">${flecha(c.vr(x))} ${sg(c.vr(x), G.vd)}${G.vs}</strong><small class="${k}">${c.topSub(x, D)}</small></span></button>`).join('')}</div>` : `<p class="vacio">${vacio}</p>`}</div>`;
    };
    // c.nuevos = {txt: (x, D) => texto}: los elementos sin variación posible (sin registro hace un año) van aparte, en un desplegable
    const sin = c.nuevos ? todas.filter(x => c.vr(x) == null).sort((a, b) => c.val(b) - c.val(a)) : [];
    const nuevos = sin.length ? `<details class="nuevos"><summary>${sin.length} ${(sin.length === 1 ? c.una : c.plural).toLowerCase()} sin registro hace un año</summary><div class="glist" tabindex="0">${sin.map(x => `
        <button class="tr" data-e="${todas.indexOf(x)}" data-v="${v}" title="${esc(c.nom(x))}" aria-pressed="false">
          <span class="rk">•</span>
          <span class="nm"><span>${esc(c.nom(x))}</span>${subx(c, x)}</span>
          <span class="vl"><strong>${esc(c.nuevos.txt ? c.nuevos.txt(x, D) : c.valTxt(x))}</strong></span></button>`).join('')}</div></details>` : '';
    return `<div class="gwrap"><div class="tres">${bloque('up')}${bloque('dn')}</div>${nuevos}
      <p class="ref">${c.topRef || `Cambio frente a hace un año${G.vs.trim() === 'pp' ? ' en puntos porcentuales (pp)' : ''}. Toca un elemento para ver su detalle.`}</p></div>`;
  }

  function serie() {
    const s = cur();
    if (st.vista === 'gen') { $('#c12').innerHTML = graf(s.datos || [], false, 'nac'); $('#cmm').innerHTML = graf(D.serie.mismo_mes || [], true, 'nac'); return; }
    $('#serieT').innerHTML = `<span class="serTx">${tit('ent', 'Últimos 12 meses')}</span>`;
    $('#chart').innerHTML = graf(s.datos || [], false, 'ent');
  }

  function hallazgosHtml() {
    return `<div class="hz">${hallaz().map(x => `
      <div class="card ${/_(alt[ao]|sube)$/.test(x.tipo) ? 'sube' : /_baj[ao]$/.test(x.tipo) ? 'baja' : ''}">
        <h3>${esc(x.titulo)}</h3><p>${esc(nm(x.texto))}</p></div>`).join('')}</div>`;
  }

  function grafica(d, mm, ctx) {
    if (d.length < 2) return '<p class="mute">Sin datos suficientes.</p>';
    const dec = dcv(d, ctx), un = ucv(ctx);
    // Mismo mes por año: la variación frente al año anterior se calcula (diferencia entre años consecutivos) si el JSON no la trae
    d = d.map((p, i) => ({...p, _v: !mm ? p[G.vf] : p[G.vf] != null ? p[G.vf] : (G.calcMM && i ? +(p.valor - d[i - 1].valor).toFixed(4) : null)}));
    const vmm = mm && d.some(p => p._v != null), yoy = !mm && d.some(p => p._v != null);
    const W = 520, H = MOV.matches ? 190 : 250, L = vmm ? 40 : 24, R = vmm ? 40 : 24, T = 30, B = vmm ? 58 : 34, paso = d.length > 13 ? Math.ceil(d.length / 8) : 1;
    const vs = d.map(p => p.valor), mn = Math.min(...vs), mx = Math.max(...vs), pad = (mx - mn || 1) * .25;
    const x = i => L + i * (W - L - R) / (d.length - 1), y = v => T + (H - T - B) * (1 - (v - (mn - pad)) / (mx - mn + 2 * pad));
    const col = n => n > 0.004 ? 'var(--up-l)' : n < -0.004 ? 'var(--dn-l)' : 'var(--ink)';
    const colT = n => n > 0.004 ? 'var(--up-t)' : n < -0.004 ? 'var(--dn-t)' : 'var(--ink)';
    let seg = '', pts = '', lab = '';
    d.forEach((p, i) => {
      if (i) seg += `<line x1="${x(i - 1)}" y1="${y(d[i - 1].valor)}" x2="${x(i)}" y2="${y(p.valor)}" stroke="${yoy ? '#aebfc8' : p.valor > d[i - 1].valor ? 'var(--up-l)' : 'var(--dn-l)'}" stroke-width="${yoy ? 3 : 3.5}" stroke-linecap="round"/>`;
      const ult = i === d.length - 1, cp = (yoy || vmm) && p._v != null ? col(p._v) : null;
      const tip = yoy && p.valor_hace_12 != null ? `<title>${esc(p.mes)} ${p.anio}: ${fmt(p.valor, dec)}${un} · hace un año: ${fmt(p.valor_hace_12, dec)}${un} (${sg(p._v, G.vd)}${G.vs})</title>`
        : vmm && p._v != null ? `<title>${p.anio}: ${fmt(p.valor, dec)}${un} (${sg(p._v, G.vd)}${G.vs} vs. el año anterior)</title>` : '';
      pts += `<circle cx="${x(i)}" cy="${y(p.valor)}" r="${ult ? 7 : 4.5}" fill="${ult ? '#fff' : cp || 'var(--ink)'}" stroke="${ult ? cp || 'var(--acc)' : 'none'}" stroke-width="3.5">${tip}</circle>`;
      if (mm || i === 0 || ult || p.valor === mx || p.valor === mn)
        lab += `<text class="v" x="${x(i)}" y="${y(p.valor) - 12}" text-anchor="${i === 0 ? 'start' : ult ? 'end' : 'middle'}">${fmt(p.valor, dec)}</text>`;
      if ((d.length - 1 - i) % paso === 0) lab += `<text x="${x(i)}" y="${vmm ? H - 30 : H - 8}" text-anchor="middle">${mm ? p.anio : esc(p.mes)}</text>`;
      if (vmm && p._v != null) lab += `<text class="v" x="${x(i)}" y="${H - 9}" text-anchor="middle" style="fill:${colT(p._v)};font-size:15px">${sg(p._v, 1)}${G.vs}</text>`;
    });
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Serie de ${mm ? 'años' : 'meses'}">${seg}${pts}${lab}</svg>`;
    const nota = t => `<p class="ref" style="margin:2px 0 0;font-size:13px">${t}</p>`;
    if (vmm) return `<div class="gf">${svg}${nota(G.mmNota || 'Cifra sobre cada punto: valor del mes · debajo del año: cambio frente al año anterior' + (G.calcMM ? ' (calculado)' : ''))}</div>`;
    return yoy ? `<div class="gf">${svg}${nota('<span class="up">●</span> por encima del mismo mes del año anterior &nbsp; <span class="dn">●</span> por debajo')}</div>` : svg;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !D) return;
    if (b.dataset.vista) { if (b.dataset.vista === st.vista) return; st.vista = b.dataset.vista; st.htab = 'ent'; render(); $('#app').scrollTo({top: 0}); return; }
    if (b.dataset.htab) { st.htab = b.dataset.htab; hero(); const c = $('.car'); if (c) c.scrollTo({left: 0, behavior: 'smooth'}); return; }
    if (b.dataset.e != null) {
      const v = b.dataset.v || st.vista;   // desde los Top de Nacional se abre el detalle en la pestaña de esa dimensión
      st.sel[v] = entSerie(v, items(v)[b.dataset.e]); st.htab = 'ent';
      if (st.vista !== v) { st.vista = v; render(); $('#app').scrollTo({top: 0}); return; }
    } else return;
    marcar(); hero(); serie();
  });
  document.addEventListener('change', e => {
    if (!D || e.target.id !== 'selLista' || !dims[st.vista]) return;
    const v = st.vista; st.sel[v] = entSerie(v, items(v)[e.target.value]); st.htab = 'ent';
    marcar(); hero(); serie();
  });
}
window.AV = {init, esc, fmt, sg, cls, flecha, nm, vp, carNav};
})();
