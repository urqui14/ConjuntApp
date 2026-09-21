// ==========================================
// 1. CAPTURA DE ELEMENTOS
// ==========================================
const inputU = document.getElementById('inputU');
const inputA = document.getElementById('inputA');
const inputB = document.getElementById('inputB');
const inputC = document.getElementById('inputC');
const inputExpresion = document.getElementById('inputExpresion');
const btnEvaluar = document.getElementById('btnEvaluar');
const btnCartesiano = document.getElementById('btnCartesiano');
const botonesSimbolos = document.querySelectorAll('.btn-simbolo');
const listaPasosUI = document.getElementById('listaPasos');
const resultadoFinalUI = document.getElementById('resultadoFinal');
const zonaGrafica = document.getElementById('zonaGrafica');
// Forzar mayúsculas automáticamente en la caja de expresión
inputExpresion.addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});

botonesSimbolos.forEach(boton => {
    boton.addEventListener('click', () => {
        inputExpresion.value += boton.innerText;
        inputExpresion.focus();
    });
});

// ==========================================
// 2. OPERACIONES Y LÓGICA DE CONJUNTOS
// ==========================================
function crearConjunto(texto) {
    const elementos = texto.split(',').map(item => item.trim()).filter(item => item !== "" && item !== "Ø");
    return new Set(elementos);
}

function union(setA, setB) { return new Set([...setA, ...setB]); }
function interseccion(setA, setB) { return new Set([...setA].filter(x => setB.has(x))); }
function diferencia(setA, setB) { return new Set([...setA].filter(x => !setB.has(x))); }
function diferenciaSimetrica(setA, setB) { return union(diferencia(setA, setB), diferencia(setB, setA)); }
function complemento(setA, setU) { return diferencia(setU, setA); }

// Formateo para incluir el Elemento Vacío por defecto visualmente
function imprimirConjunto(conjunto) {
    if (!conjunto || conjunto.size === 0) return "{ Ø }";
    return "{ " + [...conjunto].join(", ") + " }";
}

// ==========================================
// 3. CONJUNTO POTENCIA (2^N)
// ==========================================
function generarPotencia(arreglo) {
    const result = [[]]; // El vacío siempre inicia
    for (let value of arreglo) {
        const length = result.length;
        for (let i = 0; i < length; i++) {
            let temp = result[i].slice(0);
            temp.push(value);
            result.push(temp);
        }
    }
    return result;
}

window.calcularPotenciaUI = function(nombreConjunto) {
    zonaGrafica.classList.add('d-none');
    let inputSeleccionado;
    if(nombreConjunto === 'A') inputSeleccionado = inputA.value;
    if(nombreConjunto === 'B') inputSeleccionado = inputB.value;
    if(nombreConjunto === 'C') inputSeleccionado = inputC.value;

    const elementos = Array.from(crearConjunto(inputSeleccionado));
    const potencia = generarPotencia(elementos);
    
    // Formatear salida con el elemento vacío y llaves internas
    const representacionTextual = "{ " + potencia.map(sub => sub.length === 0 ? "Ø" : `{${sub.join(", ")}}`).join(", ") + " }";

    resultadoFinalUI.innerHTML = `2<sup>${nombreConjunto}</sup> = ${representacionTextual}`;
    listaPasosUI.innerHTML = `
        <li class="list-group-item"><strong>Fórmula:</strong> 2<sup>n</sup> = 2<sup>${elementos.length}</sup> = ${Math.pow(2, elementos.length)} subconjuntos.</li>
        <li class="list-group-item text-primary">El conjunto potencia siempre incluye el conjunto vacío (Ø) y el conjunto mismo.</li>
    `;
};

// ==========================================
// 4. MOTOR EVALUADOR DE EXPRESIONES 
// ==========================================
function evaluarOperacionSimple(op, setA, setB, setU) {
    switch (op) {
        case 'U': return union(setA, setB);
        case '∩': return interseccion(setA, setB);
        case '-': return diferencia(setA, setB);
        case 'Δ': return diferenciaSimetrica(setA, setB);
        default: throw new Error(`Operador no reconocido: ${op}`);
    }
}

