/* =========================================================
   Así Vamos · Estado de la Nación
   6 indicadores con tendencia de los últimos 5 datos disponibles.
   Cada indicador usa sus propios 5 últimos meses (según la fuente).
   Tendencia = pendiente de regresión lineal / promedio, por mes.
   ========================================================= */

const N_PUNTOS = 5;        // meses mostrados
const UMBRAL_ESTABLE = 0.005; // 0,5 % mensual
const RANGO_MIN = 0.10;    // la escala Y nunca muestra menos del 10 % del promedio

const INDICADORES = [
  // --- Impacto cotidiano (datos reales en JSON) ---
  { id: 'Inflacion', archivo: 'inflacion_anual_dane.json',      campo: 'var_anual',      dec: 2, subeEsMalo: true },
  { id: 'Desempleo', archivo: 'desempleo_historico_dane.json', campo: 'tasa_desempleo', dec: 1, subeEsMalo: true },
  { id: 'Seguridad', archivo: 'seguridad_historico.json',      campo: 'indice',         dec: 1, subeEsMalo: true },

  // --- Ámbito nacional (DATOS DE EJEMPLO inventados; reemplazar por archivo JSON) ---
  { id: 'Economia', campo: 'pib_anual', dec: 1, subeEsMalo: false,
    datos: [ { mes: 'Abril', pib_anual: 1.6 }, { mes: 'Mayo', pib_anual: 1.9 }, { mes: 'Junio', pib_anual: 2.1 }, { mes: 'Julio', pib_anual: 2.5 }, { mes: 'Agosto', pib_anual: 2.8 } ] },
  { id: 'Narco', campo: 'ataques', dec: 0, subeEsMalo: true,
    datos: [ { mes: 'Mayo', ataques: 44 }, { mes: 'Junio', ataques: 51 }, { mes: 'Julio', ataques: 52 }, { mes: 'Agosto', ataques: 39 }, { mes: 'Septiembre', ataques: 47 } ] },
  { id: 'Corrupcion', campo: 'denuncias', dec: 0, subeEsMalo: true,
    datos: [ { mes: 'Abril', denuncias: 1198 }, { mes: 'Mayo', denuncias: 1235 }, { mes: 'Junio', denuncias: 1210 }, { mes: 'Julio', denuncias: 1284 }, { mes: 'Agosto', denuncias: 1276 } ] }
];

/* Flecha del veredicto: ▲ al alza · ▼ a la baja · ▬ estable */
const FORMAS = {
  sube:  '<polygon points="6,0.5 12,11.5 0,11.5"/>',
  baja:  '<polygon points="0,0.5 12,0.5 6,11.5"/>',
  igual: '<rect x="0" y="4" width="12" height="4"/>'
};

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
const mesCorto = m => String(m || '').trim().toLowerCase().substring(0, 3);

/* Truncamiento estricto a 'dec' decimales sin redondear */
function fmt(v, dec) {
  const factor = Math.pow(10, dec);
  let s = (Math.trunc(v * factor) / factor).toFixed(dec);
  if (dec === 0) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s;
}

/* Pendiente de regresión lineal por mínimos cuadrados, normalizada por el promedio */
function tendenciaNormalizada(y) {
  const n = y.length;
  const xm = (n - 1) / 2;
  const ym = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  y.forEach((v, i) => { num += (i - xm) * (v - ym); den += (i - xm) * (i - xm); });
  return ym === 0 ? 0 : (num / den) / Math.abs(ym);
}

/* Sparkline SVG: línea neutra, primer valor pequeño, último grande */
function sparkline(vals, dec) {
  const W = 160, H = 74, x0 = 12, x1 = 148, yTop = 30, yBot = 66;
  const prom = vals.reduce((a, b) => a + b, 0) / vals.length;
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < Math.abs(prom) * RANGO_MIN) {
    const c = (max + min) / 2, h = Math.abs(prom) * RANGO_MIN / 2;
    min = c - h; max = c + h;
  }
  const pts = vals.map((v, i) => [x0 + i * (x1 - x0) / (vals.length - 1), yBot - (v - min) / (max - min) * (yBot - yTop)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const medios = pts.slice(1, -1).map(p => `<circle class="pt" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4"/>`).join('');
  const a = pts[0], b = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path class="ln" d="${d}"/>${medios}
    <circle class="pt" cx="${a[0]}" cy="${a[1].toFixed(1)}" r="3"/>
    <circle class="fin" cx="${b[0]}" cy="${b[1].toFixed(1)}" r="4"/>
    <text class="v1" x="${a[0] - 4}" y="${(a[1] - 8).toFixed(1)}" text-anchor="start">${fmt(vals[0], dec)}</text>
    <text class="v2" x="${b[0] + 8}" y="${(b[1] - 9).toFixed(1)}" text-anchor="end">${fmt(vals[vals.length - 1], dec)}</text>
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

  const t = tendenciaNormalizada(vals);
  let dir = 'igual', texto = 'estable', tono = 'neu';
  if (Math.abs(t) >= UMBRAL_ESTABLE) {
    dir = t > 0 ? 'sube' : 'baja';
    texto = t > 0 ? 'al alza' : 'a la baja';
    const malo = cfg.subeEsMalo ? t > 0 : t < 0;
    tono = malo ? 'empeoro' : 'mejoro';
  }

  const $ = id => document.getElementById(id + cfg.id);
  const tv = $('tend');
  if (tv) {
    tv.className = `tv ${tono}`;
    tv.innerHTML = `<svg viewBox="0 0 12 12" aria-hidden="true">${FORMAS[dir]}</svg>${texto}`;
  }
  const sp = $('spark');
  if (sp) sp.innerHTML = sparkline(vals, cfg.dec);
  const m1 = $('mesIni'), m2 = $('mesFin');
  if (m1) m1.innerText = mesCorto(serie[0].mes);
  if (m2) m2.innerText = mesCorto(serie[serie.length - 1].mes);
  const card = document.getElementById(`card${cfg.id}`);
  if (card) card.setAttribute('aria-label', `${card.querySelector('h2').innerText}: tendencia ${texto}`);
}

/* =========================================================
   Publicidad: 1 solo espacio (lee ads.json)
   desktop: 970x90 · mobile: 320x100. Sin rotación.
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
