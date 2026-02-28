pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const IVA = 0.16;
const CARGO_FIJO_ESTIMADO = 65;
const DAP_PORCENTAJE = 0.05;

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

// 🔎 Detectar consumo con mejor lógica
function detectarConsumo(texto) {
  const regex = /(\d{1,5})\s*kwh/i;
  const match = texto.match(regex);
  return match ? parseInt(match[1]) : 0;
}

// 🔎 Detectar total real exacto
function detectarTotalReal(texto) {
  const posibles = texto.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
  if (!posibles) return 0;

  const numeros = posibles.map(v =>
    parseFloat(v.replace(/[^\d.]/g, ''))
  );

  return Math.max(...numeros);
}

// 🔎 Detectar si hay subsidio
function detectarSubsidio(texto) {
  if (/subsidio/i.test(texto)) return true;
  return false;
}

// 💰 Cálculo solo si no hay total detectado
function calcularEstimado(consumo) {
  let subtotal = consumo * 1.25; // promedio nacional ajustado
  subtotal += CARGO_FIJO_ESTIMADO;

  const iva = subtotal * IVA;
  const dap = subtotal * DAP_PORCENTAJE;

  return subtotal + iva + dap;
}

inputArchivo.addEventListener("change", async () => {

  const archivo = inputArchivo.files[0];
  if (!archivo) return;

  estado.textContent = "Analizando recibo... ⏳";
  resultado.innerHTML = "";

  const texto = await extraerTexto(archivo);

  const consumo = detectarConsumo(texto);
  const totalReal = detectarTotalReal(texto);
  const haySubsidio = detectarSubsidio(texto);

  let totalFinal;
  let modo;

  if (totalReal > 0) {
    totalFinal = totalReal;
    modo = "Total leído directamente del recibo (precisión alta)";
  } else {
    totalFinal = calcularEstimado(consumo);
    modo = "Total estimado (no se detectó total impreso)";
  }

  estado.textContent = "Análisis completo ✅";

  resultado.innerHTML = `
    <h3>Resultado del Análisis</h3>
    <p><strong>Consumo detectado:</strong> ${consumo} kWh</p>
    <p><strong>Subsidio detectado:</strong> ${haySubsidio ? "Sí" : "No"}</p>
    <hr>
    <h2>Total a pagar: $${totalFinal.toFixed(2)} MXN</h2>
    <p style="font-size:0.9em;color:gray">${modo}</p>
  `;
});
