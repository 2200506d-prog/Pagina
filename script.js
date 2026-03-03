pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

async function extraerTextoPDF(file) {

    const pdfData = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let texto = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // 🔥 Intentar extraer texto REAL del PDF (sin OCR)
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        texto += strings.join(" ") + "\n";
    }

    return texto;
}

async function extraerTextoImagen(file) {
    const reader = new FileReader();
    return new Promise(resolve => {
        reader.onload = async function () {
            const { data: { text } } =
                await Tesseract.recognize(reader.result, 'spa');
            resolve(text);
        };
        reader.readAsDataURL(file);
    });
}

function limpiarNumero(valor) {
    return parseFloat(valor.replace(/,/g, '').replace('$',''));
}

function detectarTotal(texto) {

    texto = texto.replace(/\s+/g, " ");

    // 🔥 Detectores múltiples reales CFE
    const patrones = [
        /total\s*a\s*pagar\s*\$?\s*([\d,]+\.\d{2})/i,
        /total\s*\$?\s*([\d,]+\.\d{2})/i,
        /\$\s*([\d,]+\.\d{2})\s*mxn/i
    ];

    for (let patron of patrones) {
        const match = texto.match(patron);
        if (match) return limpiarNumero(match[1]);
    }

    return null;
}

inputArchivo.addEventListener("change", async () => {

    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    estado.textContent = "Analizando factura...";
    resultado.innerHTML = "";

    let texto = "";

    try {

        if (archivo.type === "application/pdf") {
            texto = await extraerTextoPDF(archivo);
        } else {
            texto = await extraerTextoImagen(archivo);
        }

        const total = detectarTotal(texto);

        if (total !== null) {

            resultado.innerHTML = `
                <div class="card">
                    <h2>Total real detectado:</h2>
                    <div class="total">$${total.toFixed(2)} MXN</div>
                </div>
            `;

            estado.textContent = "Análisis completo ✅";

        } else {

            resultado.innerHTML = `
                <div class="error">
                    No se pudo detectar el total automáticamente.
                </div>
            `;

            estado.textContent = "No se detectó total";

        }

    } catch (error) {
        estado.textContent = "Error al procesar archivo";
        console.error(error);
    }

});
