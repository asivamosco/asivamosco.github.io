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
  { id: 'Desempleo', archivo: 'desempleo_historico_dane.json', campo: 'tasa_desempleo', dec: 1, subeEsMalo: true },
  { id: 'Seguridad', archivo: 'seguridad_historico.json',      campo: 'indice',         dec: 1, subeEsMalo: true },

  // --- Ámbito nacional ---
  { id: 'Economia', campo: 'pib_anual', dec: 1, subeEsMalo: false,
    datos: [ { mes: 'Abril', pib_anual: 1.6 }, { mes: 'Mayo', pib_anual: 1.9 }, { mes: 'Junio', pib_anual: 2.1 }, { mes: 'Julio', pib_anual: 2.5 }, { mes: 'Agosto', pib_anual: 2.8 } ] },
  // Contención de cocaína (ICC): generado por load_cocaina.py. Más contención = mejor.
  { id: 'Narco', archivo: 'cocaina_historico.json', campo: 'icc_score', dec: 1, subeEsMalo: false },
  { id: 'Corrupcion', campo: 'denuncias', dec: 0, subeEsMalo: true,
    datos: [ { mes: 'Abril', denuncias: 1198 }, { mes: 'Mayo', denuncias: 1235 }, { mes: 'Junio', denuncias: 1210 }, { mes: 'Julio', denuncias: 1284 }, { mes: 'Agosto', denuncias: 1276 } ] }
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

/* Truncamiento estricto a 'dec' decimales sin redondear */
function fmt(v, dec) {
  const factor = Math.pow(10, dec);
  let s = (Math.trunc(v * factor) / factor).toFixed(dec);
  if (dec === 0) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s;
}

/* Sparkline SVG: ancho completo (12 a 148) y v1 centrado exactamente arriba del punto inicial */
function sparkline(vals, dec, subeEsMalo, mesIni, mesFin, uid) {
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
  const defs = `<defs>${grad('ok', 'var(--ok)', .38)}${grad('mal', 'var(--mal)', .38)}${grad('neu', '#d9f4ff', .22)}</defs>`;

  const a = pts[0], b = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    ${defs}${areas}${paths}${medios}
    <circle class="pt" cx="${a[0]}" cy="${a[1].toFixed(1)}" r="3.2"/>
    <circle class="fin" cx="${b[0]}" cy="${b[1].toFixed(1)}" r="4.2"/>
    <text class="v1" x="${a[0]}" y="${(a[1] - 10).toFixed(1)}" text-anchor="middle">${fmt(vals[0], dec)}</text>
    <text class="v2" x="${b[0] + 8}" y="${(b[1] - 9).toFixed(1)}" text-anchor="end">${fmt(vals[vals.length - 1], dec)}</text>
    <text class="lbl-mes" x="${a[0]}" y="94" text-anchor="start">${mesCapitalizado(mesIni)}</text>
    <text class="lbl-mes" x="${b[0]}" y="94" text-anchor="end">${mesCapitalizado(mesFin)}</text>
  </svg>`;
}

/* ---------- Render de una tarjeta ---------- */
function renderizarIndicador(cfg, data) {
  if (!Array.isArray(data) || data.length < 3) return;

  const serie = data.slice(-N_PUNTOS)
    .map(r => ({ mes: r.mes, v: parseFloat(r[cfg.campo]) }))
    .filter(r => !isNaN(r.v));
  if (serie.length < 3) return;
  const vals = serie.map(r => r.v);

  const $ = id => document.getElementById(id + cfg.id);
  const sp = $('spark');
  if (sp) sp.innerHTML = sparkline(vals, cfg.dec, cfg.subeEsMalo, serie[0].mes, serie[serie.length - 1].mes, cfg.id);
  
  const card = document.getElementById(`card${cfg.id}`);
  if (card) {
    const titulo = card.querySelector('h2').innerText;
    card.setAttribute('aria-label', `${titulo}: último valor ${fmt(vals[vals.length - 1], cfg.dec)}`);
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