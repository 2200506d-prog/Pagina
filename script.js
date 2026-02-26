  // Configuración de worker para PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  const inputArchivo = document.getElementById("archivo");
  const estado = document.getElementById("estado");
  const textoDetectado = document.getElementById("textoDetectado");
  const tablaDiv = document.getElementById("tabla");
  const totalDiv = document.getElementById("total");
  const costoDiv = document.getElementById("costo");
  const tarifaSelect = document.getElementById("tarifa");

  // Convierte PDF a imagen para OCR
  async function extraerTextoDePDF(archivo) {
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

  // Lee imagen directamente
  async function extraerTextoDeImagen(archivo) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async function () {
        const { data: { text } } = await Tesseract.recognize(reader.result, 'spa');
        resolve(text);
      };
      reader.readAsDataURL(archivo);
    });
  }

  inputArchivo.addEventListener("change", async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;

    estado.textContent = "Leyendo el recibo... Esto puede tardar unos segundos ⏳";
    textoDetectado.style.display = "none";
    tablaDiv.innerHTML = "";
    totalDiv.textContent = "";
    costoDiv.textContent = "";

    let texto = "";

    try {
      if (archivo.type === "application/pdf") {
        texto = await extraerTextoDePDF(archivo);
      } else {
        texto = await extraerTextoDeImagen(archivo);
      }
    } catch (err) {
      estado.textContent = "Error al procesar el archivo 😕";
      console.error(err);
      return;
    }

    estado.textContent = "Procesamiento completo ✅";
    textoDetectado.innerHTML = "<h4>Texto detectado:</h4>" + texto.replace(/\n/g, "<br>");

    // --- NUEVA LÓGICA DE EXTRACCIÓN ---
    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l);
    let consumoReal = 0;
    let totalPagarLeido = 0;

    for (let i = 0; i < lineas.length; i++) {
      let linea = lineas[i].toLowerCase();

      // 1. Detectar el Consumo Real (Evitando sumar las lecturas del medidor)
      if (linea.includes('kwh') || linea.includes('energía') || linea.includes('energia')) {
        const numeros = linea.match(/\d+/g);
        if (numeros && numeros.length >= 3) {
          // CFE suele poner: [Lectura Actual] [Lectura Anterior] [Consumo]
          let actual = parseInt(numeros[0]);
          let anterior = parseInt(numeros[1]);
          let consumo = parseInt(numeros[numeros.length - 1]); 
          
          // Verificamos por lógica matemática que no estemos tomando la lectura del medidor
          if (Math.abs(actual - anterior) === consumo || consumo < actual) {
              consumoReal = consumo;
          }
        } else if (numeros && numeros.length === 1) {
           if (consumoReal === 0) consumoReal = parseInt(numeros[0]);
        }
      }

      // 2. Intentar leer el "Total a Pagar" directamente del recibo
      if (linea.includes('total') || linea.includes('pagar') || linea.includes('importe')) {
         // Busca formatos de dinero ej. 1,200.50 o 350
         let regexDinero = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
         let match = linea.match(regexDinero);
         if (match && parseFloat(match[1].replace(',', '')) > 0) {
             totalPagarLeido = parseFloat(match[1].replace(',', ''));
         }
      }
    }

    if (consumoReal === 0) {
      tablaDiv.innerHTML = "<p>No se detectó el consumo exacto. Revisa que la foto esté bien enfocada en los números.</p>";
      return;
    }

    // Mostrar resultados
    tablaDiv.innerHTML = `<table><tr><th>Concepto</th><th>Valor Detectado</th></tr>
                          <tr><td>Consumo facturado</td><td>${consumoReal} kWh</td></tr></table>`;

    totalDiv.textContent = `⚡ Consumo real detectado: ${consumoReal} kWh`;

    // Cálculo estimado (tarifa plana) vs Lo que leyó del papel
    const tarifa = parseFloat(tarifaSelect.value);
    const costoEstimado = consumoReal * tarifa;

    if (totalPagarLeido > 0) {
       costoDiv.innerHTML = `💰 <strong>Total a pagar leído del recibo: $${totalPagarLeido.toFixed(2)} MXN</strong><br>
                             <span style="font-size: 0.85em; color: gray; margin-top:5px; display:block;">
                             (Cálculo matemático simple sin IVA/DAP: $${costoEstimado.toFixed(2)} MXN)</span>`;
    } else {
       costoDiv.innerHTML = `💰 Costo estimado matemático: $${costoEstimado.toFixed(2)} MXN <br>
                             <span style="font-size: 0.8em; color: gray;">(No se pudo leer el total exacto del recibo impreso)</span>`;
    }
  });
