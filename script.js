// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const results = document.getElementById('results');
let myChart = null;

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    status.innerText = "Procesando... esto puede tardar unos segundos.";
    results.classList.add('hidden');

    try {
        let imageSource;

        if (file.type === "application/pdf") {
            imageSource = await convertPdfToImage(file);
        } else {
            imageSource = file;
        }

        // Ejecutar OCR con Tesseract
        const worker = await Tesseract.createWorker('spa');
        const { data: { text } } = await worker.recognize(imageSource);
        await worker.terminate();

        analizarTexto(text);
    } catch (error) {
        console.error(error);
        status.innerText = "Error al procesar el archivo.";
    }
});

async function convertPdfToImage(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1); // Analizamos solo la primera página
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL();
}

function analizarTexto(texto) {
    console.log("Texto extraído:", texto);
    
    // Regex para buscar montos (ej: $1,240.00 o Total a pagar: 500)
    const precioMatch = texto.match(/\$\s?(\d{1,3}(,\d{3})*(\.\d+)?)/) || texto.match(/TOTAL A PAGAR.*?(\d+)/i);
    // Regex para buscar consumo (ej: 250 kWh o Lectura actual)
    const consumoMatch = texto.match(/(\d+)\s?kWh/i) || texto.match(/Consumo.*?(\d+)/i);

    const precio = precioMatch ? precioMatch[1] : "No detectado";
    const consumo = consumoMatch ? consumoMatch[1] : "No detectado";

    document.getElementById('res-precio').innerText = precio;
    document.getElementById('res-consumo').innerText = consumo;
    
    status.innerText = "¡Análisis completo!";
    results.classList.remove('hidden');

    generarGrafica(consumo !== "No detectado" ? parseInt(consumo) : 0);
}

function generarGrafica(valorConsumo) {
    const ctx = document.getElementById('consumptionChart').getContext('2d');
    
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Tu Consumo', 'Promedio Zona'],
            datasets: [{
                label: 'Kilowatts-hora (kWh)',
                data: [valorConsumo, 280], // 280 es un valor promedio de ejemplo
                backgroundColor: ['#00d1b2', '#ccc']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
                }
