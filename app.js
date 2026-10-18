/* =========================================================
   Así Vamos · Estado de la Nación
   Tarjetas "glass" con mini-gráfica SVG (sin Chart.js)
   ========================================================= */

/* Salud aún no tiene JSON: valores de ejemplo (últimos 12 meses).
   Cuando exista el archivo, basta con reemplazar este arreglo
   o cargarlo con cargarIndicador() como los demás. */
const SALUD_EJEMPLO = [
  { mes: 'Noviembre',  valor: 91.2 }, { mes: 'Diciembre', valor: 91.4 },
  { mes: 'Enero',      valor: 91.9 }, { mes: 'Febrero',   valor: 91.6 },
  { mes: 'Marzo',      valor: 92.3 }, { mes: 'Abril',     valor: 92.5 },
  { mes: 'Mayo',       valor: 93.0 }, { mes: 'Junio',     valor: 92.8 },
  { mes: 'Julio',      valor: 93.4 }, { mes: 'Agosto',    valor: 93.7 },
  { mes: 'Septiembre', valor: 93.9 }, { mes: 'Octubre',   valor: 94.1 }
];

/* Configuración de cada indicador.
   subeEsMalo: true  -> si el valor sube, EMPEORÓ (inflación, desempleo, seguridad)
               false -> si el valor sube, MEJORÓ  (salud)                            */
const INDICADORES = [
  { id: 'Inflacion', archivo: 'inflacion_anual_dane.json',  campo: 'var_anual',     dec: 2, sufijo: '%', subeEsMalo: true  },
  { id: 'Desempleo', archivo: 'desempleo_historico_dane.json', campo: 'tasa_desempleo', dec: 1, sufijo: '%', subeEsMalo: true  },
  { id: 'Seguridad', archivo: 'seguridad_historico.json',   campo: 'indice',        dec: 1, sufijo: '%', subeEsMalo: true  },
  { id: 'Salud',     datos: SALUD_EJEMPLO,                  campo: 'valor',         dec: 1, sufijo: '%', subeEsMalo: false }
];

document.addEventListener('DOMContentLoaded', () => {
  INDICADORES.forEach(cfg => {
    if (cfg.datos) renderizarIndicador(cfg, cfg.datos);
    else cargarIndicador(cfg);
  });
});

/* ---------- Carga de datos ---------- */
function cargarIndicador(cfg) {
  const url = `${cfg.archivo}?v=${Date.now()}`;
  fetch(url, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => renderizarIndicador(cfg, data))
    .catch(err => console.error(`Error ${cfg.id}:`, err));
}

/* ---------- Utilidades ---------- */
function capitalizar(txt) {
  const t = String(txt || '').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function mesCorto(mes) {
  return capitalizar(mes).substring(0, 3);
}

/* Etiqueta del eje: "Nov 25" si el dato trae año, "Nov" si no. */
function etiquetaEje(d) {
  const corto = mesCorto(d.mes);
  let anio = d.anio ?? d['año'] ?? d.ano ?? d.year;
  if (anio === undefined && d.fecha) anio = String(d.fecha).substring(0, 4);
  return anio !== undefined ? `${corto} ${String(anio).slice(-2)}` : corto;
}

/* ---------- Render de una tarjeta ---------- */
function renderizarIndicador(cfg, data) {
  if (!Array.isArray(data) || data.length < 2) return;

  const serie = data.slice(-12);
  const ultimo = data[data.length - 1];
  const penultimo = data[data.length - 2];
  const actual = parseFloat(ultimo[cfg.campo]);
  const anterior = parseFloat(penultimo[cfg.campo]);
  if (isNaN(actual) || isNaN(anterior)) return;

  const empeoro = cfg.subeEsMalo ? actual > anterior : actual < anterior;
  const fmt = v => `${v.toFixed(cfg.dec)}${cfg.sufijo}`;

  const set = (suffix, txt) => {
    const el = document.getElementById(suffix + cfg.id);
    if (el) el.innerText = txt;
  };

  set('kpi', fmt(actual));
  set('labelMes', capitalizar(ultimo.mes));
  set('estado', empeoro ? 'Empeoró' : 'Mejoró');
  set('axis', '');
  const prev = document.getElementById(`kpi${cfg.id}Anterior`);
  if (prev) prev.innerText = `${mesCorto(penultimo.mes).toUpperCase()}: ${fmt(anterior)}`;

  const card = document.getElementById(`card${cfg.id}`);
  if (card) card.className = `card glass ${empeoro ? 'empeoro' : 'mejoro'}`;

  const valores = serie.map(d => parseFloat(d[cfg.campo]));
  const chart = document.getElementById(`chart${cfg.id}`);
  if (chart) chart.innerHTML = construirSparkline(valores, fmt);

  const axis = document.getElementById(`axis${cfg.id}`);
  if (axis) {
    axis.innerHTML = `<span>${etiquetaEje(serie[0])}</span><span>${etiquetaEje(serie[serie.length - 1])}</span>`;
  }
}

/* ---------- Mini-gráfica SVG (primer y último punto con etiqueta) ---------- */
function construirSparkline(valores, fmt) {
  const W = 200, H = 64, TOP = 18, BAJO = 46;
  const n = valores.length;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = (max - min) || 1;

  const pts = valores.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * W : 0,
    y: BAJO - ((v - min) / rango) * (BAJO - TOP)
  }));

  const linea = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${linea} ${W},${H} 0,${H}`;

  const primero = pts[0];
  const ultimo = pts[n - 1];
  const pct = y => ((y / H) * 100).toFixed(1);

  /* La etiqueta va arriba del punto si está en la mitad superior, abajo si no */
  const etiqueta = (p, valor, alinearDerecha) => {
    const arriba = (p.y / H) < 0.5;
    const top = arriba ? `calc(${pct(p.y)}% - 8px)` : `calc(${pct(p.y)}% + 9px)`;
    const tx = alinearDerecha ? '-100%' : '0';
    const ty = arriba ? '-100%' : '0';
    const left = alinearDerecha ? '100' : '0';
    return `<span class="mm" style="left:${left}%;top:${top};transform:translate(${tx},${ty})">${fmt(valor)}</span>`;
  };

  return `
    <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="overflow:visible">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7cc4ee" stop-opacity=".32"/>
          <stop offset="1" stop-color="#7cc4ee" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${area}" fill="url(#areaGrad)"/>
      <polyline points="${linea}" fill="none" stroke="#7cc4ee" stroke-width="2" vector-effect="non-scaling-stroke"/>
    </svg>
    <span class="dot" style="left:0%;top:${pct(primero.y)}%"></span>
    ${etiqueta(primero, valores[0], false)}
    <span class="dot cur" style="left:100%;top:${pct(ultimo.y)}%"></span>
    ${etiqueta(ultimo, valores[n - 1], true)}`;
}
