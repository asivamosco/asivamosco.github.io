document.addEventListener("DOMContentLoaded", () => {
    cargarDatosInflacion();
    cargarDatosDesempleo();
    cargarDatosSeguridad();
    iniciarCarruselMovil();
});

/* ---------- Carrusel móvil: sincroniza pestañas <-> tarjetas ---------- */
function iniciarCarruselMovil() {
    const grid = document.querySelector('.dashboard-grid');
    const tabs = Array.from(document.querySelectorAll('.nav-tab'));
    if (!grid || !tabs.length) return;

    const cards = Array.from(grid.querySelectorAll('.kpi-card'));

    function actualizarTabs() {
        const g = grid.getBoundingClientRect();
        const centro = g.left + g.width / 2;
        let cardActiva = cards[0];
        let menorDistancia = Infinity;

        cards.forEach(card => {
            const r = card.getBoundingClientRect();
            const distancia = Math.abs(r.left + r.width / 2 - centro);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                cardActiva = card;
            }
        });

        tabs.forEach(tab => {
            const card = document.getElementById(tab.dataset.target);
            const esRoja = card && card.classList.contains('card-red');
            const esActiva = card === cardActiva;

            tab.classList.remove('tab-red', 'tab-green', 'active-red', 'active-green');
            tab.removeAttribute('aria-current');
            tab.classList.add(esRoja ? 'tab-red' : 'tab-green');

            if (esActiva) {
                tab.classList.add(esRoja ? 'active-red' : 'active-green');
                tab.setAttribute('aria-current', 'true');
            }
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const card = document.getElementById(tab.dataset.target);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    });

    let ticking = false;
    grid.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            actualizarTabs();
            ticking = false;
        });
    }, { passive: true });

    window.addEventListener('resize', actualizarTabs);
    window.actualizarTabsMovil = actualizarTabs;
    actualizarTabs();
}

/* ---------- 1. INFLACIÓN ---------- */
function cargarDatosInflacion() {
    const cacheBuster = new Date().getTime();
    fetch(`inflacion_anual_dane.json?v=${cacheBuster}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => renderizarCommandCenterInflacion(data))
    .catch(err => console.error("Error inflación:", err));
}

function renderizarCommandCenterInflacion(data) {
    if (!data || data.length < 2) return;
    const ultimo = data[data.length - 1];
    const penultimo = data[data.length - 2];
    const actual = parseFloat(ultimo.var_anual);
    const anterior = parseFloat(penultimo.var_anual);

    document.getElementById('kpiInflacion').innerText = `${actual.toFixed(2)}%`;
    document.getElementById('kpiInflacionAnterior').innerText = `${anterior.toFixed(2)}%`;
    document.getElementById('labelMesInflacion').innerText = ultimo.mes;

    const card = document.getElementById('cardInflacion');
    const verdict = document.getElementById('verdictStatusInflacion');
    const empeoro = actual > anterior;

    card.className = empeoro ? "kpi-card card-red" : "kpi-card card-green";
    verdict.innerHTML = empeoro ? 
        `<svg class="kpi-status-thumb thumb-down" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg><span>EMPEORÓ</span>` :
        `<svg class="kpi-status-thumb thumb-up" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg><span>MEJORÓ</span>`;

    if (window.actualizarTabsMovil) window.actualizarTabsMovil();
    renderizarGrafica('chartInflacion', data.slice(-6).map(d => d.mes.substring(0, 3)), data.slice(-6).map(d => parseFloat(d.var_anual)), empeoro ? '#e61c34' : '#00d2be', 'rgba(255,255,255,0.12)', 'miGraficaIPC', 'IPC (%)');
}

/* ---------- 2. DESEMPLEO ---------- */
function cargarDatosDesempleo() {
    const cacheBuster = new Date().getTime();
    fetch(`desempleo_historico_dane.json?v=${cacheBuster}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => renderizarCommandCenterDesempleo(data))
    .catch(err => console.error("Error desempleo:", err));
}

function renderizarCommandCenterDesempleo(data) {
    if (!data || data.length < 2) return;
    const ultimo = data[data.length - 1];
    const penultimo = data[data.length - 2];
    const actual = parseFloat(ultimo.tasa_desempleo);
    const anterior = parseFloat(penultimo.tasa_desempleo);

    document.getElementById('kpiDesempleo').innerText = `${actual.toFixed(1)}%`;
    document.getElementById('kpiDesempleoAnterior').innerText = `${anterior.toFixed(1)}%`;
    document.getElementById('labelMesDesempleo').innerText = ultimo.mes;

    const card = document.getElementById('cardDesempleo');
    const verdict = document.getElementById('verdictStatusDesempleo');
    const empeoro = actual > anterior;

    card.className = empeoro ? "kpi-card card-red" : "kpi-card card-green";
    verdict.innerHTML = empeoro ? 
        `<svg class="kpi-status-thumb thumb-down" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg><span>EMPEORÓ</span>` :
        `<svg class="kpi-status-thumb thumb-up" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg><span>MEJORÓ</span>`;

    if (window.actualizarTabsMovil) window.actualizarTabsMovil();
    renderizarGrafica('chartDesempleo', data.slice(-6).map(d => d.mes.substring(0, 3)), data.slice(-6).map(d => parseFloat(d.tasa_desempleo)), empeoro ? '#e61c34' : '#00d2be', 'rgba(255,255,255,0.12)', 'miGraficaDesempleo', 'Desempleo (%)');
}

