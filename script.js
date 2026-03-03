document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mainBtn');
    const input = document.getElementById('userInput');
    const display = document.getElementById('displayArea');
    const result = document.getElementById('resultText');

    btn.addEventListener('click', () => {
        const valor = input.value.trim();

        if (valor !== "") {
            // Mostrar el área de resultado y el texto
            display.classList.remove('display-none');
            result.innerText = `Has enviado: ${valor}`;
            
            // Limpiar input
            input.value = "";
            console.log("Acción ejecutada correctamente en GitHub.");
        } else {
            alert("Por favor, ingresa algún dato.");
        }
    });
});
