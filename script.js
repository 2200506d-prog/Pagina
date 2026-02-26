pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const IVA = 0.16;
const DAP = 0.05; // 5% ejemplo

const tarifasCFE = {
  "1": { basicoLimite: 75, intermedioLimite: 140, basico: 0.98, intermedio: 1.19, excedente: 3.45 },
  "1A": { basicoLimite: 100, intermedioLimite: 150, basico: 0.85, intermedio: 1.05, excedente: 3.50 },
  "1B": { basicoLimite: 125, intermedioLimite: 200, basico: 0.80, intermedio: 1.00, excedente: 3.55 }
};

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

async function extraerTextoPDF(archivo) {
  const pdfData = new Uint8Array(await archivo.arrayBuffer());
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

    const { data: { text } } = await Tesseract.recognize(canvas, 'spa');
    texto += text + "\n";
  }

  return texto;
}

async function extraerTextoImagen(archivo) {
  const reader = new FileReader();
  return new Promise(resolve => {
    reader.onload = async () => {
      const { data: { text } } =
        await Tesseract.recognize(reader.result, 'spa');
      resolve(text);
    };
    reader.readAsDataURL(archivo);
  });
}

function detectarConsumo(texto) {
  const lineas = texto.split("\n");
  let consumo = 0;

  for (let linea of lineas) {
    if (linea.toLowerCase().includes("kwh")) {
      const numeros = linea.match(/\d+/g);
      if (numeros) consumo = parseInt(numeros[numeros.length - 1]);
    }
  }
  return consumo;
}

function detectarTotal(texto) {
  const match = texto.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
  if (match) {
    let posibles = match.map(n => parseFloat(n.replace(/[^\d.]/g,'')));
    return Math.max(...posibles);
  }
  return 0;
}

function calcularCosto(consumo, tipo="1") {
  const t = tarifasCFE[tipo];
  let restante = consumo;
  let total = 0;

  let basico = Math.min(restante, t.basicoLimite);
  total += basico * t.basico;
  restante -= basico;

  let intermedio = Math.min(restante, t.intermedioLimite - t.basicoLimite);
  total += intermedio * t.intermedio;
  restante -= intermedio;

  if (restante > 0) total += restante * t.excedente;

  return total;
}

function calcularImpuestos(subtotal) {
  const iva = subtotal * IVA;
  const dap = subtotal * DAP;
  return { iva, dap, totalFinal: subtotal + iva + dap };
}

function generarGrafica(consumoActual) {
  const ctx = document.getElementById("grafica");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Periodo Actual"],
      datasets: [{
        label: "Consumo kWh",
        data: [consumoActual]
      }]
    }
  });
}

inputArchivo.addEventListener("change", async () => {
  const archivo = inputArchivo.files[0];
  if (!archivo) return;

  estado.textContent = "Analizando recibo... ⏳";
  resultado.innerHTML = "";

  let texto = archivo.type === "application/pdf"
    ? await extraerTextoPDF(archivo)
    : await extraerTextoImagen(archivo);

  const consumo = detectarConsumo(texto);
  const subtotal = calcularCosto(consumo);
  const impuestos = calcularImpuestos(subtotal);
  const totalLeido = detectarTotal(texto);

  estado.textContent = "Análisis completo ✅";

  resultado.innerHTML = `
    <h3>Desglose</h3>
    <p>⚡ Consumo: ${consumo} kWh</p>
    <p>💵 Subtotal energía: $${subtotal.toFixed(2)}</p>
    <p>IVA (16%): $${impuestos.iva.toFixed(2)}</p>
    <p>DAP (5% ejemplo): $${impuestos.dap.toFixed(2)}</p>
    <h3>Total estimado: $${impuestos.totalFinal.toFixed(2)} MXN</h3>
    <hr>
    <p><strong>Total detectado en recibo:</strong> $${totalLeido.toFixed(2)} MXN</p>
  `;

  generarGrafica(consumo);
});
