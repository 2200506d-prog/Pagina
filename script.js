pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const input = document.getElementById("archivo");
const estado = document.getElementById("estado");
const panelResultado = document.getElementById("resultado");

input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    estado.textContent = "🔍 Analizando datos del recibo...";
    panelResultado.style.display = "none";

    try {
        const texto = await extraerTexto(file);
        procesarDatosRecibo(texto);
    } catch (e) {
        estado.textContent = "❌ Error al procesar el archivo.";
        console.error(e);
    }
});

async function extraerTexto(file) {
    if (file.type === "application/pdf") {
        const pdfData = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1); // Analizamos la primera página que es la principal
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        
        const { data: { text } } = await Tesseract.recognize(canvas, 'spa');
        return text;
    } else {
        const { data: { text } } = await Tesseract.recognize(file, 'spa');
        return text;
    }
}

function procesarDatosRecibo(texto) {
    console.log("Texto extraído:", texto); // Útil para depurar en GitHub
    
    // 1. Buscar Tarifa (Ejemplo: Tarifa 1, 1A, DAC, etc.)
    const tarifaMatch = texto.match(/TARIFA[:\s]+([A-Z0-9]+)/i);
    const tarifa = tarifaMatch ? tarifaMatch[1] : "No detectada";

    // 2. Buscar Total a Pagar
    // Buscamos la frase "TOTAL A PAGAR" y luego el número que sigue
    let total = "No detectado";
    const lineas = texto.split('\n');
    for (let i = 0; i < lineas.length; i++) {
        if (/TOTAL A PAGAR/i.test(lineas[i])) {
            // Buscamos el primer número que parezca moneda en esa línea o la siguiente
            const montoMatch = lineas[i].match(/(\d{1,6}[\.,]\d{2})|(\d{1,6})/);
            if (montoMatch) {
                total = `$${montoMatch[0]}`;
                break;
            }
        }
    }

    // 3. Buscar Titular (Destinatario)
    // Normalmente el nombre está en las primeras líneas del recibo de luz
    // Este es un método de aproximación: tomamos la primera línea con texto largo que no sea el logo
    const titular = lineas.find(l => l.trim().length > 10 && !/CFE|Suministrador/i.test(l)) || "No detectado";

    // Mostrar resultados
    document.getElementById("res-titular").textContent = titular.trim();
    document.getElementById("res-tarifa").textContent = tarifa;
    document.getElementById("res-total").textContent = total;
    
    estado.textContent = "✅ Análisis Completo";
    panelResultado.style.display = "block";
}
