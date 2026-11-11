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
  // Incautación de cocaína: generado por load_cocaina.py. Campo 'total' en kg (Colombia + exterior); se muestra en toneladas (escala 1000). Más incautación = mejor.
  { id: 'Narco', archivo: 'cocaina_historico.json', campo: 'total', escala: 1000, dec: 1, subeEsMalo: false },
  // Terrorismo: más hechos = peor (rojo al subir)
  { id: 'Terrorismo', archivo: 'terrorismo_historico.json', campo: 'valor', dec: 1, subeEsMalo: true }
];

document.addEventListener('DOMContentLoaded', () => {
  INDICADORES.forEach(cfg => {
    if (cfg.datos) renderizarIndicador(cfg, cfg.datos);
    else cargarIndicador(cfg);
  });
});

/* ---------- Carga de datos ---------- */
function cargarIndicador(cfg) {
  fetch(`${cfg.archivo}?v=${Date.now()}`, { cache: 'no-store' })
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
   Publicidad: 1 solo espacio (lee ads.json)
   ========================================================= */
(function () {
  const MOVIL = '(max-width:767px), (max-width:850px) and (orientation:portrait)';

  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('adWrap');
    const cont = document.getElementById('adA');
    if (!wrap || !cont) return;

    fetch(`ads.json?v=${Date.now()}`, { cache: 'no-store' })
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