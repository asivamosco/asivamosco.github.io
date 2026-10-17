document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    cargarDatosInflacion();
    cargarDatosDesempleo();
    initStaticCharts();
});

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
            cargarDatosInflacion();
            cargarDatosDesempleo();
            initStaticCharts();
        });
    }
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
        console.warn("Uso de respaldo estático para Inflación");
        renderizarCommandCenterInflacion([
            { mes: "Mayo", ano: 2026, var_anual: 5.80 },
            { mes: "Junio", ano: 2026, var_anual: 5.90 },
            { mes: "Julio", ano: 2026, var_anual: 6.10 },
            { mes: "Agosto", ano: 2026, var_anual: 6.00 },
            { mes: "Septiembre", ano: 2026, var_anual: 6.24 },
            { mes: "Octubre", ano: 2026, var_anual: 6.29 }
        ]);
    });
}

function renderizarCommandCenterInflacion(data) {
    if (!data || data.length < 2) return;
    const ultimoRegistro = data[data.length - 1];
    const penultimoRegistro = data[data.length - 2];

    const inflacionActual = parseFloat(ultimoRegistro.var_anual);
    const inflacionAnterior = parseFloat(penultimoRegistro.var_anual);

    const elem = document.getElementById('kpiInflacion');
    if (elem) elem.innerText = `${inflacionActual.toFixed(2)}%`;
    
    const elemAnterior = document.getElementById('kpiInflacionAnterior');
    if (elemAnterior) elemAnterior.innerText = `${inflacionAnterior.toFixed(2)}%`;

    const labelElem = document.getElementById('labelInflacion');
    if (labelElem) labelElem.innerText = `${ultimoRegistro.mes}`;

    const cardElement = document.getElementById('cardInflacion');
    const thumbElement = document.getElementById('thumbInflacion');
    const empeoro = inflacionActual > inflacionAnterior;

    if (cardElement && thumbElement) {
        if (empeoro) {
            cardElement.className = "kpi-card card-red";
            thumbElement.className = "kpi-status-thumb thumb-down";
            thumbElement.innerHTML = `<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>`;
        } else {
            cardElement.className = "kpi-card card-green";
            thumbElement.className = "kpi-status-thumb thumb-up";
            thumbElement.innerHTML = `<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>`;
        }
    }

    const ultimos6Meses = data.slice(-6);
    const labels = ultimos6Meses.map(d => `${d.mes.substring(0, 3)} '${String(d.ano).slice(-2)}`);
    const valores = ultimos6Meses.map(d => parseFloat(d.var_anual));

    renderizarGrafica('chartInflacion', labels, valores, 'miGraficaIPC', 'IPC');
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
        console.warn("Uso de respaldo estático para Desempleo");
        renderizarCommandCenterDesempleo([
            { mes: "Mayo", ano: 2026, tasa_desempleo: 11.5 },
            { mes: "Junio", ano: 2026, tasa_desempleo: 11.2 },
            { mes: "Julio", ano: 2026, tasa_desempleo: 11.0 },
            { mes: "Agosto", ano: 2026, tasa_desempleo: 10.9 },
            { mes: "Septiembre", ano: 2026, tasa_desempleo: 8.3 },
            { mes: "Octubre", ano: 2026, tasa_desempleo: 9.7 }
        ]);
    });
}

function renderizarCommandCenterDesempleo(data) {
    if (!data || data.length < 2) return;
    const ultimoRegistro = data[data.length - 1];
    const penultimoRegistro = data[data.length - 2];

    const desempleoActual = parseFloat(ultimoRegistro.tasa_desempleo);
    const desempleoAnterior = parseFloat(penultimoRegistro.tasa_desempleo);

    const elem = document.getElementById('kpiDesempleo');
    if (elem) elem.innerText = `${desempleoActual.toFixed(1)}%`;
    
    const elemAnterior = document.getElementById('kpiDesempleoAnterior');
    if (elemAnterior) elemAnterior.innerText = `${desempleoAnterior.toFixed(1)}%`;

    const labelElem = document.getElementById('labelDesempleo');
    if (labelElem) labelElem.innerText = `${ultimoRegistro.mes}`;

    const cardElement = document.getElementById('cardDesempleo');
    const thumbElement = document.getElementById('thumbDesempleo');
    const empeoro = desempleoActual > desempleoAnterior;

    if (cardElement && thumbElement) {
        if (empeoro) {
            cardElement.className = "kpi-card card-red";
            thumbElement.className = "kpi-status-thumb thumb-down";
            thumbElement.innerHTML = `<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>`;
        } else {
            cardElement.className = "kpi-card card-green";
            thumbElement.className = "kpi-status-thumb thumb-up";
            thumbElement.innerHTML = `<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>`;
        }
    }

    const ultimos6Meses = data.slice(-6);
    const labels = ultimos6Meses.map(d => `${d.mes.substring(0, 3)} '${String(d.ano).slice(-2)}`);
    const valores = ultimos6Meses.map(d => parseFloat(d.tasa_desempleo));

    renderizarGrafica('chartDesempleo', labels, valores, 'miGraficaDesempleo', 'Desempleo');
}

function initStaticCharts() {
    renderizarGrafica('chartSeguridad', ["May", "Jun", "Jul", "Ago", "Sep", "Oct"], [1100, 1120, 1150, 1130, 1180, 1240], 'miGraficaSeguridad', 'Seguridad');
    renderizarGrafica('chartSalud', ["May", "Jun", "Jul", "Ago", "Sep", "Oct"], [93.0, 93.5, 93.8, 93.5, 94.0, 94.1], 'miGraficaSalud', 'Salud');
}

function renderizarGrafica(canvasId, labels, valores, globalVarName, datasetLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
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
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#ffffff',
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }, 
                tooltip: { enabled: false } 
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}