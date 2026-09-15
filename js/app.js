/* =========================================================
   CONFIGURACIÓN
   ========================================================= */
const CONFIG = {
  // Pega aquí la URL de tu Web App de Google Apps Script
  // (termina en /exec). Ver README.md, paso 3.
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzCGzXbFt1wwGLORUQBcj-GJdzy43opW8uLcHdZILBgZgr_AMnbgUpDb5PYm43IEqOdzg/exec",

  // Debe ser exactamente el mismo valor que CONFIG.APP_TOKEN
  // en apps-script/Code.gs. Sirve como llave simple para que
  // no cualquiera pueda usar el endpoint si adivina la URL.
  APP_TOKEN: "claro-asistencia-2026"
};

/* =========================================================
   Elementos del DOM
   ========================================================= */
const form = document.getElementById("form-asistencia");
const inputCodigo = document.getElementById("input-codigo");
const inputNombre = document.getElementById("input-nombre");
const hintCodigo = document.getElementById("hint-codigo");
const btnValidar = document.getElementById("btn-validar");
const mesaBox = document.getElementById("mesa-box");
const mesaValor = document.getElementById("mesa-valor");
const btnRegistrar = document.getElementById("btn-registrar");
const mensaje = document.getElementById("mensaje");

const btnVerRegistrados = document.getElementById("btn-ver-registrados");
const overlayRegistrados = document.getElementById("overlay-registrados");
const btnCerrarRegistrados = document.getElementById("btn-cerrar-registrados");
const btnActualizarRegistrados = document.getElementById("btn-actualizar-registrados");
const inputBuscarRegistrados = document.getElementById("input-buscar-registrados");
const contadorRegistrados = document.getElementById("contador-registrados");
const estadoRegistrados = document.getElementById("estado-registrados");
const tablaRegistrados = document.getElementById("tabla-registrados");
const cuerpoTablaRegistrados = document.getElementById("cuerpo-tabla-registrados");

let empleadoActual = null; // { codigo, nombre, mesa, zona, ocupacion }
let registrosHoyCache = [];

/* =========================================================
   Utilidades de UI
   ========================================================= */
function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
}

function limpiarMensaje() {
  mensaje.textContent = "";
  mensaje.className = "mensaje";
}

function mostrarHint(texto, tipo) {
  hintCodigo.textContent = texto || " ";
  hintCodigo.className = "hint " + (tipo || "");
}

function resetEmpleado() {
  empleadoActual = null;
  inputNombre.value = "";
  mesaBox.hidden = true;
  mesaValor.textContent = "—";
  btnRegistrar.disabled = true;
}

function resetFormularioCompleto() {
  inputCodigo.value = "";
  resetEmpleado();
  mostrarHint("", "");
  inputCodigo.focus();
}

/* =========================================================
   Buscar empleado por código (GET a Apps Script)
   ========================================================= */
async function buscarEmpleado(codigo) {
  if (!codigo) {
    resetEmpleado();
    mostrarHint("Escribe un código antes de validar", "error");
    return;
  }

  mostrarHint("Buscando...", "");
  btnValidar.disabled = true;
  btnValidar.textContent = "Validando...";

  try {
    const url =
      CONFIG.WEB_APP_URL +
      "?action=buscar" +
      "&codigo=" + encodeURIComponent(codigo) +
      "&token=" + encodeURIComponent(CONFIG.APP_TOKEN);

    const resp = await fetch(url, { method: "GET" });
    const data = await resp.json();

    if (!data.ok) {
      resetEmpleado();
      mostrarHint(data.error || "Error al buscar el código", "error");
      return;
    }

    if (!data.encontrado) {
      resetEmpleado();
      mostrarHint("Código no encontrado", "error");
      return;
    }

    empleadoActual = data;
    inputNombre.value = data.nombre || "";
    mesaValor.textContent = data.mesa || "—";
    mesaBox.hidden = false;
    btnRegistrar.disabled = false;
    mostrarHint("Empleado encontrado", "ok");
  } catch (err) {
    resetEmpleado();
    mostrarHint("No se pudo conectar con la hoja. Intenta de nuevo.", "error");
    console.error(err);
  } finally {
    btnValidar.disabled = false;
    btnValidar.textContent = "Validar";
  }
}

/* =========================================================
   Eventos del código: escribir limpia la validación anterior;
   la búsqueda solo se dispara con el botón "Validar" o Enter.
   ========================================================= */
inputCodigo.addEventListener("input", () => {
  limpiarMensaje();
  resetEmpleado();
  mostrarHint("", "");
});

inputCodigo.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    buscarEmpleado(inputCodigo.value.trim());
  }
});

btnValidar.addEventListener("click", () => {
  limpiarMensaje();
  buscarEmpleado(inputCodigo.value.trim());
});

