<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>

<script>

pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const input = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

input.addEventListener("change", async function (e) {

    const file = e.target.files[0];
    if (!file) return;

    estado.textContent = "Analizando documento...";
    resultado.innerHTML = "";

    let textoCompleto = "";

    try {

        // 🔥 1. Si es PDF
        if (file.type === "application/pdf") {

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                textoCompleto += strings.join(" ") + " ";
            }

            // 🔥 Si el PDF no trae texto (escaneado)
            if (textoCompleto.trim().length < 50) {

                estado.textContent = "PDF escaneado detectado... usando OCR ⏳";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2 });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: context, viewport }).promise;

                    const { data: { text } } =
                        await Tesseract.recognize(canvas, "spa");

                    textoCompleto += text + " ";
                }
            }

        } else {

            // 🔥 2. Si es imagen directa
            const reader = new FileReader();

            textoCompleto = await new Promise(resolve => {
                reader.onload = async function () {
                    const { data: { text } } =
                        await Tesseract.recognize(reader.result, "spa");
                    resolve(text);
                };
                reader.readAsDataURL(file);
            });

        }

        console.log("TEXTO DETECTADO:", textoCompleto);

        // 🔥 Detector inteligente de TOTAL
        textoCompleto = textoCompleto.replace(/\s+/g, " ");

        const patrones = [
            /total\s+a\s+pagar\s*\$?\s*([\d,]+\.\d{2})/i,
            /importe\s+total\s*\$?\s*([\d,]+\.\d{2})/i,
            /total\s*\$?\s*([\d,]+\.\d{2})/i
        ];

        let totalDetectado = null;

        for (let patron of patrones) {
            let match = textoCompleto.match(patron);
            if (match) {
                totalDetectado = parseFloat(match[1].replace(/,/g, ""));
                break;
            }
        }

        if (totalDetectado) {

            resultado.innerHTML = `
                <div class="card">
                    <h2>Total detectado:</h2>
                    <div class="total">$${totalDetectado.toFixed(2)} MXN</div>
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

</script>