/* ---------- 3. SEGURIDAD (ESTÁNDAR INFLACIÓN: ÍNDICE Y COMPARACIÓN MoM) ---------- */
function cargarDatosSeguridad() {
    const cacheBuster = new Date().getTime();
    fetch(`seguridad_historico.json?v=${cacheBuster}`, { cache: 'no-store' })
    .then(res => res.json())
    .then(data => renderizarCommandCenterSeguridad(data))
    .catch(err => console.error("Error seguridad:", err));
}

function renderizarCommandCenterSeguridad(data) {
    if (!data || data.length < 2) return;

    const ultimo = data[data.length - 1];       // Agosto 2026
    const penultimo = data[data.length - 2];   // Julio 2026

    const actual = parseFloat(ultimo.indice);
    const anterior = parseFloat(penultimo.indice);

    // Lógica idéntica a inflación: Si el índice actual es mayor al anterior, empeoró. Si es menor, mejoró.
    const empeoro = actual > anterior;

    // 1. KPI Principal: Muestra el valor del índice actual (ej: 58.0%)
    const kpiElem = document.getElementById('kpiSeguridad');
    if (kpiElem) {
        kpiElem.innerText = `${actual.toFixed(1)}%`;
    }
    
    // 2. Subtítulo: Muestra el mes anterior con su índice (ej: JUL: 70.9%)
    const elemAnterior = document.getElementById('kpiSeguridadAnterior');
    if (elemAnterior) {
        const mesCortoPenultimo = penultimo.mes.substring(0, 3).toUpperCase();
        elemAnterior.innerText = `${mesCortoPenultimo}: ${anterior.toFixed(1)}%`;
    }

    // 3. Etiqueta del Mes Principal
    const labelMes = document.getElementById('labelMesSeguridad');
    if (labelMes && ultimo.mes) {
        labelMes.innerText = `${ultimo.mes.toUpperCase()}`;
    }

    // 4. Tarjeta y Veredicto dinámico
    const card = document.getElementById('cardSeguridad');
    const verdict = document.getElementById('verdictStatusSeguridad');

    if (card && verdict) {
        card.className = empeoro ? "kpi-card card-red" : "kpi-card card-green";
        verdict.innerHTML = empeoro ? 
            `<svg class="kpi-status-thumb thumb-down" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg><span>EMPEORÓ</span>` :
            `<svg class="kpi-status-thumb thumb-up" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg><span>MEJORÓ</span>`;
    }

    if (window.actualizarTabsMovil) window.actualizarTabsMovil();

    // 5. Gráfica de los últimos 6 meses usando los valores reales del índice
    const ultimos6 = data.slice(-6);
    const labels = ultimos6.map(d => `${d.mes.substring(0, 3)}`);
    const valores = ultimos6.map(d => parseFloat(d.indice));

    renderizarGraficaSeguridad('chartSeguridad', labels, valores, empeoro ? '#e61c34' : '#00d2be', 'rgba(255,255,255,0.12)', 'miGraficaSeguridad', 'Índice (%)');
}

function renderizarGraficaSeguridad(canvasId, labels, valores, borderColor, bgColor, globalVarName, datasetLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const esMovil = window.innerWidth <= 600;
    const tamFuente = esMovil ? 13 : 11;
    
    if (window[globalVarName]) window[globalVarName].destroy();

    window[globalVarName] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: datasetLabel,
                data: valores,
                borderColor: borderColor,
                backgroundColor: bgColor,
                borderWidth: esMovil ? 3 : 2.5,
                pointRadius: esMovil ? 5.5 : 4.5,
                pointBackgroundColor: '#ffffff',
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 15, right: 15, top: 25, bottom: 0 }
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                y: { display: false, grace: '30%' },
                x: { 
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: tamFuente, family: 'JetBrains Mono', weight: '700' },
                        callback: function(val, idx, ticks) {
                            return (idx === 0 || idx === ticks.length - 1) ? this.getLabelForValue(val) : '';
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'etiquetasValoresSeguridad',
            afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = `bold ${tamFuente}px "JetBrains Mono", monospace`;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';

                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((point, index) => {
                        const valor = Number(dataset.data[index]);
                        if (!isNaN(valor)) {
                            ctx.fillText(`${valor.toFixed(1)}%`, point.x, point.y - 10);
                        }
                    });
                });
                ctx.restore();
            }
        }]
    });
}

function renderizarGrafica(canvasId, labels, valores, borderColor, bgColor, globalVarName, datasetLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const esMovil = window.innerWidth <= 600;
    const tamFuente = esMovil ? 14 : 12;
    
    if (window[globalVarName]) window[globalVarName].destroy();

    window[globalVarName] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: datasetLabel,
                data: valores,
                borderColor: borderColor,
                backgroundColor: bgColor,
                borderWidth: esMovil ? 3 : 2.5,
                pointRadius: esMovil ? 5.5 : 4.5,
                pointBackgroundColor: '#ffffff',
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 15, right: 15, top: 20, bottom: 0 }
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                y: { display: false, grace: '25%' },
                x: { 
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: tamFuente, family: 'JetBrains Mono', weight: '700' },
                        callback: function(val, idx, ticks) {
                            return (idx === 0 || idx === ticks.length - 1) ? this.getLabelForValue(val) : '';
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'etiquetasValores',
            afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = `bold ${tamFuente}px "JetBrains Mono", monospace`;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';

                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((point, index) => {
                        const valor = Number(dataset.data[index]);
                        if (!isNaN(valor)) {
                            ctx.fillText(valor.toFixed(1), point.x, point.y - 9);
                        }
                    });
                });
                ctx.restore();
            }
        }]
    });
}