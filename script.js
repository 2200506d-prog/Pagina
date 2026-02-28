<script>
pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

async function extraerTexto(file) {
    if (file.type === "application/pdf") {
        const pdfData = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let textoCompleto = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;

            const { data: { text } } =
                await Tesseract.recognize(canvas, 'spa');

            textoCompleto += text + "\n";
        }

        return textoCompleto;
    } else {
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
}

function detectarTotalReal(texto) {

    // Buscar línea que contenga TOTAL
    const lineas = texto.split("\n");

    for (let linea of lineas) {

        if (/total/i.test(linea)) {

            // Buscar número tipo 241.14 o 241
            const match = linea.match(/\$?\s?(\d{1,4}(\.\d{1,2})?)/);

            if (match) {
                return parseFloat(match[1]);
            }
        }
    }

    return null;
}

inputArchivo.addEventListener("change", async () => {

    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    estado.textContent = "Analizando recibo...";
    resultado.innerHTML = "";

    try {

        const texto = await extraerTexto(archivo);
        const total = detectarTotalReal(texto);

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
                    No se pudo detectar el total correctamente.
                </div>
            `;
            estado.textContent = "Error en detección";
        }

    } catch (error) {
        estado.textContent = "Error al procesar archivo";
        console.error(error);
    }
});
</script>
