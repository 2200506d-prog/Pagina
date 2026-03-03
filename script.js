pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");
const tarifaManual = document.getElementById("tarifaManual");

// Tarifas ejemplo tipo CFE (valores aproximados MXN 2025)
const tarifasCFE = {
  "1": {
    basicoLimite: 75,
    intermedioLimite: 140,
    basico: 0.98,
    intermedio: 1.19,
    excedente: 3.45
  },
  "1A": {
    basicoLimite: 100,
    intermedioLimite: 150,
    basico: 0.85,
    intermedio: 1.05,
    excedente: 3.50
  },
  "1B": {
    basicoLimite: 125,
    intermedioLimite: 200,
    basico: 0.80,
    intermedio: 1.00,
    excedente: 3.55
  }
};

// ---------- OCR PDF ----------
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

// ---------- OCR Imagen ----------
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

// ---------- Detectar consumo ----------
function detectarConsumo(texto) {
  const lineas = texto.split("\n");
  let consumo = 0;

  for (let linea of lineas) {
    if (linea.toLowerCase().includes("kwh")) {
      const numeros = linea.match(/\d+/g);
      if (numeros && numeros.length >= 1) {
        consumo = parseInt(numeros[numeros.length - 1]);
      }
    }
  }

  return consumo;
}

// ---------- Detectar tarifa ----------
function detectarTarifa(texto) {
  const match = texto.match(/tarifa\s*1[a-b]?/i);
  if (match) return match[0].replace("Tarifa ", "");
  return null;
}

// ---------- Calcular costo por bloques ----------
function calcularCosto(consumo, tipoTarifa) {
  const t = tarifasCFE[tipoTarifa];
  let restante = consumo;
  let total = 0;

  let basico = Math.min(restante, t.basicoLimite);
  total += basico * t.basico;
  restante -= basico;

  let intermedio = Math.min(restante, t.intermedioLimite - t.basicoLimite);
  total += intermedio * t.intermedio;
  restante -= intermedio;

  if (restante > 0) {
    total += restante * t.excedente;
  }

  return total;
}

// ---------- Evento principal ----------
inputArchivo.addEventListener("change", async () => {
  const archivo = inputArchivo.files[0];
  if (!archivo) return;

  estado.textContent = "Procesando recibo... ⏳";
  resultado.innerHTML = "";

  let texto = "";

  if (archivo.type === "application/pdf") {
    texto = await extraerTextoPDF(archivo);
  } else {
    texto = await extraerTextoImagen(archivo);
  }

  const consumo = detectarConsumo(texto);
  let tarifaDetectada = detectarTarifa(texto);

  if (!tarifaDetectada) {
    tarifaDetectada = tarifaManual.value;
  }

  const costo = calcularCosto(consumo, tarifaDetectada);

  estado.textContent = "Análisis completo ✅";

  resultado.innerHTML = `
    <h3>Resultados</h3>
    <p><strong>Consumo detectado:</strong> ${consumo} kWh</p>
    <p><strong>Tarifa:</strong> ${tarifaDetectada}</p>
    <p><strong>Costo estimado:</strong> $${costo.toFixed(2)} MXN</p>
  `;
});
