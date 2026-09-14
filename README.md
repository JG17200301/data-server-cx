# Registro de Asistencia — Claro

Página web (HTML/CSS/JS) para registrar asistencia de empleados. El empleado
ingresa su **código**, el sistema busca su nombre y la **mesa** asignada en tu
Google Sheet, y al presionar "Registrar asistencia" guarda un renglón nuevo en
tu hoja de asistencia.

## Cómo funciona (arquitectura)

```
Página web (GitHub Pages)  <-- fetch -->  Google Apps Script (Web App)  <-->  Google Sheets
   index.html / css / js         HTTP           apps-script/Code.gs         Empleados + Asistencia
```

No se usa ninguna API key de Google expuesta en el navegador: el "puente"
entre la página y tu hoja es un pequeño script de **Google Apps Script**
publicado como aplicación web. Es la forma estándar (y gratuita) de conectar
una página estática con Google Sheets.

## Estructura de archivos

```
index.html
css/styles.css
js/app.js              <- aquí pegas la URL de tu Apps Script (paso 4)
apps-script/Code.gs     <- este código va DENTRO del Google Sheet, no en GitHub
assets/                 <- opcional: coloca aquí tu logo real (logo-claro.png)
README.md
```

`apps-script/Code.gs` lo incluyo en el repo solo como respaldo/versión de
control, pero **debes pegarlo directamente en el editor de Apps Script de tu
Google Sheet** (no se ejecuta desde GitHub Pages).

---

## Lo que tienes que hacer tú

### 1. Revisar los nombres de tus pestañas en Google Sheets

Abre `apps-script/Code.gs` y confirma estas dos líneas al inicio:

```js
HOJA_EMPLEADOS: 'Empleados',
HOJA_ASISTENCIA: 'Asistencia',
```

Cámbialas si tus pestañas se llaman diferente (deben coincidir EXACTAMENTE,
mayúsculas/minúsculas no importan, pero el nombre sí).

El código ya sabe leer tus columnas reales de la hoja de empleados
(`CODIGO`, `NOMBRE DEL EMPLEADO`, `ZONA`, `OCUPACION`, `CORREO`,
`JEFE INMEDIATO`, `codigo empleado Mesa`) buscándolas **por nombre de
encabezado**, así que no importa el orden en que estén.

Para tu hoja de asistencia, el script busca columnas que contengan las
palabras `Fecha`, `Hora`, `Código`, `Nombre`, `Mesa`, `Zona`, `Ocupación` en
el encabezado (fila 1) y llena cada dato en la columna correspondiente. Si no
reconoce ningún encabezado, usa como respaldo el orden fijo:
`Fecha | Hora | Código | Nombre | Mesa`.

> Revisa que la fila 1 de tu hoja de asistencia tenga encabezados con esas
> palabras para que el guardado quede en las columnas correctas.

### 2. Pegar el backend en Apps Script

1. Abre tu Google Sheet (el que tiene la hoja de Empleados y Asistencia).
2. Menú **Extensiones > Apps Script**.
3. Borra el contenido de `Code.gs` que aparece por defecto y pega todo el
   contenido de `apps-script/Code.gs` de este repo.
4. Guarda (ícono de disco o Ctrl+S).

### 3. Publicar como Web App

1. En el editor de Apps Script, botón **Implementar > Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como:** Yo (tu cuenta).
   - **Quién tiene acceso:** Cualquier usuario.
4. Clic en **Implementar**. Google pedirá autorizar permisos (es tu propio
   script accediendo a tu propia hoja) — acepta.
5. Copia la **URL de la aplicación web** que te entrega (termina en `/exec`).

> Cada vez que edites `Code.gs` después de esto, debes volver a
> **Implementar > Gestionar implementaciones > editar (lápiz) > Nueva
> versión > Implementar** para que los cambios se apliquen. Si solo guardas
> el archivo, la versión publicada sigue siendo la anterior.

