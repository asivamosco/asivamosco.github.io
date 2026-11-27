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
  let D, st = {vista: cfg.vista0 || 'gen', g: null, sel: {}, htab: 'ent'};   // cfg.vista0 (opcional): vista inicial, p. ej. 'comp' cuando no hay Total
  const items = v => ((D.dimensiones || {})[dims[v].k] || {}).items || [];
  const ord = v => [...items(v)].sort(dims[v].ord);
  const cur = () => st.vista === 'gen' ? st.g : st.sel[st.vista];
  // cfg.aniosMov (opcional) = lista de dimensiones (p. ej. ['dep']) cuya gráfica usa 4 años móviles de 12 meses (item.serie_anios) en lugar de los últimos 12 meses
  const am = k => Array.isArray(cfg.aniosMov) && cfg.aniosMov.includes(k);
  // cfg.pmov (opcional) = ventana que se compara año a año en esa gráfica: {meses: 3, card: 'Trimestre móvil', ant: 'mismo trimestre del año anterior'}. Por defecto: año móvil de 12 meses
  const PM = {meses: 12, card: 'Años móviles', ant: 'año móvil anterior', ...(cfg.pmov || {})};
  // G.por[dim].barras (opcional): la gráfica de años móviles se dibuja como barras verticales, una por año móvil, con el rango (p. ej. "Nov 25–Oct 26") en el eje X.
  // Usa item.serie_anios = [{rango: 'Nov 21–Oct 22', valor, var_anual_pct}, ...]. barras: 'suma' (solo si el valor del año es la suma de los 12 meses, p. ej. conteos): si el JSON no la trae, se deriva
  // de serie_12m (año móvil actual y el anterior, con valor_hace_12). Con barras: true no se deriva nada (p. ej. % del índice, que no se suma): sin serie_anios queda la línea de los últimos 12 meses
  const sumaDe = k => !!(G.por && G.por[k] && G.por[k].barras === 'suma');
  const barrasDe = k => !!(G.por && G.por[k] && G.por[k].barras);
  const aniosDerivados = d => {
    const s = (d.serie_12m || []).slice(-PM.meses);   // los últimos PM.meses meses (12 = año móvil; 3 = trimestre móvil)
    if (s.length < PM.meses || s.some(p => p.valor == null || p.valor_hace_12 == null)) return null;
    const a = s[0], b = s[s.length - 1], yy = n => String(n).slice(-2),
      ra = k => a.anio === b.anio ? `${a.mes}–${b.mes} ${yy(b.anio - k)}` : `${a.mes} ${yy(a.anio - k)}–${b.mes} ${yy(b.anio - k)}`;
    const cur = s.reduce((t, p) => t + p.valor, 0), prev = s.reduce((t, p) => t + p.valor_hace_12, 0);
    return [{mes: ra(1), rango: ra(1), anio: b.anio - 1, valor: prev, valor_hace_12: null, var_anual_pct: null},
      {mes: ra(0), rango: ra(0), anio: b.anio, valor: cur, valor_hace_12: prev, var_anual_pct: prev > 0 ? +((cur - prev) / prev * 100).toFixed(2) : null}];
  };
  const entSerie = (v, d) => ({nombre: dims[v].nom(d), datos: dims[v].serie(d), anios: am(v) ? (d.serie_anios && d.serie_anios.length ? d.serie_anios : sumaDe(v) ? aniosDerivados(d) : null) : null, tipo: v, d});
  const hallaz = () => (D.hallazgos || []).filter(x => !esNac(x) && !esVarMes(x));
  const hayTop = v => items(v).length && dims[v].top;
  // cfg.graf(d, mm, ctx) es opcional: ctx 'nac' (fichas de Nacional) o 'ent' (elemento elegido). Si no devuelve nada, se usa la gráfica estándar.
  const graf = (d, mm, ctx, anual, ov) => (cfg.graf && cfg.graf(d, mm, ctx)) || grafica(d, mm, ctx, anual, ov);
  // Formatos opcionales de G: dec (número o (serie, ctx) => número), unit (texto o (ctx, D) => texto), vd (decimales de las variaciones), nulo (texto cuando no hay variación)
  const dcv = (d, ctx) => typeof G.dec === 'function' ? G.dec(d, ctx, cur()) : G.dec;
  const ucv = ctx => typeof G.unit === 'function' ? G.unit(ctx, D, cur()) : G.unit;
  // Títulos opcionales de las fichas: cfg.tit = {c12, cmm, ent}, texto o D => texto
  const tit = (k, def) => { const v = cfg.tit && cfg.tit[k]; return esc(typeof v === 'function' ? v(D, cur()) : v || def); };
  const cl = k => k ? ` class="${k}"` : '';
  // G.useBanda (opcional): las variaciones dentro de D.hero.banda_pct se muestran neutras ("en línea"), sin color
  // G.por (opcional) = {tipo: {...}}: valores de G que cambian para un tipo de dimensión (p. ej. dep) cuando el resto de la página usa otra lógica
  const Gt = tipo => G.por && G.por[tipo] ? {...G, ...G.por[tipo]} : G;
  const banda = (v, g = G) => !!(g.useBanda && D && D.hero && D.hero.banda_pct != null && v != null && Math.abs(v) <= D.hero.banda_pct);
  const vcl = (v, g = G) => cls(banda(v, g) ? 0 : v);
  const hlab = (h, x) => typeof h.label === 'function' ? h.label(x) : h.label;
  const med = c => typeof c.medida === 'function' ? c.medida(D) : c.medida;
  const tit0 = c => typeof c.titulo === 'function' ? c.titulo(D) : c.titulo;   // título del panel de la lista (puede ser dinámico)
  const subx = (c, x) => { const t = c.sub && c.sub(x); return t ? `<small class="mute">${esc(t)}</small>` : ''; };
  renderCb = () => { if (D) render(); };

  fetch(URL_JSON, {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => {
      D = d; st.g = D.serie && D.serie.doce_meses ? {nombre: cfg.nacTitle, datos: D.serie.doce_meses, nac: true, tipo: 'nac'} : null;   // sin D.serie (indicadores sin Total) no hay ficha nacional
      K.forEach(v => { const p = ord(v)[0]; st.sel[v] = p ? entSerie(v, p) : null; });
      // Si el JSON no trae una dimensión (o no hay destacados), se oculta su pestaña del header
      document.querySelectorAll('[data-vista]').forEach(b => {
        const v = b.dataset.vista;
        if ((dims[v] && !items(v).length) || (v === 'dest' && !hallaz().length) || (v === 'gen' && cfg.sinTotal)) b.style.display = 'none';
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
    document.body.dataset.avVista = v;   // permite CSS por vista (p. ej. body[data-av-vista="comp"])
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
        <section class="card cl" aria-label="${esc(tit0(c))}">
          <div class="head"><h2>${esc(tit0(c))}</h2><small class="mute">${med(c)}</small></div>
          <div class="clfoot"><small class="mute clm">${med(c)}</small><p class="ref">${c.ref(D)}</p></div>
          <div class="selW"><span class="selT" id="selT"></span><select class="selL" id="selLista" aria-label="Elegir"></select></div>
          <div class="list" id="lista"></div>
        </section>
        <div class="cnav" id="cnav"></div>
        <div class="carw"><div class="car">
          <section class="card hero" id="hero" aria-label="Indicador"></section>${c.hijos ? `
          <section class="card hero gr cacts" id="heroHijos" data-lbl="${esc(hlab(c.hijos, st.sel[v].d))}" aria-label="${esc(hlab(c.hijos, st.sel[v].d))}"></section>` : ''}${c.hijos2 ? `
          <section class="card hero gr cacts" id="heroMun" data-lbl="${esc(hlab(c.hijos2, st.sel[v].d))}" aria-label="${esc(hlab(c.hijos2, st.sel[v].d))}"></section>` : ''}
          ${c.graficas ? `<section class="card cg" data-lbl="Gráficas" aria-label="Gráficas">
            <div class="tabs htabs gtabs" role="group" aria-label="Gráfica">${c.graficas.map((g, i) => `<button data-gtab="${i}" aria-pressed="${(st.gtab || 0) === i}">${esc(g.lbl)}</button>`).join('')}</div>
            <div class="head"><h2 id="serieT"></h2></div>
            <div id="chart"></div>
          </section>` : `<section class="card cg" data-lbl="${am(v) ? PM.card : 'Últimos 12 meses'}" aria-label="Serie">
            <div class="head"><h2 id="serieT"></h2></div>
            <div id="chart"></div>
          </section>`}
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
      if (ant.length) prev = `<div class="prev"><span class="th">${cfg.prevTitle}</span>${ant.map(p => `<div class="pr"><span>${esc(p.mes)}${p.anio !== per.anio ? ' ' + p.anio : ''}</span><b>${fmt(p.valor, dcv([p], 'nac'))}${ucv('nac')}</b><small class="${vcl(p[G.vf])}">${p[G.vf] == null ? '—' : flecha(p[G.vf]) + ' ' + sg(p[G.vf], G.vd) + G.vs}</small></div>`).join('')}</div>`;
    }
    // c.prev (opcional) = {titulo, n}: lista de los n meses previos (por defecto 4) de la serie de 12 meses del elemento, solo con su valor. Solo para elementos (paneles de tema o departamento). Las filas llevan solo el número: la unidad va en el título (titulo puede ser (D, d) => texto).
    if (enE && c.prev) {
      const n = c.prev.n || 4, ant = (s.datos || []).slice(-(n + 1), -1).reverse().filter(p => p.valor != null),
        tt = typeof c.prev.titulo === 'function' ? c.prev.titulo(D, s.d) : c.prev.titulo;
      if (ant.length) prev = `<div class="prev"><span class="th">${esc(tt)}</span>${ant.map(p => `<div class="pr"><span>${esc(p.mes)}${p.anio !== per.anio ? ' ' + p.anio : ''}</span><b>${fmt(p.valor, dcv(ant, 'ent'))}</b></div>`).join('')}</div>`;
    }
    const hj = enE && c.hijos, hj2 = enE && !!c.hijos2 && c.hijos2.get(s.d).length > 0;   // hijos2 (opcional): segunda lista, p. ej. municipios; sin elementos no hay pestaña ni ficha
    if (MOV.matches && st.htab !== 'ent') st.htab = 'ent';   // en celular los hijos son fichas del carrusel
    if (st.htab === 'mun' && !hj2) st.htab = 'ent';
    const gr = !!hj && (st.htab === 'hijos' || st.htab === 'mun'), nH = hj ? c.hijos.get(s.d).length : 0, n2 = hj2 ? c.hijos2.get(s.d).length : 0;
    const lb = hj ? hlab(c.hijos, s.d) : '', lb2 = enE && c.hijos2 ? hlab(c.hijos2, s.d) : '';
    $('#hero').className = 'card hero' + (hj ? ' wt' + (gr ? ' gr' : '') : '');
    const tabsH = hj ? `<div class="tabs htabs" role="group" aria-label="Contenido del panel">
      <button data-htab="ent" aria-pressed="${!gr}">${c.una}</button>
      <button data-htab="hijos" aria-pressed="${st.htab === 'hijos'}">${lb}${nH ? ` (${nH})` : ''}</button>${hj2 ? `
      <button data-htab="mun" aria-pressed="${st.htab === 'mun'}">${lb2} (${n2})</button>` : ''}</div>` : '';
    const cuerpo = st.htab === 'mun' && hj2 ? hijosHtml(s.d, c, c.hijos2) : gr ? hijosHtml(s.d, c) : `<div class="big${h.bigCls ? ' ' + h.bigCls : ''}">${h.big}${h.unit ? `<span>${h.unit}</span>` : ''}</div>
      <div class="vars">${h.filas}</div>${prev}
      <small class="mute src">${h.com ? esc(h.com) + '<br>' : ''}${h.extra ? h.extra + '<br>' : ''}${esc(src)}${cfg.nota ? '<br>' + cfg.nota : ''}</small>`;
    $('#hero').innerHTML = `${enE ? `<div class="kick kv"><span class="kk">${esc(c.kick)}</span><span class="kc">${esc(h.ttl)}</span></div>` : ''}${tabsH}
      <div class="ttl">${esc(h.ttl)}</div>${cuerpo}`;
    $('#hero').dataset.lbl = enE ? c.una : 'Total';
    const hh = $('#heroHijos');
    if (hh && hj) { hh.dataset.lbl = lb; hh.innerHTML = `<div class="ttl">${lb}${nH ? ` (${nH})` : ''}</div>${hijosHtml(s.d, c)}`; }
    const hm = $('#heroMun');
    if (hm) { hm.classList.toggle('nada', !hj2); hm.dataset.lbl = lb2; hm.innerHTML = hj2 ? `<div class="ttl">${lb2} (${n2})</div>${hijosHtml(s.d, c, c.hijos2)}` : ''; }
    carNav(true);
  }

  // Lista de hijos de la entidad elegida; h.det (opcional) es una línea de detalle bajo la barra
  function hijosHtml(d, c, hj = c.hijos) {
    const hs = hj.get(d), lb = hlab(hj, d);
    if (!hs.length) return `<div class="gwrap"><p class="vacio">Sin detalle de ${lb.toLowerCase()}.</p></div>`;
    return `<div class="gwrap"><div class="glist" tabindex="0" aria-label="${esc(lb)}">${hs.map((h, i) => `
      <div class="tr g">
        <span class="rk">${hj.rank === false ? '•' : i + 1}</span>
        <span class="nm"><span class="wrap">${esc(h.nombre)}</span><span class="bar"><b class="${cls(h.bar !== undefined ? h.bar : h.delta)}" style="width:${h.w}%"></b></span>${h.det ? `<small class="mute">${esc(h.det)}</small>` : ''}</span>
        <span class="vl"><strong${cl(cls(h.val))}>${h.valTxt}</strong><small class="${cls(h.delta)}">${h.sub || ''}</small></span></div>`).join('')}</div>
      <p class="ref">${typeof hj.nota === 'function' ? hj.nota(d, D) : hj.nota}</p></div>`;
  }

  function marcar() {
    const v = st.vista, its = items(v), sel = st.sel[v].d, sl = $('#selLista');
    document.querySelectorAll('#lista [data-e]').forEach(x => x.setAttribute('aria-pressed', its[x.dataset.e] === sel));
    if (sl) sl.value = its.indexOf(sel); selTitle();
  }

  // c.vsub (opcional): texto de la segunda línea de cada fila de la lista (en lugar de la variación); p. ej. "% del índice total"
  function lista() {
    const v = st.vista, c = dims[v], todas = items(v), its = ord(v), sel = st.sel[v].d;
    const ts = its.map(x => c.val(x) || 0), mx = Math.max(...ts), mn = Math.min(...ts), l = $('#lista'), G = Gt(v);
    l.innerHTML = its.map((x, i) => {
      // c.alfa (opcional): intensidad 0..1 absoluta; c.rowCls (opcional): clase extra de la fila (p. ej. para pintarla distinto según la dirección)
      const a = c.alfa ? .08 + .52 * Math.min(1, Math.max(0, c.alfa(x) || 0)) : .08 + .52 * ((c.val(x) || 0) - mn) / ((mx - mn) || 1), vr = c.vr(x), rc = c.rowCls ? c.rowCls(x) : '';
      return `<button class="row${rc ? ' ' + rc : ''}" style="--a:${a.toFixed(2)}" data-e="${todas.indexOf(x)}" data-v="${v}" title="${esc(c.nom(x))}" aria-pressed="${sel === x}">
        <span class="rk">${i + 1}</span>
        <span class="nm"><span>${esc(c.nom(x))}</span>${subx(c, x)}</span>
        <span class="vl"><strong>${c.valTxt(x)}</strong><small class="${c.vsub ? '' : vcl(vr, G)}">${c.vsub ? c.vsub(x) : vr == null ? (typeof G.nulo === 'function' ? G.nulo(x) : G.nulo || '') : sg(vr, G.vd) + G.vs}</small></span></button>`;
    }).join('');
    const r = l.querySelector('[aria-pressed=true]');
    if (r) l.scrollTop = Math.max(0, r.offsetTop - l.offsetTop - (l.clientHeight - r.offsetHeight) / 2);
    const sl = $('#selLista');
    sl.setAttribute('aria-label', 'Elegir ' + c.una.toLowerCase());
    sl.innerHTML = its.map(x => `<option value="${todas.indexOf(x)}"${sel === x ? ' selected' : ''}>${esc(c.opt ? c.opt(x, D) : `${c.valTxt(x)} · ${c.nom(x)}`)}</option>`).join(''); selTitle();
  }

  // Top: todos los elementos que aumentaron / redujeron frente a hace un año, de mayor a menor cambio
  function topHtml(v) {
    const c = dims[v], G = Gt(v), todas = items(v), its = todas.filter(x => c.vr(x) != null && (!c.topOk || c.topOk(x))), mx = Math.max(...its.map(x => Math.abs(c.vr(x))), 0.01);
    const bloque = k => {
      const arr = (k === 'up' ? its.filter(x => c.vr(x) > 0).sort((a, b) => c.vr(b) - c.vr(a)) : its.filter(x => c.vr(x) < 0).sort((a, b) => c.vr(a) - c.vr(b)));
      const tt = c.topTxt || {}, verbo = k === 'up' ? tt.up || 'aumentaron' : tt.dn || 'redujeron', verbo1 = k === 'up' ? tt.upS || 'aumentó' : tt.dnS || 'redujo';
      const vacio = `${c.ning} ${verbo1} ${tt.vs || 'frente a hace un año'}.`;
      return `<div class="t5"><h2 class="${k}">${c.plural} que ${verbo} <small>(${arr.length})</small></h2>${arr.length ? `<div class="glist" tabindex="0">${arr.map((x, i) => `
        <button class="tr" data-e="${todas.indexOf(x)}" data-v="${v}" title="${esc(c.nom(x))}" aria-pressed="false">
          <span class="rk">${i + 1}</span>
          <span class="nm"><span>${esc(c.nom(x))}</span>${subx(c, x)}<span class="bar"><b class="${k}" style="width:${100 * Math.abs(c.vr(x)) / mx}%"></b></span></span>
          <span class="vl"><strong class="${k}">${flecha(c.vr(x))} ${sg(c.vr(x), G.vd)}${G.vs}</strong><small class="${k}">${c.topSub(x, D)}</small></span></button>`).join('')}</div>` : `<p class="vacio">${vacio}</p>`}</div>`;
    };
    // c.nuevos = {txt: (x, D) => texto}: los elementos sin variación posible (sin registro hace un año) van aparte, en un desplegable
    const sin = c.nuevos ? todas.filter(x => c.vr(x) == null && (!c.nuevos.filtro || c.nuevos.filtro(x))).sort((a, b) => c.val(b) - c.val(a)) : [];
    const nuevos = sin.length ? `<details class="nuevos"><summary>${sin.length} ${(sin.length === 1 ? c.una : c.plural).toLowerCase()} ${c.nuevos.sum || 'sin registro hace un año'}</summary><div class="glist" tabindex="0">${sin.map(x => `
        <button class="tr" data-e="${todas.indexOf(x)}" data-v="${v}" title="${esc(c.nom(x))}" aria-pressed="false">
          <span class="rk">•</span>
          <span class="nm"><span>${esc(c.nom(x))}</span>${subx(c, x)}</span>
          <span class="vl"><strong>${esc(c.nuevos.txt ? c.nuevos.txt(x, D) : c.valTxt(x))}</strong></span></button>`).join('')}</div></details>` : '';
    return `<div class="gwrap"><div class="tres">${bloque('up')}${bloque('dn')}</div>${nuevos}
      <p class="ref">${(typeof c.topRef === 'function' ? c.topRef(D) : c.topRef) || `Cambio frente a hace un año${G.vs.trim() === 'pp' ? ' en puntos porcentuales (pp)' : ''}. Toca un elemento para ver su detalle.`}</p></div>`;
  }

  function serie() {
    const s = cur();
    const anual = !!(s.anios && s.anios.length > 1), dat = anual ? s.anios : s.datos || [];   // años móviles si hay al menos 2
    if (st.vista === 'gen') { $('#c12').innerHTML = graf(dat, false, 'nac', anual); $('#cmm').innerHTML = graf(D.serie.mismo_mes || [], true, 'nac'); return; }
    // dims[v].graficas (opcional): varias gráficas por elemento en UNA tarjeta con pestañas
    // [{lbl, titulo: (D, s) => texto, datos: d => puntos, mm?, anual?, ov?}]
    const gs = dims[st.vista] && dims[st.vista].graficas;
    if (gs) {
      const gi = Math.min(st.gtab || 0, gs.length - 1), g = gs[gi];
      document.querySelectorAll('[data-gtab]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.gtab === gi));
      $('#serieT').innerHTML = `<span class="serTx">${esc(typeof g.titulo === 'function' ? g.titulo(D, s) : g.titulo)}</span>`;
      $('#chart').innerHTML = graf(g.datos(s.d) || [], !!g.mm, 'ent', !!g.anual, g.ov);
      return;
    }
    $('#serieT').innerHTML = `<span class="serTx">${tit('ent', anual ? PM.card : 'Últimos 12 meses')}</span>`;
    $('#chart').innerHTML = graf(dat, false, 'ent', anual);
  }

  function hallazgosHtml() {
    return `<div class="hz">${hallaz().map(x => `
      <div class="card ${/_(alt[ao]|sube)$/.test(x.tipo) ? 'sube' : /_baj[ao]$/.test(x.tipo) ? 'baja' : ''}">
        <h3>${esc(x.titulo)}</h3><p>${esc(nm(x.texto))}</p></div>`).join('')}</div>`;
  }

  // anual = true: puntos = años móviles de 12 meses (p. ej. Nov–Oct); se comparan con el año móvil anterior (var_anual_pct / valor_hace_12), sin banda
  function grafica(d, mm, ctx, anual, ov) {
    const G = (g => ov ? {...g, ...ov} : g)((g => anual ? {vd: 1, ...g, vf: 'var_anual_pct', useBanda: false, refKey: 'valor_hace_12', refLbl: PM.ant,
      ley: `<span class="up">●</span> por encima del ${PM.ant} &nbsp; <span class="dn">●</span> por debajo`, ...(g.anual || {})} : g)(Gt((cur() || {}).tipo)));
    if (d.length < 2) return '<p class="mute">Sin datos suficientes.</p>';
    const barY = !!(anual && G.barras);   // años móviles como barras verticales (una por año móvil)
    // Barras agrupadas: si los puntos de serie_anios traen temas = [{nombre, valor, var_anual_pct?, unidad?}, ...], cada año lleva una barra por tema (mismos ejes y escala)
    const grupos = barY && d.some(p => Array.isArray(p.temas) && p.temas.length > 1), TC = ['#12303d', '#5f8da3', '#b9cfda'];
    // G.escalaPropia (opcional): los temas tienen unidades distintas (t, laboratorios...), así que cada tema usa su propia escala (la altura es relativa a su máximo) y la cifra de cada barra es el valor real
    const mxT = grupos && G.escalaPropia ? d.find(p => p.temas).temas.map((_, j) => Math.max(0, ...d.map(p => ((p.temas || [])[j] || {}).valor || 0))) : null,
      vy = (j, v) => mxT ? (mxT[j] ? (v || 0) / mxT[j] : 0) : (v || 0), fv = (t, v) => fmt(v || 0, t.dec != null ? t.dec : dec);
    const dec = dcv(grupos ? d.flatMap(p => (p.temas || []).map(t => ({valor: t.valor}))) : d, ctx), un = ucv(ctx);
    // Mismo mes por año: la variación frente al año anterior se calcula (diferencia entre años consecutivos) si el JSON no la trae
    d = d.map((p, i) => ({...p, _v: !mm ? p[G.vf] : p[G.vf] != null ? p[G.vf] : (G.calcMM && i ? +(p.valor - d[i - 1].valor).toFixed(4) : null)}));
    const vmm = mm && d.some(p => p._v != null), yoy = !mm && d.some(p => p._v != null), var2 = !!anual && yoy && !grupos;   // var2: la variación vs. el año móvil anterior va bajo cada etiqueta
    const W = 520, H = MOV.matches ? 190 : 250, L = barY ? 16 : vmm ? 40 : anual ? 56 : 24, R = barY ? 16 : vmm ? 40 : anual ? 56 : 24, T = 30, B = vmm || var2 ? (barY && MOV.matches ? 66 : 58) : grupos && MOV.matches && d.some(p => (p.rango || p.mes || '').length > 11) ? 50 : 34, paso = d.length > 13 ? Math.ceil(d.length / 8) : 1;
    const vs = mxT ? [0, 1] : grupos ? d.flatMap(p => p.temas.map(t => t.valor || 0)) : d.map(p => p.valor), mn = Math.min(...vs), mx = Math.max(...vs);
    // Barras apiladas Colombia / Exterior (opcional): si los puntos traen colombia y exterior, la escala arranca en 0 y la línea queda sobre el tope de cada barra
    const bars = !mm && d.some(p => p.colombia != null && p.exterior != null);
    const lo = bars || barY ? 0 : mn - (mx - mn || 1) * .25, hi = bars || barY ? (mx || 1) * 1.14 : mx + (mx - mn || 1) * .25;
    const x = i => barY ? L + (i + .5) * (W - L - R) / d.length : L + i * (W - L - R) / (d.length - 1), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const th = G.useBanda && D && D.hero && D.hero.banda_pct != null ? D.hero.banda_pct : 0.004;
    const col = n => n > th ? 'var(--up-l)' : n < -th ? 'var(--dn-l)' : 'var(--ink)';
    const colT = n => n > th ? 'var(--up-t)' : n < -th ? 'var(--dn-t)' : 'var(--ink)';
    let seg = '', pts = '', lab = '', brs = '';
    if (bars) {
      const bw = Math.min(anual ? 64 : 30, (W - L - R) / d.length * .62), y0 = y(0), cC = '#cfdce3', cE = '#5f8da3';
      brs += `<line x1="${L - 6}" y1="${y0}" x2="${W - R + 6}" y2="${y0}" stroke="#dfe6ea" stroke-width="1.5"/>`;
      d.forEach((p, i) => {
        const col = p.colombia || 0, ext = p.exterior || 0, yc = y(col), yt = y(col + ext);
        const tt = `<title>${esc(p.mes)}${anual ? '' : ' ' + p.anio}: Colombia ${fmt(col, dec)}${un} · Exterior ${fmt(ext, dec)}${un}</title>`;
        brs += `<g>${tt}<rect x="${x(i) - bw / 2}" y="${yc}" width="${bw}" height="${Math.max(0, y0 - yc)}" fill="${cC}" rx="2"/>`
          + (ext > 0 ? `<rect x="${x(i) - bw / 2}" y="${yt}" width="${bw}" height="${Math.max(0, yc - yt)}" fill="${cE}" rx="2"/>` : '') + '</g>';
      });
    }
    const bwY = barY ? Math.min(64, (W - L - R) / d.length * .62) : 0;
    if (barY) brs += `<line x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}" stroke="#dfe6ea" stroke-width="1.5"/>`;
    d.forEach((p, i) => {
      if (i && !barY) seg += `<line x1="${x(i - 1)}" y1="${y(d[i - 1].valor)}" x2="${x(i)}" y2="${y(p.valor)}" stroke="${yoy ? '#aebfc8' : p.valor > d[i - 1].valor ? 'var(--up-l)' : 'var(--dn-l)'}" stroke-width="${yoy ? 3 : 3.5}" stroke-linecap="round"/>`;
      const et = p.rango || p.mes || '', ult = i === d.length - 1, cp = (yoy || vmm) && p._v != null ? col(p._v) : null;
      const rk = G.refKey || 'valor_hace_12', tip = yoy && p[rk] != null ? `<title>${esc(p.rango || p.mes)}${anual ? '' : ' ' + p.anio}: ${fmt(p.valor, dec)}${un} · ${G.refLbl || 'hace un año'}: ${fmt(p[rk], rk === 'ref_12m' && dec === 0 ? 1 : dec)}${un} (${sg(p._v, G.vd)}${G.vs})</title>`
        : vmm && p._v != null ? `<title>${p.anio}: ${fmt(p.valor, dec)}${un} (${sg(p._v, G.vd)}${G.vs} vs. el año anterior)</title>` : '';
      if (barY && grupos) {
        const ts = p.temas || [], nT = ts.length || 1, gw = Math.min(nT * 36, (W - L - R) / d.length * .86), bw = gw / nT - 3, bx = j => x(i) - gw / 2 + j * gw / nT + 1.5;
        brs += `<g>${ts.map((t, j) => `<rect x="${bx(j)}" y="${y(vy(j, t.valor))}" width="${bw}" height="${Math.max(0, y(0) - y(vy(j, t.valor)))}" fill="${TC[j % TC.length]}" rx="2"><title>${esc(et)} · ${esc(t.nombre)}: ${fv(t, t.valor)}${t.unidad ? ' ' + esc(t.unidad) : un}${t.var_anual_pct != null ? ` (${sg(t.var_anual_pct, 1)} % vs. ${PM.ant})` : ''}</title></rect>`).join('')}</g>`;
        lab += ts.map((t, j) => `<text class="v" x="${bx(j) + bw / 2}" y="${y(vy(j, t.valor)) - 5}" text-anchor="middle" style="font-size:${MOV.matches ? 14 : 12}px">${fv(t, t.valor)}</text>`).join('');
      } else if (barY) brs += `<g>${tip || `<title>${esc(p.rango || p.mes)}: ${fmt(p.valor, dec)}${un}</title>`}<rect x="${x(i) - bwY / 2}" y="${y(p.valor)}" width="${bwY}" height="${Math.max(0, y(0) - y(p.valor))}" fill="${cp || '#aebfc8'}" rx="3"/></g>`;
      else pts += `<circle cx="${x(i)}" cy="${y(p.valor)}" r="${ult ? 7 : 4.5}" fill="${ult ? '#fff' : cp || 'var(--ink)'}" stroke="${ult ? cp || 'var(--acc)' : 'none'}" stroke-width="3.5">${tip}</circle>`;
      if (!grupos && (mm || anual || i === 0 || ult || p.valor === mx || p.valor === mn))
        lab += `<text class="v" x="${x(i)}" y="${y(p.valor) - 12}" text-anchor="${anual ? 'middle' : i === 0 ? 'start' : ult ? 'end' : 'middle'}">${fmt(p.valor, dec)}</text>`;
      if ((d.length - 1 - i) % paso === 0) lab += barY && MOV.matches && et.includes('–') && et.length > 11   // celular: el rango va en dos líneas
        ? `<text x="${x(i)}" text-anchor="middle"><tspan x="${x(i)}" y="${grupos ? H - 22 : H - 40}">${esc(et.split('–')[0])}–</tspan><tspan x="${x(i)}" y="${grupos ? H - 8 : H - 26}">${esc(et.split('–')[1])}</tspan></text>`
        : `<text x="${x(i)}" y="${vmm || var2 ? H - 30 : H - 8}" text-anchor="middle">${mm ? p.anio : esc(et)}</text>`;
      if (var2 && p._v != null) lab += `<text class="v" x="${x(i)}" y="${H - 9}" text-anchor="middle" style="fill:${colT(p._v)};font-size:15px">${sg(p._v, 1)}${G.vs}</text>`;
      if (vmm && p._v != null) lab += `<text class="v" x="${x(i)}" y="${H - 9}" text-anchor="middle" style="fill:${colT(p._v)};font-size:15px">${sg(p._v, 1)}${G.vs}</text>`;
    });
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Serie de ${mm ? 'años' : anual ? PM.card.toLowerCase() : 'meses'}">${brs}${seg}${pts}${lab}</svg>`;
    const nota = t => `<p class="ref" style="margin:2px 0 0;font-size:13px">${t}</p>`;
    if (vmm) return `<div class="gf">${svg}${nota(G.mmNota || 'Cifra sobre cada punto: valor del mes · debajo del año: cambio frente al año anterior' + (G.calcMM ? ' (calculado)' : ''))}</div>`;
    const leyB = bars ? nota('<span style="color:#cfdce3">■</span> Colombia &nbsp; <span style="color:#5f8da3">■</span> Exterior &nbsp; (barras apiladas: suman el total del ' + (anual ? 'año móvil' : 'mes') + ')') : '';
    if (grupos) return `<div class="gf">${svg}${nota(d.find(p => p.temas).temas.map((t, j) => `<span style="color:${TC[j % TC.length]}">■</span> ${esc(t.nombre)}`).join(' &nbsp; ') + (mxT ? '<br>Cada variable con su propia escala: la altura es relativa a su máximo y la cifra es el valor real' : ''))}</div>`;
    return yoy ? `<div class="gf">${svg}${nota(G.ley || '<span class="up">●</span> por encima del mismo mes del año anterior &nbsp; <span class="dn">●</span> por debajo')}${leyB}</div>` : bars ? `<div class="gf">${svg}${leyB}</div>` : svg;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !D) return;
    if (b.dataset.vista) { if (b.dataset.vista === st.vista) return; st.vista = b.dataset.vista; st.htab = 'ent'; render(); $('#app').scrollTo({top: 0}); return; }
    if (b.dataset.gtab != null) { st.gtab = +b.dataset.gtab; serie(); return; }   // pestañas de gráficas
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
