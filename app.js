/* =========================================================
   Así Vamos · Estado de la Nación
   6 indicadores con sparkline segmentada mes a mes.
   Gráfica a ancho completo con valor inicial centrado arriba.
   ========================================================= */

const N_PUNTOS = 5;        // meses mostrados
const RANGO_MIN = 0.10;    // la escala Y nunca muestra menos del 10 % del promedio

const INDICADORES = [
  // --- Impacto cotidiano (datos reales en JSON) ---
  { id: 'Inflacion', archivo: 'inflacion_anual_dane.json',      campo: 'var_anual',      dec: 2, subeEsMalo: true },
  // Desempleo (GEIH): generado por load_desempleo.py. TD nacional (serie original), redondeada como la publica el DANE y la reportan los medios.
  { id: 'Desempleo', archivo: 'desempleo_historico_dane.json', campo: 'tasa_desempleo', dec: 1, redondear: true, subeEsMalo: true },
  { id: 'Seguridad', archivo: 'crimen_historico.json',         campo: 'indice',         dec: 1, subeEsMalo: true },

  // --- Ámbito nacional ---
  // Economía (ISE): generado por load_economia.py. Muestra el índice del ISE (serie original) tal como lo publica el DANE. Más actividad = mejor.
  { id: 'Economia', archivo: 'economia_historico.json', campo: 'indice', dec: 2, redondear: true, subeEsMalo: false },
  // Narcotráfico: card con 3 variables (cocaína, base de coca, laboratorios). Se pinta con renderizarNarco() desde detalle/data/detalle_narcotrafico.json
  // Terrorismo: más hechos = peor (rojo al subir)
  { id: 'Terrorismo', archivo: 'terrorismo_historico.json', campo: 'valor', dec: 1, subeEsMalo: true }
];

document.addEventListener('DOMContentLoaded', () => {
  INDICADORES.forEach(cfg => {
    if (cfg.datos) renderizarIndicador(cfg, cfg.datos);
    else cargarIndicador(cfg);
  });
  cargarNarco();
});

