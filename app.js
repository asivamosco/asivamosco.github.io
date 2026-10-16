document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    cargarDatosInflacion();
    cargarDatosDesempleo();
});

// Lógica de Persistencia y Switch de Tema
function initTheme() {
    const toggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIcon) themeIcon.innerText = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.innerText = '🌙';
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                if (themeIcon) themeIcon.innerText = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                if (themeIcon) themeIcon.innerText = '☀️';
            }
            // Recargar gráficas para actualizar color de grilla si es necesario
            cargarDatosInflacion();
            cargarDatosDesempleo();
        });
    }
}

function cargarDatosInflacion() {
    const cacheBuster = new Date().getTime();
    
    fetch(`inflacion_anual_dane.json?v=${cacheBuster}`, {
        cache: 'no-store'
    })
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
    const ultimoRegistro = data[data.length - 1];
    const penultimoRegistro = data[data.length - 2];

    const inflacionActual = parseFloat(ultimoRegistro.var_anual);
    const inflacionAnterior = parseFloat(penultimoRegistro.var_anual);

    document.getElementById('kpiInflacion').innerText = `${inflacionActual.toFixed(2)}%`;
    
    const elemAnterior = document.getElementById('kpiInflacionAnterior');
    if (elemAnterior) elemAnterior.innerText = `${inflacionAnterior.toFixed(2)}%`;

    const cardElement = document.getElementById('cardInflacion');
    const verdictContainer = document.getElementById('verdictInflacion');
    
    const empeoro = inflacionActual > inflacionAnterior;

    if (cardElement && verdictContainer) {
        if (empeoro) {
            cardElement.className = "kpi-card card-red";
            verdictContainer.className = "verdict-container verdict-red";
            verdictContainer.innerHTML = `
                <svg class="verdict-icon" viewBox="0 0 24 24">
                  <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l5.59-5.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0h2c.55 0 1 .45 1 1v9c0 .55.45 1-1 1h-2c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1z"/>
                </svg>
                <span class="verdict-text">EMPEORÓ</span>
            `;
        } else {
            cardElement.className = "kpi-card card-green";
            verdictContainer.className = "verdict-container verdict-green";
            verdictContainer.innerHTML = `
                <svg class="verdict-icon" viewBox="0 0 24 24">
                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 7.58 6.59C7.22 6.95 7 7.45 7 8v9c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                </svg>
                <span class="verdict-text">MEJORÓ</span>
            `;
        }
    }

    const ultimos6Meses = data.slice(-6);
    const labels = ultimos6Meses.map(d => `${d.mes.substring(0, 3)} '${String(d.ano).slice(-2)}`);
    const valores = ultimos6Meses.map(d => parseFloat(d.var_anual));

    const colorTema = empeoro ? '#ef4444' : '#10b981';
    const colorBg = empeoro ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';

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
    const ultimoRegistro = data[data.length - 1];
    const penultimoRegistro = data[data.length - 2];

    const desempleoActual = parseFloat(ultimoRegistro.tasa_desempleo);
    const desempleoAnterior = parseFloat(penultimoRegistro.tasa_desempleo);

    document.getElementById('kpiDesempleo').innerText = `${desempleoActual.toFixed(1)}%`;
    
    const elemAnterior = document.getElementById('kpiDesempleoAnterior');
    if (elemAnterior) elemAnterior.innerText = `${desempleoAnterior.toFixed(1)}%`;

    const cardElement = document.getElementById('cardDesempleo');
    const verdictContainer = document.getElementById('verdictDesempleo');
    
    const empeoro = desempleoActual > desempleoAnterior;

    if (cardElement && verdictContainer) {
        if (empeoro) {
            cardElement.className = "kpi-card card-red";
            verdictContainer.className = "verdict-container verdict-red";
            verdictContainer.innerHTML = `
                <svg class="verdict-icon" viewBox="0 0 24 24">
                  <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l5.59-5.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0h2c.55 0 1 .45 1 1v9c0 .55.45 1-1 1h-2c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1z"/>
                </svg>
                <span class="verdict-text">EMPEORÓ</span>
            `;
        } else {
            cardElement.className = "kpi-card card-green";
            verdictContainer.className = "verdict-container verdict-green";
            verdictContainer.innerHTML = `
                <svg class="verdict-icon" viewBox="0 0 24 24">
                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 7.58 6.59C7.22 6.95 7 7.45 7 8v9c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                </svg>
                <span class="verdict-text">MEJORÓ</span>
            `;
        }
    }

    const ultimos6Meses = data.slice(-6);
    const labels = ultimos6Meses.map(d => `${d.mes.substring(0, 3)} '${String(d.ano).slice(-2)}`);
    const valores = ultimos6Meses.map(d => parseFloat(d.tasa_desempleo));

    const colorTema = empeoro ? '#ef4444' : '#10b981';
    const colorBg = empeoro ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';

    renderizarGrafica('chartDesempleo', labels, valores, colorTema, colorBg, 'miGraficaDesempleo', 'Tasa de Desempleo (%)');
}

function renderizarGrafica(canvasId, labels, valores, borderColor, bgColor, globalVarName, datasetLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (window[globalVarName]) {
        window[globalVarName].destroy();
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(200, 200, 200, 0.15)';

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
                pointRadius: 4,
                pointBackgroundColor: borderColor,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 5, right: 10, top: 5, bottom: 0 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${datasetLabel}: ${context.parsed.y.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        font: { size: 9 },
                        callback: function(value) { return value.toFixed(1) + '%'; }
                    },
                    grid: { color: gridColor }
                },
                x: { display: false, grid: { display: false } }
            }
        }
    });
}