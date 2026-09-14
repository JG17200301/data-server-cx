/**
 * =========================================================
 * Backend de Registro de Asistencia (Google Apps Script)
 * =========================================================
 * Este archivo va DENTRO de tu Google Sheet:
 * Extensiones > Apps Script > pega este código > Guardar.
 * Luego: Implementar > Nueva implementación > Aplicación web.
 * Ver README.md para el paso a paso completo.
 */

var CONFIG = {
  // Nombre EXACTO de la pestaña (tab) con la base de empleados
  HOJA_EMPLEADOS: 'Empleados',        // <-- ajusta si tu pestaña se llama distinto

  // Nombre EXACTO de la pestaña donde ya guardas la asistencia
  HOJA_ASISTENCIA: 'Asistencia',      // <-- ajusta si tu pestaña se llama distinto

  // Debe ser exactamente el mismo valor que CONFIG.APP_TOKEN en js/app.js
  APP_TOKEN: 'claro-asistencia-2026'
};

/* =========================================================
   Mapeo de columnas por NOMBRE de encabezado (no por posición),
   así no importa el orden en que tengas las columnas.
   ========================================================= */

// Alias reconocidos para las columnas de la hoja de EMPLEADOS.
// Basado en tus encabezados reales:
// CODIGO | NOMBRE DEL EMPLEADO | ZONA | OCUPACION | CORREO |
// JEFE INMEDIATO | codigo empleado Mesa
var ALIAS_EMPLEADOS = {
  codigo:    ['codigo'],
  nombre:    ['nombre del empleado'],
  zona:      ['zona'],
  ocupacion: ['ocupacion'],
  correo:    ['correo'],
  jefe:      ['jefe inmediato'],
  numero:    ['numero'],
  mesa:      ['mesa']
};

// Palabras clave para reconocer columnas en tu hoja de ASISTENCIA
// (se usan tal cual estén tus encabezados actuales).
var ALIAS_ASISTENCIA = {
  fecha:     ['fecha'],
  hora:      ['hora'],
  codigo:    ['codigo'],
  nombre:    ['nombre del empleado'],
  mesa:      ['mesa'],
  zona:      ['zona'],
  ocupacion: ['ocupacion']
};

/** Quita acentos, pasa a minúsculas y normaliza espacios */
function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devuelve { campo: indiceDeColumna } buscando por nombre de encabezado */
function mapearColumnas_(headers, alias) {
  var normalizados = headers.map(normalizar_);
  var mapa = {};
  Object.keys(alias).forEach(function (campo) {
    for (var a = 0; a < alias[campo].length; a++) {
      var idx = normalizados.indexOf(alias[campo][a]);
      if (idx !== -1) {
        mapa[campo] = idx;
        break;
      }
    }
  });
  return mapa;
}

function respuestaJSON_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   Puntos de entrada del Web App
   ========================================================= */

function doGet(e) {
  try {
    var params = e.parameter || {};
    if (params.token !== CONFIG.APP_TOKEN) {
      return respuestaJSON_({ ok: false, error: 'No autorizado' });
    }
    if (params.action === 'buscar') {
      return buscarEmpleado_(params.codigo);
    }
    return respuestaJSON_({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return respuestaJSON_({ ok: false, error: 'Error interno: ' + err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== CONFIG.APP_TOKEN) {
      return respuestaJSON_({ ok: false, error: 'No autorizado' });
    }
    if (body.action === 'registrar') {
      return registrarAsistencia_(body);
    }
    return respuestaJSON_({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return respuestaJSON_({ ok: false, error: 'Error interno: ' + err.message });
  }
}

/* =========================================================
   Lógica: buscar empleado por código
   ========================================================= */
function buscarEmpleado_(codigoBuscado) {
  if (!codigoBuscado) {
    return respuestaJSON_({ ok: true, encontrado: false });
  }

  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJA_EMPLEADOS);
  if (!hoja) {
    return respuestaJSON_({ ok: false, error: 'No existe la hoja "' + CONFIG.HOJA_EMPLEADOS + '". Revisa CONFIG.HOJA_EMPLEADOS.' });
  }

  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) {
    return respuestaJSON_({ ok: true, encontrado: false });
  }

  var headers = datos[0];
  var col = mapearColumnas_(headers, ALIAS_EMPLEADOS);

  if (col.codigo === undefined) {
    return respuestaJSON_({ ok: false, error: 'No se encontró una columna de código en "' + CONFIG.HOJA_EMPLEADOS + '".' });
  }

  var buscado = normalizar_(codigoBuscado);

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var codigoFila = normalizar_(fila[col.codigo]);
    if (codigoFila && codigoFila === buscado) {
      return respuestaJSON_({
        ok: true,
        encontrado: true,
        codigo: String(fila[col.codigo]),
        nombre: col.nombre !== undefined ? String(fila[col.nombre]) : '',
        mesa: col.mesa !== undefined ? String(fila[col.mesa]) : '',
        zona: col.zona !== undefined ? String(fila[col.zona]) : '',
        ocupacion: col.ocupacion !== undefined ? String(fila[col.ocupacion]) : ''
      });
    }
  }

  return respuestaJSON_({ ok: true, encontrado: false });
}

/* =========================================================
   Lógica: registrar asistencia
   ========================================================= */
function registrarAsistencia_(body) {
  var codigo = String(body.codigo || '').trim();
  var nombre = String(body.nombre || '').trim();
  var mesa = String(body.mesa || '').trim();
  var zona = String(body.zona || '').trim();
  var ocupacion = String(body.ocupacion || '').trim();

  if (!codigo || !nombre || !mesa) {
    return respuestaJSON_({ ok: false, error: 'Faltan datos para registrar la asistencia.' });
  }

  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.HOJA_ASISTENCIA);
  if (!hoja) {
    return respuestaJSON_({ ok: false, error: 'No existe la hoja "' + CONFIG.HOJA_ASISTENCIA + '". Revisa CONFIG.HOJA_ASISTENCIA.' });
  }

  var zonaHoraria = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || 'America/Tegucigalpa';
  var ahora = new Date();
  var fechaTexto = Utilities.formatDate(ahora, zonaHoraria, 'dd/MM/yyyy');
  var horaTexto = Utilities.formatDate(ahora, zonaHoraria, 'HH:mm:ss');

  var ultimaColumna = Math.max(hoja.getLastColumn(), 1);
  var headers = hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0];
  var col = mapearColumnas_(headers, ALIAS_ASISTENCIA);

  var valores = {
    fecha: fechaTexto,
    hora: horaTexto,
    codigo: codigo,
    nombre: nombre,
    mesa: mesa,
    zona: zona,
    ocupacion: ocupacion
  };

  var nuevaFila;
  if (Object.keys(col).length > 0) {
    // Coloca cada dato en la columna cuyo encabezado coincide
    nuevaFila = new Array(headers.length).fill('');
    Object.keys(col).forEach(function (campo) {
      nuevaFila[col[campo]] = valores[campo];
    });
  } else {
    // Respaldo si no se reconoce ningún encabezado:
    // Fecha | Hora | Código | Nombre | Mesa
    nuevaFila = [fechaTexto, horaTexto, codigo, nombre, mesa];
  }

  hoja.appendRow(nuevaFila);

  return respuestaJSON_({ ok: true, mesa: mesa, fecha: fechaTexto, hora: horaTexto });
}

