// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const input = document.getElementById("archivo");
const estado = document.getElementById("estado");
const container = document.getElementById("res-container");

input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    estado.innerHTML = "⏳ <b>Procesando recibo...</b><br>Esto puede tomar 5-10 segundos.";
    container.style.display = "none";

    try {
        const texto = await extraerTexto(file);
        procesarRecibo(texto);
    } catch (err) {
        estado.textContent = "❌ Error al leer el archivo.";
        console.error(err);
    }
});

async function extraerTexto(file) {
    if (file.type === "application/pdf") {
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
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
    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log("Debug Texto:", texto); // Puedes verlo en la consola de GitHub

    // 1. EXTRAER TARIFA
    const tarifaMatch = texto.match(/TARIFA[:\s]+([A-Z0-9]+)/i);
    const tarifa = tarifaMatch ? tarifaMatch[1] : "01";

    // 2. EXTRAER TOTAL (Lógica de valor máximo)
    let totalDetectado = "No detectado";
    // Busca patrones de dinero: 1,234.00, 500.00, etc.
    const montos = texto.match(/(\d{1,3}(,\d{3})*(\.\d{2}))|(\d{2,6}\.\d{2})/g);
    
    if (montos) {
        // Convertimos a números reales y buscamos el mayor
        const valoresNumericos = montos.map(m => parseFloat(m.replace(/,/g, '')));
        const valorMaximo = Math.max(...valoresNumericos);
        
        if (valorMaximo > 0) {
            totalDetectado = `$${valorMaximo.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN`;
        }
    }

    // 3. EXTRAER TITULAR
    // En CFE, el nombre suele estar entre la línea 2 y 6, evitando palabras del logo
    const palabrasBasura = /CFE|Suministrador|Servicios|Básicos|Recibo|Luz|Pagar|Total|Tarifa|Medidor/i;
    let titular = "No detectado";
    
    for (let i = 0; i < Math.min(lineas.length, 10); i++) {
        if (lineas[i].length > 12 && !palabrasBasura.test(lineas[i])) {
            titular = lineas[i];
            break;
        }
    }

    // Dibujar resultados
    document.getElementById("res-titular").textContent = titular;
    document.getElementById("res-tarifa").textContent = tarifa;
    document.getElementById("res-total").textContent = totalDetectado;
    
    estado.textContent = "✅ Análisis Finalizado";
    container.style.display = "block";
}