function resolverSinParentesis(exp, diccionario, listaPasos, getNextTempId) {
    let tokens = exp.match(/(T\d+|[A-C U ∩ \- Δ])/g);
    if (!tokens) return exp;
    if (tokens.length === 1) return tokens[0];

    while (tokens.length > 1) {
        let opIndex = tokens.findIndex(t => ['∩', 'U', '-', 'Δ'].includes(t));
        if (opIndex === -1) break;
        let op = tokens[opIndex];
        let izqName = tokens[opIndex - 1];
        let derName = tokens[opIndex + 1];
        let res = evaluarOperacionSimple(op, diccionario[izqName], diccionario[derName], diccionario['U']);
        
        let tempName = `T${getNextTempId()}`;
        diccionario[tempName] = res;
        listaPasos.push(`<strong>Paso:</strong> ${tempName} = ${izqName} ${op} ${derName} = ${imprimirConjunto(res)}`);
        tokens.splice(opIndex - 1, 3, tempName);
    }
    return tokens[0];
}

function evaluarExpresionCompleja(exp, diccionario, listaPasos) {
    let expresion = exp.replace(/\s+/g, ''); 
    let contadorTemporales = 1;

    const regexComplemento = /([A-C]|T\d+)'/g;
    while (regexComplemento.test(expresion)) {
        expresion = expresion.replace(regexComplemento, (m, name) => {
            let resComp = complemento(diccionario[name], diccionario['U']);
            let tName = `T${contadorTemporales++}`;
            diccionario[tName] = resComp;
            listaPasos.push(`<strong>Complemento:</strong> ${tName} = ${name}' = ${imprimirConjunto(resComp)}`);
            return tName;
        });
    }

    const regexParéntesis = /\(([^()]+)\)/;
    while (regexParéntesis.test(expresion)) {
        expresion = expresion.replace(regexParéntesis, (m, sub) => resolverSinParentesis(sub, diccionario, listaPasos, () => contadorTemporales++));
    }

    return diccionario[expresion] ? diccionario[expresion] : diccionario[resolverSinParentesis(expresion, diccionario, listaPasos, () => contadorTemporales++)];
}

btnEvaluar.addEventListener('click', () => {
    zonaGrafica.classList.add('d-none');
    listaPasosUI.innerHTML = ""; 
    try {
        const diccionario = {
            'U': crearConjunto(inputU.value),
            'A': crearConjunto(inputA.value),
            'B': crearConjunto(inputB.value),
            'C': crearConjunto(inputC.value)
        };
        const expresion = inputExpresion.value.trim();
        if (!expresion) return alert("Ingresa una expresión.");

        let pasos = [];
        const conjuntoResultado = evaluarExpresionCompleja(expresion, diccionario, pasos);
        resultadoFinalUI.innerHTML = `${expresion} = ${imprimirConjunto(conjuntoResultado)}`;

        pasos.forEach(p => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = p;
            listaPasosUI.appendChild(li);
        });
    } catch (e) {
        resultadoFinalUI.innerHTML = `<span class="text-danger">Error de sintaxis</span>`;
    }
});

// ==========================================
// 5. PRODUCTO CARTESIANO Y GRÁFICOS (Canvas + CSS Grid)
// ==========================================
btnCartesiano.addEventListener('click', () => {
    const arrA = Array.from(crearConjunto(inputA.value));
    const arrB = Array.from(crearConjunto(inputB.value));
    
    if (arrA.length === 0 || arrB.length === 0) return alert("A y B deben tener elementos.");

    zonaGrafica.classList.remove('d-none');
    resultadoFinalUI.innerHTML = `Producto Cartesiano (A × B)`;
    
    let pares = [];
    arrA.forEach(a => arrB.forEach(b => pares.push(`(${a}, ${b})`)));

    listaPasosUI.innerHTML = `
        <li class="list-group-item"><strong>Cardinalidad:</strong> |A × B| = ${arrA.length} × ${arrB.length} = ${pares.length} pares.</li>
        <li class="list-group-item text-muted">${pares.join(' ; ')}</li>
    `;

    dibujarDiagramaRelacional(arrA, arrB);
    dibujarPlanoCartesiano(arrA, arrB);
});

