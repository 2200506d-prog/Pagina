document.addEventListener('DOMContentLoaded', function() {
    // 1. Conectamos el script con el HTML (necesitas tener estos IDs en tu HTML)
    const inputArchivo = document.getElementById('archivoRecibo');
    const pantallaResultado = document.getElementById('resultado');

    // 2. Le decimos a la página que esté atenta cuando selecciones un archivo
    inputArchivo.addEventListener('change', function(evento) {
        const archivo = evento.target.files[0]; // Tomamos el archivo que subiste

        if (archivo) {
            const lector = new FileReader();

            // 3. Instrucciones de qué hacer cuando termine de leer el archivo
            lector.onload = function(e) {
                const textoDelArchivo = e.target.result;

                // 4. Buscar el consumo y el precio usando "Expresiones Regulares" (patrones de búsqueda)
                // OJO: Estos patrones asumen que el recibo dice algo como "Consumo: 150 kWh" y "Precio: 0.95"
                // Tendrás que ajustarlos dependiendo de cómo esté escrito exactamente en tu recibo.
                const buscarConsumo = /Consumo[:\s]+(\d+)\s*kWh/i; 
                const buscarPrecio = /Precio[:\s]+\$?(\d+\.\d+)/i;

                const resultadoConsumo = textoDelArchivo.match(buscarConsumo);
                const resultadoPrecio = textoDelArchivo.match(buscarPrecio);

                // 5. Guardamos los números encontrados o ponemos un aviso si no los encuentra
                let consumo = resultadoConsumo ? resultadoConsumo[1] : 'No detectado';
                let precio = resultadoPrecio ? resultadoPrecio[1] : 'No detectado';

                // 6. Mostramos el resultado en la pantalla de tu página
                pantallaResultado.innerHTML = `
                    <h3>Datos de tu recibo:</h3>
                    <p><strong>Consumo total:</strong> ${consumo} kWh</p>
                    <p><strong>Precio por kWh:</strong> $${precio}</p>
                `;
            };

            // 7. Esta línea arranca la lectura del archivo como si fuera texto
            lector.readAsText(archivo);
        }
    });
});