/* ---------- Carga de datos ---------- */
function cargarIndicador(cfg) {
  fetch(`data/${cfg.archivo}?v=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => renderizarIndicador(cfg, data))
    .catch(err => console.error(`Error ${cfg.id}:`, err));
}

/* ---------- Utilidades ---------- */
function mesCapitalizado(m) {
  const str = String(m || '').trim();
  if (!str) return '--';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/* Por defecto: truncamiento estricto a 'dec' decimales sin redondear.
   Con redondear = true (ej. Economía y Desempleo, que replican la cifra publicada por el DANE) se redondea. */
function fmt(v, dec, redondear = false) {
  const factor = Math.pow(10, dec);
  let s = redondear ? v.toFixed(dec) : (Math.trunc(v * factor) / factor).toFixed(dec);
  if (Number(s) === 0) s = s.replace('-', '');   // evita '-0.00'
  if (dec === 0) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s;
}

/* ---------- Posición de los números (que no se pisen con la línea) ---------- */
const FS_V1 = 14, FS_V2 = 19;   // tamaños de .v1 y .v2 en styles.css (unidades del SVG)

/* Ancho aproximado de un texto: dígitos ~0.52 em, punto/coma ~0.3 em, signo ~0.4 em */
function anchoTexto(txt, fs) {
  return [...String(txt)].reduce((w, c) => w + (/\d/.test(c) ? 0.52 : c === '-' ? 0.4 : 0.3) * fs, 0);
}

/* Punto más alto de la línea (menor y) entre xa y xb, interpolando entre puntos */
function yMinTramo(pts, xa, xb) {
  const xIni = pts[0][0], xFin = pts[pts.length - 1][0];
  const a = Math.max(xa, xIni), b = Math.min(xb, xFin);
  if (a > b) return Infinity;
  let y = Infinity;
  for (let x = a; x <= b + 0.001; x += 0.5) {
    let i = 0;
    while (i < pts.length - 2 && x > pts[i + 1][0]) i++;
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    y = Math.min(y, y1 + (y2 - y1) * (x - x1) / (x2 - x1));
  }
  return y;
}

/* Línea base de v1 y v2: por defecto sobre su punto; si la línea sube más arriba dentro del
   ancho del texto, el número se sube hasta quedar por encima de ella. */
function posicionesNumeros(pts, txt1, txt2) {
  const a = pts[0], b = pts[pts.length - 1];
  const w1 = anchoTexto(txt1, FS_V1), w2 = anchoTexto(txt2, FS_V2);
  const y1 = Math.min(a[1] - 10, yMinTramo(pts, a[0] - w1 / 2 - 2, a[0] + w1 / 2 + 2) - 10);
  const y2 = Math.min(b[1] - 9,  yMinTramo(pts, b[0] + 8 - w2 - 2, b[0] + 8 + 2) - 9);
  return [y1, y2];
}

/* Sparkline SVG: ancho completo (12 a 148) y v1 centrado exactamente arriba del punto inicial */
function sparkline(vals, dec, subeEsMalo, mesIni, mesFin, uid, redondear = false) {
  const W = 160, H = 100, x0 = 12, x1 = 148, yTop = 28, yBot = 72;
  const yBase = 82;  // base del área de relleno (por encima de las etiquetas de mes)
  const GRAD = { 'ln-mejoro': 'ok', 'ln-empeoro': 'mal', 'ln-neu': 'neu' };
  const prom = vals.reduce((a, b) => a + b, 0) / vals.length;
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < Math.abs(prom) * RANGO_MIN) {
    const c = (max + min) / 2, h = Math.abs(prom) * RANGO_MIN / 2;
    min = c - h; max = c + h;
  }
  const pts = vals.map((v, i) => [x0 + i * (x1 - x0) / (vals.length - 1), yBot - (v - min) / (max - min) * (yBot - yTop)]);
  
  let paths = '';
  let areas = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const diff = vals[i + 1] - vals[i];
    let colorClass = 'ln-neu';
    if (diff !== 0) {
      const malo = subeEsMalo ? diff > 0 : diff < 0;
      colorClass = malo ? 'ln-empeoro' : 'ln-mejoro';
    }
    const f = n => n.toFixed(1);
    areas += `<polygon points="${f(p1[0])},${f(p1[1])} ${f(p2[0])},${f(p2[1])} ${f(p2[0])},${yBase} ${f(p1[0])},${yBase}" fill="url(#ga-${uid}-${GRAD[colorClass]})" stroke="none"/>`;
    paths += `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" class="ln ${colorClass}" stroke-width="2.2" stroke-linecap="round"/>`;
  }

  const medios = pts.slice(1, -1).map((p, i) => {
    const diff = vals[i + 1] - vals[i];
    let ptClass = 'pt';
    if (diff !== 0) {
      const malo = subeEsMalo ? diff > 0 : diff < 0;
      ptClass = malo ? 'pt empeoro' : 'pt mejoro';
    }
    return `<circle class="${ptClass}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6"/>`;
  }).join('');

  // Degradados verticales (de color a transparente), uno por tipo de segmento
  const grad = (k, c, op) => `<linearGradient id="ga-${uid}-${k}" gradientUnits="userSpaceOnUse" x1="0" y1="${yTop}" x2="0" y2="${yBase}"><stop offset="0" style="stop-color:${c};stop-opacity:${op}"/><stop offset="1" style="stop-color:${c};stop-opacity:0"/></linearGradient>`;
  const defs = `<defs>${grad('ok', 'var(--ok)', .20)}${grad('mal', 'var(--mal)', .20)}${grad('neu', '#d9f4ff', .22)}</defs>`;

  const a = pts[0], b = pts[pts.length - 1];
  const txt1 = fmt(vals[0], dec, redondear), txt2 = fmt(vals[vals.length - 1], dec, redondear);
  const [yv1, yv2] = posicionesNumeros(pts, txt1, txt2);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    ${defs}${areas}${paths}${medios}
    <circle class="pt" cx="${a[0]}" cy="${a[1].toFixed(1)}" r="3.2"/>
    <circle class="fin" cx="${b[0]}" cy="${b[1].toFixed(1)}" r="4.2"/>
    <text class="v1" x="${a[0]}" y="${yv1.toFixed(1)}" text-anchor="middle">${txt1}</text>
    <text class="v2" x="${b[0] + 8}" y="${yv2.toFixed(1)}" text-anchor="end">${txt2}</text>
    <text class="lbl-mes" x="${a[0]}" y="94" text-anchor="start">${mesCapitalizado(mesIni)}</text>
    <text class="lbl-mes" x="${b[0]}" y="94" text-anchor="end">${mesCapitalizado(mesFin)}</text>
  </svg>`;
}

/* ---------- Render de una tarjeta ---------- */
function renderizarIndicador(cfg, data) {
  if (!Array.isArray(data) || data.length < 3) return;

  const serie = data.slice(-N_PUNTOS)
    .map(r => ({ mes: r.mes, v: parseFloat(r[cfg.campo]) / (cfg.escala || 1) }))
    .filter(r => !isNaN(r.v));
  if (serie.length < 3) return;
  const vals = serie.map(r => r.v);

  const $ = id => document.getElementById(id + cfg.id);
  const sp = $('spark');
  if (sp) sp.innerHTML = sparkline(vals, cfg.dec, cfg.subeEsMalo, serie[0].mes, serie[serie.length - 1].mes, cfg.id, cfg.redondear);
  
  const card = document.getElementById(`card${cfg.id}`);
  if (card) {
    const titulo = card.querySelector('h2').innerText;
    card.setAttribute('aria-label', `${titulo}: último valor ${fmt(vals[vals.length - 1], cfg.dec, cfg.redondear)}`);
  }
}

/* =========================================================
   Narcotráfico: card con la línea de Cocaína
   Lee detalle/data/detalle_narcotrafico.json (el mismo del detalle,
   así la card y la página interna nunca se contradicen).
   Solo la línea de Cocaína: toneladas del primer mes (izquierda) y del último mes (derecha).
   El color del valor final sigue la variación vs. el promedio de 12 meses (sube = ámbar, baja = gris).
   Más incautación / destrucción = mejora (ámbar); menos = gris.
   ========================================================= */
const NARCO = {
  archivo: 'detalle/data/detalle_narcotrafico.json',
  principal: { codigo: 'cocaina', etiqueta: 'Incautación Cocaína' }
};

function cargarNarco() {
  if (!document.getElementById('sparkNarco')) return;
  fetch(`${NARCO.archivo}?v=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(renderizarNarco)
    .catch(err => console.error('Error Narco:', err));
}

