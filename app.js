/* =========================================================
   Así Vamos · Estado de la Nación
   6 indicadores: Impacto cotidiano + Ámbito nacional
   Cada indicador tiene su propio mes (según la fuente).
   ========================================================= */

const INDICADORES = [
  // --- Impacto cotidiano (con datos reales en JSON) ---
  { id: 'Inflacion', archivo: 'inflacion_anual_dane.json',      campo: 'var_anual',      dec: 2, sufijo: '%', subeEsMalo: true  },
  { id: 'Desempleo', archivo: 'desempleo_historico_dane.json', campo: 'tasa_desempleo', dec: 1, sufijo: '%', subeEsMalo: true  },
  { id: 'Seguridad', archivo: 'seguridad_historico.json',      campo: 'indice',         dec: 1, sufijo: '',  subeEsMalo: true  },

  // --- Ámbito nacional (DATOS DE EJEMPLO inventados; reemplazar por archivo JSON) ---
  // ambar: true => la tarjeta se pinta en ámbar (estado intermedio). Al conectar datos reales,
  // reemplazar por una regla (ej. cfg.umbralAmbar) y quitar este forzado.
  { id: 'Economia', campo: 'pib_anual', dec: 1, sufijo: '%', subeEsMalo: false,
    datos: [ { mes: 'Junio', pib_anual: 2.1 }, { mes: 'Julio', pib_anual: 2.5 }, { mes: 'Agosto', pib_anual: 2.8 } ] },
  { id: 'Narco', campo: 'ataques', dec: 0, sufijo: '', subeEsMalo: true, ambar: true,
    datos: [ { mes: 'Julio', ataques: 52 }, { mes: 'Agosto', ataques: 39 }, { mes: 'Septiembre', ataques: 47 } ] },
  { id: 'Corrupcion', campo: 'denuncias', dec: 0, sufijo: '', subeEsMalo: true, ambar: true,
    datos: [ { mes: 'Junio', denuncias: 1210 }, { mes: 'Julio', denuncias: 1284 }, { mes: 'Agosto', denuncias: 1150 } ] }
];

const ETIQUETAS = { mejoro: 'FAVORABLE', empeoro: 'DESFAVORABLE', ambar: 'DESFAVORABLE' };

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
function capitalizar(txt) {
  const t = String(txt || '').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const MESES_COMPLETOS = {
  'ene': 'Enero', 'feb': 'Febrero', 'mar': 'Marzo', 'abr': 'Abril',
  'may': 'Mayo', 'jun': 'Junio', 'jul': 'Julio', 'ago': 'Agosto',
  'sep': 'Septiembre', 'oct': 'Octubre', 'nov': 'Noviembre', 'dic': 'Diciembre'
};

function obtenerMesCompleto(nombreMes) {
  const corto = String(nombreMes || '').trim().toLowerCase().substring(0, 3);
  return MESES_COMPLETOS[corto] || capitalizar(nombreMes);
}

/* ---------- Render de una tarjeta ---------- */
function renderizarIndicador(cfg, data) {
  if (!Array.isArray(data) || data.length < 2) return;

  const ultimo = data[data.length - 1];
  const penultimo = data[data.length - 2];
  const actual = parseFloat(ultimo[cfg.campo]);
  const anterior = parseFloat(penultimo[cfg.campo]);
  if (isNaN(actual) || isNaN(anterior)) return;

  const sube = actual > anterior;
  const igual = actual === anterior;
  const empeoro = cfg.subeEsMalo ? sube : actual < anterior;

  // Truncamiento estricto a 'dec' decimales sin redondear
  const fmt = v => {
    const factor = Math.pow(10, cfg.dec);
    let s = (Math.trunc(v * factor) / factor).toFixed(cfg.dec);
    if (cfg.dec === 0) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${s}${cfg.sufijo}`;
  };

  const set = (prefijo, txt) => {
    const el = document.getElementById(prefijo + cfg.id);
    if (el) el.innerText = txt;
  };

  set('kpi', fmt(actual));
  set('labelMes', obtenerMesCompleto(ultimo.mes));

  const prev = document.getElementById(`kpi${cfg.id}Anterior`);
  if (prev) prev.innerText = `${obtenerMesCompleto(penultimo.mes)}: ${fmt(anterior)}`;

  const card = document.getElementById(`card${cfg.id}`);
  const clase = cfg.ambar ? 'ambar' : (empeoro ? 'empeoro' : 'mejoro');
  if (card) card.className = `card glass ${clase}`;

  // Estado en texto, con el color de la tarjeta (el ámbar también se rotula DESFAVORABLE)
  set('estado', ETIQUETAS[clase]);
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