/* =========================================================
   Registrar asistencia (POST a Apps Script)
   ========================================================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarMensaje();

  if (!empleadoActual) {
    mostrarMensaje("Primero ingresa un código válido.", "error");
    return;
  }

  btnRegistrar.disabled = true;
  btnRegistrar.textContent = "Registrando...";

  try {
    const payload = {
      action: "registrar",
      token: CONFIG.APP_TOKEN,
      codigo: empleadoActual.codigo,
      nombre: empleadoActual.nombre,
      mesa: empleadoActual.mesa,
      zona: empleadoActual.zona || "",
      ocupacion: empleadoActual.ocupacion || ""
    };

    // Se envía como text/plain para evitar que el navegador
    // haga una solicitud de "preflight" (OPTIONS) que Apps
    // Script no responde. Ver README.md.
    const resp = await fetch(CONFIG.WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (!data.ok) {
      mostrarMensaje(data.error || "No se pudo registrar la asistencia.", "error");
      return;
    }

    mostrarMensaje(
      "Asistencia registrada: " + empleadoActual.nombre +
      " · Mesa " + data.mesa + " · " + data.hora,
      "ok"
    );

    setTimeout(resetFormularioCompleto, 1800);
  } catch (err) {
    mostrarMensaje("No se pudo conectar con la hoja. Intenta de nuevo.", "error");
    console.error(err);
  } finally {
    btnRegistrar.textContent = "Registrar asistencia";
  }
});

/* =========================================================
   Panel "Ver registrados" (empleados que ya registraron
   asistencia hoy)
   ========================================================= */
function abrirPanelRegistrados() {
  overlayRegistrados.hidden = false;
  document.body.style.overflow = "hidden";
  inputBuscarRegistrados.value = "";
  cargarRegistrados();
}

function cerrarPanelRegistrados() {
  overlayRegistrados.hidden = true;
  document.body.style.overflow = "";
}

async function cargarRegistrados() {
  tablaRegistrados.hidden = true;
  estadoRegistrados.hidden = false;
  estadoRegistrados.className = "panel-estado";
  estadoRegistrados.textContent = "Cargando...";
  contadorRegistrados.textContent = " ";
  btnActualizarRegistrados.disabled = true;

  try {
    const url =
      CONFIG.WEB_APP_URL +
      "?action=listado" +
      "&token=" + encodeURIComponent(CONFIG.APP_TOKEN);

    const resp = await fetch(url, { method: "GET" });
    const data = await resp.json();

    if (!data.ok) {
      estadoRegistrados.textContent = data.error || "No se pudo cargar la lista.";
      estadoRegistrados.className = "panel-estado error";
      registrosHoyCache = [];
      return;
    }

    registrosHoyCache = data.registros || [];
    renderizarRegistrados(inputBuscarRegistrados.value.trim());
  } catch (err) {
    estadoRegistrados.textContent = "No se pudo conectar con la hoja. Intenta de nuevo.";
    estadoRegistrados.className = "panel-estado error";
    registrosHoyCache = [];
    console.error(err);
  } finally {
    btnActualizarRegistrados.disabled = false;
  }
}

function renderizarRegistrados(filtroTexto) {
  const filtro = (filtroTexto || "").toLowerCase().trim();

  const filtrados = !filtro
    ? registrosHoyCache
    : registrosHoyCache.filter((r) => {
        return (
          (r.nombre || "").toLowerCase().includes(filtro) ||
          (r.codigo || "").toLowerCase().includes(filtro) ||
          (r.mesa || "").toLowerCase().includes(filtro)
        );
      });

  contadorRegistrados.textContent =
    registrosHoyCache.length + " empleado(s) registrado(s) hoy" +
    (filtro ? " · " + filtrados.length + " coinciden con la búsqueda" : "");

  if (filtrados.length === 0) {
    tablaRegistrados.hidden = true;
    estadoRegistrados.hidden = false;
    estadoRegistrados.className = "panel-estado";
    estadoRegistrados.textContent = registrosHoyCache.length === 0
      ? "Todavía no hay empleados registrados hoy."
      : "No hay coincidencias.";
    return;
  }

  estadoRegistrados.hidden = true;
  tablaRegistrados.hidden = false;

  cuerpoTablaRegistrados.innerHTML = "";
  filtrados.forEach((r) => {
    const fila = document.createElement("tr");

    const tdNombre = document.createElement("td");
    tdNombre.textContent = r.nombre || "—";

    const tdCodigo = document.createElement("td");
    tdCodigo.textContent = r.codigo || "—";

    const tdMesa = document.createElement("td");
    tdMesa.textContent = r.mesa || "—";
    tdMesa.className = "col-mesa";

    const tdHora = document.createElement("td");
    tdHora.textContent = r.hora || "—";

    fila.append(tdNombre, tdCodigo, tdMesa, tdHora);
    cuerpoTablaRegistrados.appendChild(fila);
  });
}

btnVerRegistrados.addEventListener("click", abrirPanelRegistrados);
btnCerrarRegistrados.addEventListener("click", cerrarPanelRegistrados);
btnActualizarRegistrados.addEventListener("click", cargarRegistrados);

overlayRegistrados.addEventListener("click", (e) => {
  if (e.target === overlayRegistrados) cerrarPanelRegistrados();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlayRegistrados.hidden) cerrarPanelRegistrados();
});

inputBuscarRegistrados.addEventListener("input", () => {
  renderizarRegistrados(inputBuscarRegistrados.value.trim());
});

/* Estado inicial */
resetEmpleado();
