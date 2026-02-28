// Configuración del Worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

/**
 * Función para extraer texto de PDF o Imagen
 */
async function extraerTexto(file) {
    if (file.type === "application/pdf") {
        const pdfData = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let textoCompleto = "";

        // Recorrer todas las páginas del PDF
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;

            // Procesar la imagen de la página con Tesseract
            const { data: { text } } = await Tesseract.recognize(canvas, 'spa');
            textoCompleto += text + "\n";
        }
        return textoCompleto;
    } else {
        // Si es imagen (JPG/PNG), Tesseract la procesa directamente
        const { data: { text } } = await Tesseract.recognize(file, 'spa');
        return text;
    }
}

/**
 * Lógica para buscar el monto total en el texto extraído
 */
function detectarTotalReal(texto) {
    const lineas = texto.split("\n");
    
    for (let linea of lineas) {
        // Busca "TOTAL" o "IMPORTE TOTAL" (insensible a mayúsculas)
        if (/total/i.test(linea)) {
            // Busca números con formato 00.00 o 00,00
            const match = linea.match(/(\d{1,5}([\.,]\d{2}))/);
            if (match) {
                // Reemplazamos coma por punto para que parseFloat funcione
                return parseFloat(match[1].replace(',', '.'));
            }
        }
    }
    return null;
}

/**
 * Evento cuando el usuario selecciona un archivo
 */
inputArchivo.addEventListener("change", async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    estado.textContent = "Procesando... esto puede tardar un poco ⏳";
    resultado.innerHTML = "";

    try {
        const texto = await extraerTexto(archivo);
        console.log("Texto detectado:", texto); // Ver en consola para depurar
        
        const total = detectarTotalReal(texto);

        if (total !== null) {
            resultado.innerHTML = `
                <div class="card">
                    <strong>Total detectado:</strong>
                    <div class="total">$${total.toFixed(2)} MXN</div>
                </div>
            `;
            estado.textContent = "Análisis finalizado con éxito";
        } else {
            resultado.innerHTML = `
                <div class="error">
                    No se encontró el monto total. Intenta con una imagen más clara.
                </div>
            `;
            estado.textContent = "Error en la detección";
        }

    } catch (error) {
        estado.textContent = "Ocurrió un error al leer el archivo";
        console.error("Error OCR:", error);
    }
});