/* La serie trae el mes abreviado ('Jun', 'Oct'); en la línea se muestra completo, como en Criminalidad */
const MESES_LARGOS = { ene: 'Enero', feb: 'Febrero', mar: 'Marzo', abr: 'Abril', may: 'Mayo', jun: 'Junio',
                       jul: 'Julio', ago: 'Agosto', sep: 'Septiembre', oct: 'Octubre', nov: 'Noviembre', dic: 'Diciembre' };
function nombreMes(m) {
  const k = String(m || '').trim().slice(0, 3).toLowerCase();
  return MESES_LARGOS[k] || mesCapitalizado(m);
}

/* Sparkline de Cocaína a ancho completo, con la variación (%) arriba del punto final, igual que en las otras cards.
   Misma lógica de color: sube = ámbar, baja = gris. */
function miniSparkline(vals, txt, cls, mesIni, mesFin, txtIni) {
  const W = 160, H = 100, x0 = 12, x1 = 148, yTop = 28, yBot = 72;
  const prom = vals.reduce((a, b) => a + b, 0) / vals.length;
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < Math.abs(prom) * RANGO_MIN) {
    const c = (max + min) / 2, h = Math.abs(prom) * RANGO_MIN / 2;
    min = c - h; max = c + h;
  }
  const pts = vals.map((v, i) => [x0 + i * (x1 - x0) / (vals.length - 1), yBot - (v - min) / (max - min) * (yBot - yTop)]);
  const f = n => n.toFixed(1);
  let lineas = '', medios = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const d = vals[i + 1] - vals[i];
    const c = d === 0 ? 'ln-neu' : (d > 0 ? 'ln-mejoro' : 'ln-empeoro');
    lineas += `<line x1="${f(pts[i][0])}" y1="${f(pts[i][1])}" x2="${f(pts[i + 1][0])}" y2="${f(pts[i + 1][1])}" class="ln ${c}" stroke-linecap="round"/>`;
  }
  pts.slice(1, -1).forEach((p, i) => {
    const d = vals[i + 1] - vals[i];
    medios += `<circle class="pt ${d === 0 ? '' : (d > 0 ? 'mejoro' : 'empeoro')}" cx="${f(p[0])}" cy="${f(p[1])}" r="2.6"/>`;
  });
  const a = pts[0], b = pts[pts.length - 1];
  const fill = cls === 'up' ? 'var(--ok-txt)' : (cls === 'dn' ? 'var(--mal-txt)' : '#6f8695');
  const [y1, y2] = posicionesNumeros(pts, txtIni || '', txt);
  const v1 = txtIni ? `<text class="v1" x="${f(a[0])}" y="${f(y1)}" text-anchor="middle">${txtIni}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Incautación de cocaína ${txt}">${lineas}${medios}` +
         `<circle class="pt" cx="${f(a[0])}" cy="${f(a[1])}" r="3.2"/>` +
         `<circle class="fin" cx="${f(b[0])}" cy="${f(b[1])}" r="4.2"/>` +
         v1 +
         `<text class="v2" x="${f(b[0] + 8)}" y="${f(y2)}" text-anchor="end" style="fill:${fill}">${txt}</text>` +
         `<text class="lbl-mes" x="${f(a[0])}" y="94" text-anchor="start">${nombreMes(mesIni)}</text>` +
         `<text class="lbl-mes" x="${f(b[0])}" y="94" text-anchor="end">${nombreMes(mesFin)}</text></svg>`;
}

