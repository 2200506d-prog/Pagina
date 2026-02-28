pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const IVA = 0.16;
const CARGO_FIJO = 65; // promedio doméstico
const DAP_PORCENTAJE = 0.05;

const tarifasCFE = {
  "1": { basicoLimite: 75, intermedioLimite: 140, basico: 1.05, intermedio: 1.28, excedente: 3.75 },
  "1A": { basicoLimite: 100, intermedioLimite: 150, basico: 0.98, intermedio: 1.20, excedente: 3.80 },
  "1B": { basicoLimite: 125, intermedioLimite: 200, basico: 0.95, intermedio: 1.15, excedente: 3.85 },
  "DAC": { basicoLimite: 0, intermedioLimite: 0, basico: 0, intermedio: 0, excedente: 5.20 }
};

const inputArchivo = document.getElementById("archivo");
const estado = document.getElementById("estado");
const resultado = document.getElementById("resultado");

async function extraerTexto(archivo) {
  if (archivo.type === "application/pdf") {
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
      const { data: { text } } =
        await Tesseract.recognize(canvas, 'spa');

      texto += text + "\n";
    }
    return texto;
  } else {
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
}

// 🔎 Mejor detección de consumo
function detectarConsumo(texto) {
  const regex = /(\d+)\s*kwh/i;
  const match = texto.match(regex);
  if (match) return parseInt(match[1]);
  return 0;
}

// 🔎 Detectar tarifa automática
function detectarTarifa(texto) {
  if (/dac/i.test(texto)) return "DAC";
  if (/tarifa\s*1a/i.test(texto)) return "1A";
  if (/tarifa\s*1b/i.test(texto)) return "1B";
  if (/tarifa\s*1/i.test(texto)) return "1";
  return "1"; // default
}

// 🔎 Detectar total real impreso
function detectarTotalReal(texto) {
  const posibles = texto.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
  if (!posibles) return 0;

  const numeros = posibles.map(v =>
    parseFloat(v.replace(/[^\d.]/g, ''))
  );

  return Math.max(...numeros);
}

// 💰 Cálculo real mejorado
function calcularCosto(consumo, tarifaTipo) {
  const t = tarifasCFE[tarifaTipo];
  let total = 0;
  let restante = consumo;

  if (tarifaTipo === "DAC") {
    total = consumo * t.excedente;
  } else {
    let basico = Math.min(restante, t.basicoLimite);
    total += basico * t.basico;
    restante -= basico;

    let intermedio = Math.min(restante, t.intermedioLimite - t.basicoLimite);
    total += intermedio * t.intermedio;
    restante -= intermedio;

    if (restante > 0) {
      total += restante * t.excedente;
    }
  }

  total += CARGO_FIJO;

  const iva = total * IVA;
  const dap = total * DAP_PORCENTAJE;

  return {
    subtotal: total,
    iva,
    dap,
    totalFinal: total + iva + dap
  };
}

inputArchivo.addEventListener("change", async () => {
  const archivo = inputArchivo.files[0];
  if (!archivo) return;

  estado.textContent = "Analizando recibo... ⏳";
  resultado.innerHTML = "";

  const texto = await extraerTexto(archivo);

  const consumo = detectarConsumo(texto);
  const tarifa = detectarTarifa(texto);
  const totalReal = detectarTotalReal(texto);

  const calculo = calcularCosto(consumo, tarifa);

  estado.textContent = "Análisis completo ✅";

  let diferencia = totalReal - calculo.totalFinal;

  resultado.innerHTML = `
    <h3>Resultado del análisis</h3>
    <p>⚡ Consumo detectado: ${consumo} kWh</p>
    <p>🏷 Tarifa detectada: ${tarifa}</p>
    <p>💵 Subtotal + Cargo fijo: $${calculo.subtotal.toFixed(2)}</p>
    <p>IVA: $${calculo.iva.toFixed(2)}</p>
    <p>DAP: $${calculo.dap.toFixed(2)}</p>
    <h3>Total estimado: $${calculo.totalFinal.toFixed(2)} MXN</h3>
    <hr>
    <p><strong>Total leído del recibo:</strong> $${totalReal.toFixed(2)} MXN</p>
    <p><strong>Diferencia:</strong> $${diferencia.toFixed(2)} MXN</p>
  `;
});
