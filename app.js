document.addEventListener("DOMContentLoaded", () => {
    cargarDatosInflacion();
    cargarDatosDesempleo();
    iniciarCarruselMovil();
});

/* ---------- Carrusel móvil: sincroniza pestañas <-> tarjetas ---------- */
function iniciarCarruselMovil() {
    const grid = document.querySelector('.dashboard-grid');
    const tabs = Array.from(document.querySelectorAll('.nav-tab'));
    if (!grid || !tabs.length) return;

    const cards = Array.from(grid.querySelectorAll('.kpi-card'));

    // Marca la pestaña de la tarjeta que está al centro, con el color (rojo/verde) de esa tarjeta
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

            // Todas las pestañas llevan el color de su tarjeta (rojo = empeoró, verde = mejoró)
            tab.classList.add(esRoja ? 'tab-red' : 'tab-green');

            if (esActiva) {
                tab.classList.add(esRoja ? 'active-red' : 'active-green');
                tab.setAttribute('aria-current', 'true');
            }
        });
    }

    // Toque en una pestaña -> desplaza el carrusel a esa tarjeta
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const card = document.getElementById(tab.dataset.target);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    });

    // Deslizar con el dedo -> actualiza la pestaña (throttle con rAF)
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

    // Los renders la llaman cuando una tarjeta cambia de color (rojo/verde)
    window.actualizarTabsMovil = actualizarTabs;
    actualizarTabs();
}


function cargarDatosInflacion() {
    const cacheBuster = new Date().getTime();
    
    fetch(`inflacion_anual_dane.json?v=${cacheBuster}`, { cache: 'no-store' })
    .then(response => {
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        return response.json();
    })
    .then(data => renderizarCommandCenterInflacion(data))
    .catch(error => {
        console.error("Error al cargar inflación:", error);
        document.getElementById('kpiInflacion').innerText = "Error";
    });
}

function renderizarCommandCenterInflacion(data) {
    if (!data || data.length < 2) return;
    const ultimoRegistro = data[data.length - 1];
    const penultimoRegistro = data[data.length - 2];

    const inflacionActual = parseFloat(ultimoRegistro.var_anual);
    const inflacionAnterior = parseFloat(penultimoRegistro.var_anual);

    document.getElementById('kpiInflacion').innerText = `${inflacionActual.toFixed(2)}%`;
    
    const elemAnterior = document.getElementById('kpiInflacionAnterior');
    if (elemAnterior) elemAnterior.innerText = `${inflacionAnterior.toFixed(2)}%`;

    const labelMes = document.getElementById('labelMesInflacion');
    if (labelMes && ultimoRegistro.mes) {
        labelMes.innerText = ultimoRegistro.mes;
    }

    const cardElement = document.getElementById('cardInflacion');
    const verdictStatus = document.getElementById('verdictStatusInflacion');
    
    const empeoro = inflacionActual > inflacionAnterior;

    if (cardElement && verdictStatus) {
        if (empeoro) {
            cardElement.className = "kpi-card card-red";
            verdictStatus.innerHTML = `
                <svg class="kpi-status-thumb thumb-down" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>
                <span>EMPEORÓ</span>
            `;
        } else {
            cardElement.className = "kpi-card card-green";
            verdictStatus.innerHTML = `
                <svg class="kpi-status-thumb thumb-up" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                <span>MEJORÓ</span>
            `;
        }
    }

    if (window.actualizarTabsMovil) window.actualizarTabsMovil();

    const ultimos6Meses = data.slice(-6);
    const labels = ultimos6Meses.map(d => d.mes.substring(0, 3));
    const valores = ultimos6Meses.map(d => parseFloat(d.var_anual));

    const colorTema = empeoro ? '#e61c34' : '#00d2be';
    const colorBg = 'rgba(255, 255, 255, 0.12)';

    renderizarGrafica('chartInflacion', labels, valores, colorTema, colorBg, 'miGraficaIPC', 'Variación Anual IPC (%)');
}