### 4. Conectar la página con tu Apps Script

Abre `js/app.js` y pega la URL copiada en el paso anterior:

```js
const CONFIG = {
  WEB_APP_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
  APP_TOKEN: "claro-asistencia-2026",
  ...
};
```

`APP_TOKEN` es una palabra clave simple para que no cualquiera que adivine tu
URL pueda usar el formulario. Cámbiala por un valor propio, **y pon el mismo
valor exacto** en `apps-script/Code.gs` (variable `CONFIG.APP_TOKEN`). No es
seguridad robusta, pero evita accesos casuales.

### 5. (Opcional) Poner el logo real de Claro

La página ya trae un logo de respaldo en CSS (círculo blanco + texto
"claro") para que se vea bien desde el primer momento. Si quieres el logo
oficial, coloca el archivo de imagen en `assets/logo-claro.png` — la página
lo detecta automáticamente y lo muestra en vez del texto.

### 6. Subir los archivos a tu repositorio de GitHub

Sube manteniendo esta estructura de carpetas:

```
tu-repo/
├── index.html
├── css/styles.css
├── js/app.js
├── apps-script/Code.gs   (solo como referencia/respaldo)
├── assets/logo-claro.png (opcional)
└── README.md
```

### 7. Activar GitHub Pages

1. En tu repositorio: **Settings > Pages**.
2. En "Build and deployment", **Source: Deploy from a branch**.
3. Branch: `main` (o la que uses), carpeta `/ (root)`.
4. Guarda. En unos minutos tu página estará disponible en:
   `https://<tu-usuario>.github.io/<nombre-del-repo>/`

### 8. Probar todo el flujo

1. Abre la URL de GitHub Pages.
2. Escribe un código de empleado que exista en tu hoja → debe autocompletar
   el nombre y mostrar la mesa asignada.
3. Presiona **Registrar asistencia** → debe aparecer un mensaje de
   confirmación y crearse un renglón nuevo en tu hoja de Asistencia.
4. Verifica en Google Sheets que el renglón quedó en las columnas correctas.

---

## Solución de problemas

- **"Código no encontrado" con un código que sí existe:** revisa que
  `HOJA_EMPLEADOS` en `Code.gs` coincida exactamente con el nombre de tu
  pestaña, y que la columna de código tenga el encabezado `CODIGO`.
- **"No autorizado":** el `APP_TOKEN` de `js/app.js` no coincide con el de
  `Code.gs`. Deben ser idénticos.
- **Error de red / no conecta:** confirma que la URL en `WEB_APP_URL`
  termine en `/exec` (no en `/dev`), y que la implementación tenga acceso
  "Cualquier usuario".
- **Los cambios en Apps Script no se reflejan:** recuerda crear una **nueva
  versión** al reimplementar (paso 3, nota al final).
- **Los datos caen en columnas equivocadas en Asistencia:** revisa que los
  encabezados de la fila 1 de esa hoja contengan palabras reconocibles
  (Fecha, Hora, Código, Nombre, Mesa, Zona, Ocupación).

## Qué necesitaba de ti / qué asumí

Como no llegaste a confirmar los nombres exactos de las pestañas ni las
columnas de tu hoja de Asistencia, el código quedó así:

- Asume pestañas llamadas **"Empleados"** y **"Asistencia"** (ajustable en
  una línea, ver paso 1).
- Para Empleados, usa tus columnas reales tal como las diste: `CODIGO`,
  `NOMBRE DEL EMPLEADO`, `ZONA`, `OCUPACION`, `CORREO`, `JEFE INMEDIATO`,
  `codigo empleado Mesa` (esta última se toma como el valor de "mesa
  asignada" y se muestra tal cual esté escrito, sea "Mesa 1", un número, etc).
- Para Asistencia, en vez de asumir un orden de columnas, el script busca
  los encabezados por nombre — así se adapta a como ya la tengas armada, sin
  necesidad de que me confirmes el orden exacto.