function dibujarDiagramaRelacional(arrA, arrB) {
    const canvas = document.getElementById('canvasRelacional');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Coordenadas de los óvalos
    const xA = 100, xB = 300, yCentro = 100, radioY = 80, radioX = 40;

    // Dibujar Óvalos
    ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.ellipse(xA, yCentro, radioX, radioY, 0, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(xB, yCentro, radioX, radioY, 0, 0, 2 * Math.PI); ctx.stroke();
    ctx.font = "16px Arial"; ctx.fillText("A", xA - 5, 15); ctx.fillText("B", xB - 5, 15);

    // Posiciones de los puntos
    const puntosA = arrA.map((val, i) => ({ val, x: xA, y: yCentro - radioY + 30 + (i * 120 / (arrA.length || 1)) }));
    const puntosB = arrB.map((val, i) => ({ val, x: xB, y: yCentro - radioY + 30 + (i * 120 / (arrB.length || 1)) }));

    // Trazar las líneas del producto cruzado
    ctx.strokeStyle = 'rgba(220, 53, 69, 0.5)'; // Color rojo translúcido
    puntosA.forEach(pA => {
        puntosB.forEach(pB => {
            ctx.beginPath(); ctx.moveTo(pA.x + 10, pA.y); ctx.lineTo(pB.x - 10, pB.y); ctx.stroke();
        });
    });

    // Dibujar textos
    ctx.fillStyle = '#000';
    puntosA.forEach(p => ctx.fillText(p.val, p.x - 10, p.y + 5));
    puntosB.forEach(p => ctx.fillText(p.val, p.x - 10, p.y + 5));
}

function dibujarPlanoCartesiano(arrA, arrB) {
    const contenedor = document.getElementById('contenedorPlanoCartesiano');
    
    // Configurar el Grid de CSS dinámicamente
    let htmlGrid = `<div class="plano-cartesiano" style="grid-template-columns: 40px repeat(${arrA.length}, 60px); grid-template-rows: repeat(${arrB.length}, 60px) 40px;">`;

    // Filas (De arriba hacia abajo, eje Y inverso)
    for (let i = arrB.length - 1; i >= 0; i--) {
        htmlGrid += `<div class="eje-y-label align-self-center">${arrB[i]}</div>`; // Etiqueta Y
        for (let j = 0; j < arrA.length; j++) {
            htmlGrid += `<div class="d-flex align-items-center justify-content-center border-bottom border-start border-light">
                            <div class="punto-cartesiano">
                                <span class="etiqueta-punto">(${arrA[j]}, ${arrB[i]})</span>
                            </div>
                         </div>`;
        }
    }

    // Fila inferior para etiquetas del Eje X
    htmlGrid += `<div></div>`; // Esquina vacía
    for (let j = 0; j < arrA.length; j++) {
        htmlGrid += `<div class="eje-x-label">${arrA[j]}</div>`;
    }

    htmlGrid += `</div>`;
    contenedor.innerHTML = htmlGrid;
}

// ==========================================
// 6. LIMPIAR INTERFAZ
// ==========================================
document.getElementById('btnLimpiar').addEventListener('click', () => {
    inputU.value = ''; inputA.value = ''; inputB.value = ''; inputC.value = ''; inputExpresion.value = '';
    resultadoFinalUI.innerHTML = 'Esperando acción...';
    listaPasosUI.innerHTML = '<li class="list-group-item text-muted">Aún no hay operaciones calculadas.</li>';
    zonaGrafica.classList.add('d-none');
});