function cargarDatosDesempleo() {
    const cacheBuster = new Date().getTime();
    
    fetch(`desempleo_historico_dane.json?v=${cacheBuster}`, { cache: 'no-store' })
    .then(response => {
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        return response.json();
    })
    .then(data => renderizarCommandCenterDesempleo(data))
    .catch(error => {
        console.error("Error al cargar desempleo:", error);
        document.getElementById('kpiDesempleo').innerText = "Error";
    });
}

function renderizarCommandCenterDesempleo(data) {
    if (!data || data.length < 2) return;
    const ultimoRegistro = data[data.length - 1];
    const penultimoRegistro = data[data.length - 2];

    const desempleoActual = parseFloat(ultimoRegistro.tasa_desempleo);
    const desempleoAnterior = parseFloat(penultimoRegistro.tasa_desempleo);

    document.getElementById('kpiDesempleo').innerText = `${desempleoActual.toFixed(1)}%`;
    
    const elemAnterior = document.getElementById('kpiDesempleoAnterior');
    if (elemAnterior) elemAnterior.innerText = `${desempleoAnterior.toFixed(1)}%`;

    const labelMes = document.getElementById('labelMesDesempleo');
    if (labelMes && ultimoRegistro.mes) {
        labelMes.innerText = ultimoRegistro.mes;
    }

    const cardElement = document.getElementById('cardDesempleo');
    const verdictStatus = document.getElementById('verdictStatusDesempleo');
    
    const empeoro = desempleoActual > desempleoAnterior;

    if (cardElement && verdictStatus) {
        if (empeoro) {
            cardElement.className = "kpi-card card-red";
            verdictStatus.innerHTML = `
                <svg class="kpi-status-thumb thumb-down" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>
                <span>EMPEORÓ</span>
            `;
        } else {
            cardElement.className = "kpi-card card-green";
            verdictStatus.innerHTML = `
                <svg class="kpi-status-thumb thumb-up" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                <span>MEJORÓ</span>
            `;
        }
    }

    if (window.actualizarTabsMovil) window.actualizarTabsMovil();

    const ultimos6Meses = data.slice(-6);
    const labels = ultimos6Meses.map(d => d.mes.substring(0, 3));
    const valores = ultimos6Meses.map(d => parseFloat(d.tasa_desempleo));

    const colorTema = empeoro ? '#e61c34' : '#00d2be';
    const colorBg = 'rgba(255, 255, 255, 0.12)';

    renderizarGrafica('chartDesempleo', labels, valores, colorTema, colorBg, 'miGraficaDesempleo', 'Tasa de Desempleo (%)');
}

function renderizarGrafica(canvasId, labels, valores, borderColor, bgColor, globalVarName, datasetLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const esMovil = window.innerWidth <= 600;
    const tamFuente = esMovil ? 14 : 12;   // textos de la gráfica más grandes en celular
    
    if (window[globalVarName]) {
        window[globalVarName].destroy();
    }

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
                padding: { left: esMovil ? 16 : 12, right: esMovil ? 16 : 12, top: esMovil ? 24 : 18, bottom: 2 } 
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                y: { 
                    display: false,
                    grace: '25%' 
                },
                x: { 
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: tamFuente, family: 'JetBrains Mono', weight: '700' },
                        callback: function(value, index, ticks) {
                            if (index === 0 || index === ticks.length - 1) {
                                return this.getLabelForValue(value);
                            }
                            return '';
                        },
                        maxRotation: 0,
                        autoSkip: false
                    }
                }
            },
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
                    const total = meta.data.length;

                    meta.data.forEach((point, index) => {
                        const valor = Number(dataset.data[index]);
                        const anterior = Number(dataset.data[index - 1]);
                        const siguiente = Number(dataset.data[index + 1]);

                        // En un "valle" la línea sube a ambos lados: la etiqueta va debajo para no taparse
                        const esValle = index > 0 && index < total - 1 &&
                                        valor < anterior && valor < siguiente;

                        ctx.textBaseline = esValle ? 'top' : 'bottom';
                        ctx.fillText(valor.toFixed(1), point.x, esValle ? point.y + 10 : point.y - 9);
                    });
                });

                ctx.restore();
            }
        }]
    });
}
