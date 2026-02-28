pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const input = document.getElementById("archivo");
const estado = document.getElementById("estado");
const container = document.getElementById("res-container");
let chartInstance = null; // Para borrar la gráfica anterior si se sube otro archivo

input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    estado.innerHTML = "⏳ <b>Analizando consumo...</b>";
    container.style.display = "none";

    try {
        const texto = await extraerTexto(file);
        procesarRecibo(texto);
    } catch (err) {
        estado.textContent = "❌ Error al procesar";
        console.error(err);
    }
});

async function extraerTexto(file) {
    if (file.type === "application/pdf") {
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const { data: { text } } = await Tesseract.recognize(canvas, 'spa');
        return text;
    } else {
        const { data: { text } } = await Tesseract.recognize(file, 'spa');
        return text;
    }
}

function procesarRecibo(texto) {
    const lineas = texto.split('\n').map(l => l.trim());
    
    // 1. Extraer Tarifa y Total
    const tarifaM = texto.match(/TARIFA[:\s]+([A-Z0-9]+)/i);
    const tarifa = tarifaM ? tarifaM[1] : "01";

    let totalNum = 0;
    const montos = texto.match(/(\d{1,3}(,\d{3})*(\.\d{2}))/g);
    if (montos) {
        const valores = montos.map(m => parseFloat(m.replace(/,/g, '')));
        totalNum = Math.max(...valores);
    }

    const titular = lineas.find(l => l.length > 15 && !/CFE|Suministrador|Pagar/i.test(l)) || "No detectado";

    // 2. Mostrar datos
    document.getElementById("res-titular").textContent = titular;
    document.getElementById("res-tarifa").textContent = tarifa;
    document.getElementById("res-total").textContent = `$${totalNum.toFixed(2)} MXN`;

    // 3. Generar Gráfica de Consumo
    generarGrafica(totalNum);

    estado.textContent = "✅ Análisis y gráfica listos";
    container.style.display = "block";
}

function generarGrafica(total) {
    const ctx = document.getElementById('graficaConsumo').getContext('2d');
    
    // Si ya existe una gráfica, la destruimos para crear la nueva
    if (chartInstance) { chartInstance.destroy(); }

    // Simulamos un histórico de consumo basado en el total actual para la gráfica
    const datosConsumo = [total * 0.8, total * 0.9, total * 1.1, total * 0.7, total];
    const etiquetas = ['Ene', 'Feb', 'Mar', 'Abr', 'Actual'];

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Consumo Mensual ($)',
                data: datosConsumo,
                backgroundColor: ['#004a99', '#004a99', '#004a99', '#004a99', '#00a94f'], // El actual en verde
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}
