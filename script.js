// Configuración de PDF.js para renderizado de alta calidad
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const results = document.getElementById('results');
let myChart = null;

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    status.innerHTML = "<b>Paso 1/2:</b> Extrayendo imágenes del documento...";
    results.classList.add('hidden');

    try {
        let imageToProcess;

        if (file.type === "application/pdf") {
            // Renderizamos el PDF con alta resolución (escala 3.0) para que el OCR no falle
            imageToProcess = await convertPdfToImage(file, 3.0);
        } else {
            imageToProcess = file;
        }

        status.innerHTML = "<b>Paso 2/2:</b> Analizando texto con IA... (esto tarda 5-10 seg)";
        
        // Iniciamos Tesseract en español
        const worker = await Tesseract.createWorker('spa');
        const { data: { text } } = await worker.recognize(imageToProcess);
        await worker.terminate();

        procesarDatosRecibo(text);
    } catch (error) {
        console.error("Error detallado:", error);
        status.innerText = "Error: El documento es demasiado complejo o está protegido.";
    }
});

async function convertPdfToImage(file, scale) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1); 
    
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL('image/png');
}

function procesarDatosRecibo(texto) {
    // Limpiamos el texto de saltos de línea raros para facilitar la búsqueda
    const textoLimpio = texto.replace(/\n/g, " ").toUpperCase();
    console.log("Texto Escaneado:", textoLimpio);

    // --- LÓGICA DE EXTRACCIÓN MEJORADA ---
    
    // 1. Buscar el Total a Pagar
    // Busca el símbolo $ seguido de números, o la palabra TOTAL
    let monto = 0;
    const regexDinero = /(?:TOTAL|PAGAR|TOTAL A PAGAR).*?\$?\s?([\d,]+\.\d{2})/;
    const matchDinero = textoLimpio.match(regexDinero);
    if (matchDinero) {
        monto = matchDinero[1].replace(/,/g, "");
    }

    // 2. Buscar el Consumo (kWh)
    // Busca números antes de la palabra KWH
    let consumo = 0;
    const regexKwh = /(\d+)\s?(?:KWH|KILOWATTS)/;
    const matchKwh = textoLimpio.match(regexKwh);
    if (matchKwh) {
        consumo = matchKwh[1];
    }

    // Mostrar resultados
    if (monto > 0 || consumo > 0) {
        document.getElementById('res-precio').innerText = `$${monto}`;
        document.getElementById('res-consumo').innerText = consumo;
        status.innerText = "¡Análisis exitoso!";
        results.classList.remove('hidden');
        generarGrafica(parseInt(consumo));
    } else {
        status.innerHTML = "❌ No se detectaron datos claros. <br><small>Intenta con una foto más nítida o un PDF original.</small>";
    }
}

function generarGrafica(consumoReal) {
    const ctx = document.getElementById('consumptionChart').getContext('2d');
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut', // Cambiado a dona para que se vea más moderno
        data: {
            labels: ['Tu Consumo (kWh)', 'Límite Básico'],
            datasets: [{
                data: [consumoReal, 150], // 150 kWh suele ser el límite de tarifa básica
                backgroundColor: ['#2563eb', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
            }
