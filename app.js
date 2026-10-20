/* =========================================================
   Así Vamos · Estado de la Nación
   Tarjetas "glass" con mini-gráfica SVG (sin Chart.js)
   ========================================================= */

const INDICADORES = [
  { id: 'Inflacion', archivo: 'inflacion_anual_dane.json',      campo: 'var_anual',      dec: 2, sufijo: '%', subeEsMalo: true  },
  { id: 'Desempleo', archivo: 'desempleo_historico_dane.json', campo: 'tasa_desempleo', dec: 1, sufijo: '%', subeEsMalo: true  },
  { id: 'Seguridad', archivo: 'seguridad_historico.json',      campo: 'indice',         dec: 1, sufijo: '',  subeEsMalo: true  },
  { id: 'Salud',     archivo: 'salud_historico.json',          campo: 'indice',         dec: 1, sufijo: '',  subeEsMalo: true  }
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

const MESES_COMPLETOS = {
  'ene': 'Enero', 'feb': 'Febrero', 'mar': 'Marzo', 'abr': 'Abril',
  'may': 'Mayo', 'jun': 'Junio', 'jul': 'Julio', 'ago': 'Agosto',
  'sep': 'Septiembre', 'oct': 'Octubre', 'nov': 'Noviembre', 'dic': 'Diciembre'
};

function obtenerMesCompleto(nombreMes) {
  const limpio = String(nombreMes || '').trim().toLowerCase();
  const corto = limpio.substring(0, 3);
  return MESES_COMPLETOS[corto] || capitalizar(nombreMes);
}

function etiquetaEje(d) {
  return obtenerMesCompleto(d.mes);
}

/* ---------- Render de una tarjeta ---------- */
function renderizarIndicador(cfg, data) {
  if (!Array.isArray(data) || data.length < 2) return;

  const serie = data.slice(-6);
  const ultimo = data[data.length - 1];
  const penultimo = data[data.length - 2];
  
  const actual = parseFloat(ultimo[cfg.campo]);
  const anterior = parseFloat(penultimo[cfg.campo]);
  if (isNaN(actual) || isNaN(anterior)) return;

  const empeoro = cfg.subeEsMalo ? actual > anterior : actual < anterior;
  
  // Truncamiento estricto a 'dec' decimales sin redondear
  const fmt = v => {
    const factor = Math.pow(10, cfg.dec);
    const truncado = Math.trunc(v * factor) / factor;
    return `${truncado.toFixed(cfg.dec)}${cfg.sufijo}`;
  };

  const set = (suffix, txt) => {
    const el = document.getElementById(suffix + cfg.id);
    if (el) el.innerText = txt;
  };

  set('kpi', fmt(actual));
  set('labelMes', obtenerMesCompleto(ultimo.mes));
  set('estado', empeoro ? 'AUMENTÓ' : 'DISMINUYÓ');
  set('axis', '');
  
  const prev = document.getElementById(`kpi${cfg.id}Anterior`);
  if (prev) prev.innerText = `${obtenerMesCompleto(penultimo.mes)}: ${fmt(anterior)}`;

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

/* ---------- Mini-gráfica SVG ---------- */
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

/* =========================================================
   Publicidad rotativa: 2 espacios (lee ads.json)
   - espacio1 -> #adA · espacio2 -> #adB. Cada anuncio: imagen desktop (468x60) y móvil (320x50).
   - Cada espacio empieza en un anuncio al azar y cambia cada "segundos" (mínimo 5, por defecto 20);
     el segundo espacio cambia a mitad de intervalo para que no cambien los dos a la vez.
   - Se pausa con el mouse encima, con el foco, o si la pestaña está oculta.
   - Un espacio sin anuncios queda oculto; si no hay ninguno, se oculta todo el bloque.
   ========================================================= */
(function () {
  const MOVIL = '(max-width:767px), (max-width:850px) and (orientation:portrait)';

  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('adWrap');
    if (!wrap) return;

    fetch(`ads.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(cfg => {
        const ms = Math.max(5, Number(cfg.segundos) || 20) * 1000;
        const a = iniciar(document.getElementById('adA'), cfg.espacio1, ms, 0);
        const b = iniciar(document.getElementById('adB'), cfg.espacio2, ms, ms / 2);
        wrap.hidden = !(a || b);
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

  // devuelve true si el espacio quedó activo
  function iniciar(cont, anuncios, ms, retraso) {
    if (!cont) return false;
    const lista = (anuncios || []).filter(a => a && a.desktop);
    if (!lista.length) { cont.hidden = true; return false; }

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const esMovil = window.matchMedia(MOVIL).matches;
    let actual = Math.floor(Math.random() * lista.length);
    let timer = null, espera = null;

    // precarga solo la variante que corresponde a este dispositivo
    lista.forEach(a => { new Image().src = esMovil && a.mobile ? a.mobile : a.desktop; });

    const mostrar = (n, animar) => {
      const poner = () => {
        cont.replaceChildren(crearAnuncio(lista[n]));
        cont.classList.remove('cambia');
      };
      if (animar && !sinMovimiento) {
        cont.classList.add('cambia');
        setTimeout(poner, 350);
      } else {
        poner();
      }
    };

    const girar = () => {
      actual = (actual + 1) % lista.length;
      mostrar(actual, true);
    };
    const arrancar = (primeraVez) => {
      if (lista.length < 2 || timer || espera || document.hidden) return;
      const empezar = () => { espera = null; timer = setInterval(girar, ms); };
      if (primeraVez && retraso) espera = setTimeout(empezar, retraso);
      else empezar();
    };
    const parar = () => { clearInterval(timer); clearTimeout(espera); timer = espera = null; };

    mostrar(actual, false);
    cont.hidden = false;
    arrancar(true);

    cont.addEventListener('mouseenter', parar);
    cont.addEventListener('mouseleave', () => arrancar(false));
    cont.addEventListener('focusin', parar);
    cont.addEventListener('focusout', () => arrancar(false));
    document.addEventListener('visibilitychange', () => (document.hidden ? parar() : arrancar(false)));
    return true;
  }
})();
