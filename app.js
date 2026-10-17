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
        let activo = 0;
        let menorDistancia = Infinity;

        cards.forEach((card, i) => {
            const r = card.getBoundingClientRect();
            const distancia = Math.abs(r.left + r.width / 2 - centro);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                activo = i;
            }
        });

        tabs.forEach((tab, i) => {
            tab.classList.remove('active-red', 'active-green');
            tab.removeAttribute('aria-current');
            if (i === activo) {
                const esRoja = cards[i].classList.contains('card-red');
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
                borderWidth: 2.5,
                pointRadius: 4.5,
                pointBackgroundColor: '#ffffff',
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { 
                padding: { left: 12, right: 12, top: 18, bottom: 2 } 
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
                        font: { size: 12, family: 'JetBrains Mono', weight: '700' },
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
            animation: {
                onComplete: function() {
                    const chart = this;
                    const ctx = chart.ctx;
                    ctx.font = 'bold 12px "JetBrains Mono", monospace';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';

                    const isMobile = window.innerWidth <= 900;

                    chart.data.datasets.forEach(function(dataset, i) {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach(function(point, index) {
                            // En móvil, se omiten los valores intermedios manteniendo los puntos y la línea
                            if (isMobile && index !== 0 && index !== meta.data.length - 1) {
                                return;
                            }

                            const rawValue = dataset.data[index];
                            const dataValue = Number(rawValue).toFixed(1);
                            ctx.fillText(dataValue, point.x, point.y - 7);
                        });
                    });
                }
            }
        }
    });
}