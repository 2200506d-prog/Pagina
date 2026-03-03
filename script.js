pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

let grafica;

async function extraerTexto(file) {

    if (file.type === "application/pdf") {

        const pdfData = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let texto = "";

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

            texto += text + "\n";
        }

        return texto;
    }

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
    return parseFloat(valor.replace(/,/g, ''));
}

function detectarDatos(texto) {

    const datos = {};

    const totalMatch = texto.match(/total\s*a\s*pagar[\s:$]*([\d,]+\.\d+)/i);
    if (totalMatch) datos.total = limpiarNumero(totalMatch[1]);

    const consumoMatch = texto.match(/energia\s*\(kwh\).*?(\d+)/i);
    if (consumoMatch) datos.consumo = parseInt(consumoMatch[1]);

    const ivaMatch = texto.match(/iva\s*16%?.*?([\d,]+\.\d+)/i);
    if (ivaMatch) datos.iva = limpiarNumero(ivaMatch[1]);

    const dapMatch = texto.match(/dap.*?([\d,]+\.\d+)/i);
    if (dapMatch) datos.dap = limpiarNumero(dapMatch[1]);

    const energiaMatch = texto.match(/energia\s+([\d,]+\.\d+)/i);
    if (energiaMatch) datos.energia = limpiarNumero(energiaMatch[1]);

    return datos;
}

function crearGrafica(consumo) {

    const ctx = document.getElementById('grafica');

    if (grafica) grafica.destroy();

    grafica = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Consumo (kWh)'],
            datasets: [{
                label: 'kWh',
                data: [consumo],
                backgroundColor: '#00ff88'
            }]
        }
    });
}

inputArchivo.addEventListener("change", async () => {

    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    estado.textContent = "Analizando factura...";
    resultado.innerHTML = "";

    const texto = await extraerTexto(archivo);
    const datos = detectarDatos(texto);

    if (!datos.total) {
        estado.textContent = "No se pudo detectar el total correctamente";
        return;
    }

    resultado.innerHTML = `
        <div class="card">
            <div class="total">$${datos.total.toFixed(2)} MXN</div>
            <div class="detalle">
                <p><strong>Consumo:</strong> ${datos.consumo || 'No detectado'} kWh</p>
                <p><strong>Energía:</strong> $${datos.energia || '0'} MXN</p>
                <p><strong>IVA:</strong> $${datos.iva || '0'} MXN</p>
                <p><strong>DAP:</strong> $${datos.dap || '0'} MXN</p>
            </div>
        </div>
    `;

    if (datos.consumo) crearGrafica(datos.consumo);

    estado.textContent = "Análisis completo ✅";
});