/* Clase de color y texto de la variación */
const clasePct = pct => pct > 0 ? 'up' : (pct < 0 ? 'dn' : 'eq');   // sube = ámbar (mejora), baja = gris
const txtTon = v => fmt(v, 1, true) + ' t';   // toneladas con 1 decimal
const textoPct = pct => (pct > 0 ? '+' : '') + fmt(pct, 1, true) + ' %';

function renderizarNarco(data) {
  const items = data && data.dimensiones && data.dimensiones.componentes && data.dimensiones.componentes.items;
  const sp = document.getElementById('sparkNarco');
  if (!Array.isArray(items) || !sp) return;

  const porCodigo = c => items.find(x => x.codigo === c);
  const resumen = [];

  /* Principal: Cocaína (línea + variación) */
  const pri = porCodigo(NARCO.principal.codigo);
  if (!pri) return;
  const serie = (pri.serie_12m || []).slice(-N_PUNTOS).map(r => ({ mes: r.mes, v: parseFloat(r.valor), p: parseFloat(r.var_ref_pct) })).filter(r => !isNaN(r.v));
  const vals = serie.map(r => r.v);
  const pctPri = parseFloat(pri.var_ref_pct);
  if (vals.length < 3 || isNaN(pctPri)) return;
  resumen.push(`${NARCO.principal.etiqueta} ${txtTon(vals[vals.length - 1])} (${textoPct(pctPri)} vs. promedio 12 meses)`);

  const principal = `<div class="nv-main" title="Toneladas incautadas por mes. El color indica la variación vs. el promedio de los 12 meses previos">
      <span class="nv-lbl">${NARCO.principal.etiqueta}</span>
      ${miniSparkline(vals, txtTon(vals[vals.length - 1]), clasePct(pctPri), serie[0].mes, serie[serie.length - 1].mes, txtTon(vals[0]))}
    </div>`;

  sp.innerHTML = `<div class="nv">${principal}</div>`;

  const card = document.getElementById('cardNarco');
  if (card) card.setAttribute('aria-label', `Narcotráfico (${data.periodo.etiqueta}): ${resumen.join(', ')}`);
}

/* =========================================================
   Publicidad: 1 solo espacio (lee ads.json)
   ========================================================= */
(function () {
  const MOVIL = '(max-width:767px), (max-width:850px) and (orientation:portrait)';

  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('adWrap');
    const cont = document.getElementById('adA');
    if (!wrap || !cont) return;

    fetch(`data/ads.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(cfg => {
        const a = cfg.anuncio || (cfg.espacio1 && cfg.espacio1[0]);
        if (!a || !a.desktop) { wrap.hidden = true; return; }
        cont.replaceChildren(crearAnuncio(a));
        cont.hidden = false;
        wrap.hidden = false;
      })
      .catch(err => console.error('Error publicidad:', err));
  });

  function crearAnuncio(a) {
    const pic = document.createElement('picture');
    if (a.mobile) {
      const src = document.createElement('source');
      src.media = MOVIL;
      src.srcset = a.mobile;
      pic.appendChild(src);
    }
    const img = document.createElement('img');
    img.src = a.desktop;
    img.alt = a.alt || 'Publicidad';
    img.decoding = 'async';
    pic.appendChild(img);

    if (!a.enlace) return pic;
    const link = document.createElement('a');
    link.href = a.enlace;
    link.target = '_blank';
    link.rel = 'sponsored noopener';
    link.appendChild(pic);
    return link;
  }
})();