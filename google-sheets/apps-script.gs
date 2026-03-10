// ============================================================
// AromaStudio - Registro de Ventas (Google Apps Script)
// ============================================================
// INSTRUCCIONES:
// 1. Crea un Google Sheet nuevo
// 2. Ve a Extensiones > Apps Script
// 3. Pega todo este codigo
// 4. Ejecuta la funcion "setup" (boton Play)
// 5. Acepta los permisos
// 6. Ve a Implementar > Nueva implementacion > App web
//    - Ejecutar como: Yo
//    - Acceso: Cualquier persona
// 7. Copia la URL del Web App y ponla en tu admin Config
// 8. Guarda la URL del formulario en tu celular
// ============================================================

const TAB_PRODUCTOS = 'Productos';
const TAB_VENTAS = 'Ventas';

// -----------------------------------------------------------
// SETUP - Ejecutar una sola vez
// -----------------------------------------------------------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Tab Productos ---
  let prod = ss.getSheetByName(TAB_PRODUCTOS);
  if (!prod) prod = ss.insertSheet(TAB_PRODUCTOS);
  prod.clear();
  prod.getRange('A1:G1').setValues([['ID','Marca','Nombre','ML','Costo PEN','Stock','Imagen']]);
  prod.getRange('A1:G1').setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#e0c068');
  prod.setFrozenRows(1);

  // --- Tab Ventas ---
  let ventas = ss.getSheetByName(TAB_VENTAS);
  if (!ventas) ventas = ss.insertSheet(TAB_VENTAS);
  ventas.clear();
  ventas.getRange('A1:I1').setValues([['Fecha','Producto','Marca','Cant','Precio Venta','Costo Unit','Subtotal','Ganancia','Canal']]);
  ventas.getRange('A1:I1').setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#e0c068');
  ventas.setFrozenRows(1);

  // --- Crear formulario ---
  const formUrl = crearFormulario_();

  SpreadsheetApp.getUi().alert(
    'Setup completo!\n\n' +
    'URL del formulario (guardalo en tu celular):\n' + formUrl + '\n\n' +
    'Ahora despliega como Web App:\n' +
    'Implementar > Nueva implementacion > App web'
  );
}

// -----------------------------------------------------------
// FORMULARIO
// -----------------------------------------------------------
function crearFormulario_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  let formId = props.getProperty('FORM_ID');
  let form;

  const opciones = getProductosConStock_();

  if (formId) {
    try {
      form = FormApp.openById(formId);
      // Actualizar opciones del dropdown
      const items = form.getItems();
      for (const item of items) {
        if (item.getTitle() === 'Producto') {
          item.asListItem().setChoiceValues(opciones.length ? opciones : ['Sin stock']);
        }
      }
      return form.getPublishedUrl();
    } catch (e) { /* form borrado, crear nuevo */ }
  }

  // Crear formulario nuevo
  form = FormApp.create('AromaStudio - Registrar Venta');
  form.setDescription('Registra cada venta aqui. El stock se actualiza automaticamente.');

  form.addListItem()
    .setTitle('Producto')
    .setChoiceValues(opciones.length ? opciones : ['Sin stock - sincroniza primero'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Cantidad')
    .setHelpText('Cuantas unidades vendiste')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Precio de Venta (Soles)')
    .setHelpText('Precio por unidad en soles')
    .setRequired(true);

  form.addListItem()
    .setTitle('Canal')
    .setChoiceValues(['WhatsApp','Presencial','Instagram','TikTok','Otro'])
    .setRequired(true);

  // Vincular respuestas al sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  props.setProperty('FORM_ID', form.getId());

  // Trigger para cuando alguien responde el form
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  return form.getPublishedUrl();
}

function getProductosConStock_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prod = ss.getSheetByName(TAB_PRODUCTOS);
  if (!prod || prod.getLastRow() < 2) return [];

  const data = prod.getRange(2, 1, prod.getLastRow() - 1, 6).getValues();
  const opciones = [];
  for (const row of data) {
    const stock = row[5];
    if (stock > 0) {
      opciones.push(row[1] + ' - ' + row[2] + ' ' + row[3] + 'ml [' + stock + ' disp.]');
    }
  }
  return opciones;
}

// -----------------------------------------------------------
// CUANDO SE REGISTRA UNA VENTA (Form Submit)
// -----------------------------------------------------------
function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prod = ss.getSheetByName(TAB_PRODUCTOS);
  const ventas = ss.getSheetByName(TAB_VENTAS);

  const r = e.response.getItemResponses();
  const productoStr = r[0].getResponse();
  const cantidad = parseInt(r[1].getResponse()) || 1;
  const precioVenta = parseFloat(r[2].getResponse()) || 0;
  const canal = r[3].getResponse();

  // Buscar producto
  const data = prod.getRange(2, 1, prod.getLastRow() - 1, 6).getValues();
  let fila = -1;
  for (let i = 0; i < data.length; i++) {
    const label = data[i][1] + ' - ' + data[i][2] + ' ' + data[i][3] + 'ml';
    if (productoStr.startsWith(label)) {
      fila = i;
      break;
    }
  }
  if (fila === -1) return;

  const marca = data[fila][1];
  const nombre = data[fila][2];
  const costoUnit = data[fila][4];
  const stockActual = data[fila][5];

  // Descontar stock
  prod.getRange(fila + 2, 6).setValue(Math.max(0, stockActual - cantidad));

  // Registrar venta
  const subtotal = precioVenta * cantidad;
  const ganancia = subtotal - (costoUnit * cantidad);

  ventas.appendRow([
    new Date(),
    nombre,
    marca,
    cantidad,
    precioVenta,
    costoUnit,
    subtotal,
    ganancia,
    canal
  ]);

  // Actualizar opciones del formulario (stock cambio)
  crearFormulario_();

  // Notificar al backend para descontar stock del inventario retail
  notifyBackend_(data[fila][0], cantidad, precioVenta, canal);
}

// -----------------------------------------------------------
// NOTIFICAR AL BACKEND (cuando se vende via formulario)
// -----------------------------------------------------------
function notifyBackend_(productId, cantidad, precioVenta, canal) {
  var props = PropertiesService.getScriptProperties();
  var backendUrl = props.getProperty('BACKEND_URL');
  var apiKey = props.getProperty('API_KEY');

  if (!backendUrl || !apiKey) return; // No configurado, saltar

  try {
    var response = UrlFetchApp.fetch(backendUrl + '/api/retail/form-sale', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        productId: productId,
        quantity: cantidad,
        salePricePen: precioVenta,
        channel: canal,
        apiKey: apiKey
      }),
      muteHttpExceptions: true
    });
    console.log('Backend notificado: ' + response.getContentText());
  } catch (err) {
    console.log('Error al notificar backend: ' + err.message);
  }
}

// -----------------------------------------------------------
// WEB APP ENDPOINTS
// -----------------------------------------------------------

// POST: recibir datos del admin panel
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'syncStock') {
      return syncStock_(body.products, body.backendUrl, body.apiKey);
    }

    if (body.action === 'registerSale') {
      return registrarVentaManual_(body);
    }

    return jsonResponse_({ error: 'Accion no reconocida' });
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

// GET: obtener datos para el dashboard del admin
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'stats')  return getStats_();
  if (action === 'ventas') return getVentas_();
  if (action === 'formUrl') return getFormUrl_();
  if (action === 'getSheetStock') return getSheetStock_();

  return jsonResponse_({ error: 'Usa ?action=stats|ventas|formUrl|getSheetStock' });
}

// -----------------------------------------------------------
// SYNC STOCK (llamado desde admin panel)
// -----------------------------------------------------------
function syncStock_(products, backendUrl, apiKey) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var prod = ss.getSheetByName(TAB_PRODUCTOS);

  // Leer stock actual del Sheet para productos existentes
  var existingStock = {};
  if (prod.getLastRow() > 1) {
    var existingData = prod.getRange(2, 1, prod.getLastRow() - 1, 7).getValues();
    for (var i = 0; i < existingData.length; i++) {
      var id = existingData[i][0];
      if (id) existingStock[id] = existingData[i][5]; // id -> stock actual en sheet
    }
    prod.getRange(2, 1, prod.getLastRow() - 1, 7).clearContent();
  }

  // Escribir productos: CONSERVAR stock del Sheet para productos existentes
  var newCount = 0;
  var rows = products.map(function(p) {
    var stock;
    if (existingStock[p.id] !== undefined) {
      // Producto ya existia en Sheet: conservar su stock (puede tener ventas descontadas)
      stock = existingStock[p.id];
    } else {
      // Producto NUEVO: usar stock del backend
      stock = p.stock;
      newCount++;
    }
    return [p.id, p.brand, p.name, p.ml, p.costPen, stock, p.imageUrl || ''];
  });

  if (rows.length > 0) {
    prod.getRange(2, 1, rows.length, 7).setValues(rows);
  }

  // Guardar config del backend para callbacks de ventas
  if (backendUrl) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty('BACKEND_URL', backendUrl);
    if (apiKey) props.setProperty('API_KEY', apiKey);
  }

  // Actualizar formulario con nuevos productos
  crearFormulario_();

  return jsonResponse_({ ok: true, productos: rows.length, nuevos: newCount });
}

// -----------------------------------------------------------
// STATS para dashboard
// -----------------------------------------------------------
function getStats_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ventas = ss.getSheetByName(TAB_VENTAS);
  const prod = ss.getSheetByName(TAB_PRODUCTOS);

  // Ventas
  let totalVentas = 0, totalIngresos = 0, totalGanancia = 0;
  const porCanal = {};
  const porProducto = {};

  if (ventas.getLastRow() > 1) {
    const data = ventas.getRange(2, 1, ventas.getLastRow() - 1, 9).getValues();
    for (const row of data) {
      totalVentas++;
      const subtotal = row[6] || 0;
      const ganancia = row[7] || 0;
      const canal = row[8] || 'Otro';
      const producto = row[1] || 'Desconocido';

      totalIngresos += subtotal;
      totalGanancia += ganancia;
      porCanal[canal] = (porCanal[canal] || 0) + subtotal;
      porProducto[producto] = (porProducto[producto] || 0) + (row[3] || 0);
    }
  }

  // Stock
  let totalStock = 0, productosConStock = 0;
  if (prod.getLastRow() > 1) {
    const pData = prod.getRange(2, 1, prod.getLastRow() - 1, 6).getValues();
    for (const row of pData) {
      const s = row[5] || 0;
      totalStock += s;
      if (s > 0) productosConStock++;
    }
  }

  return jsonResponse_({
    totalVentas: totalVentas,
    totalIngresos: totalIngresos,
    totalGanancia: totalGanancia,
    totalStock: totalStock,
    productosConStock: productosConStock,
    porCanal: porCanal,
    topProductos: porProducto
  });
}

// -----------------------------------------------------------
// LISTA DE VENTAS
// -----------------------------------------------------------
function getVentas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ventas = ss.getSheetByName(TAB_VENTAS);
  if (ventas.getLastRow() < 2) return jsonResponse_([]);

  const data = ventas.getRange(2, 1, ventas.getLastRow() - 1, 9).getValues();
  const result = data.map(function(row) {
    return {
      fecha: row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '',
      producto: row[1],
      marca: row[2],
      cantidad: row[3],
      precioVenta: row[4],
      costoUnit: row[5],
      subtotal: row[6],
      ganancia: row[7],
      canal: row[8]
    };
  });

  return jsonResponse_(result);
}

function getFormUrl_() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty('FORM_ID');
  if (!formId) return jsonResponse_({ error: 'Formulario no creado. Ejecuta setup()' });

  const form = FormApp.openById(formId);
  return jsonResponse_({
    formUrl: form.getPublishedUrl(),
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  });
}

// -----------------------------------------------------------
// STOCK ACTUAL DEL SHEET (para sincronizar al backend)
// -----------------------------------------------------------
function getSheetStock_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var prod = ss.getSheetByName(TAB_PRODUCTOS);
  if (!prod || prod.getLastRow() < 2) return jsonResponse_({});

  var data = prod.getRange(2, 1, prod.getLastRow() - 1, 6).getValues();
  var stock = {};
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      stock[data[i][0]] = data[i][5] || 0;
    }
  }
  return jsonResponse_(stock);
}

// -----------------------------------------------------------
// REGISTRO MANUAL (desde admin panel)
// -----------------------------------------------------------
function registrarVentaManual_(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prod = ss.getSheetByName(TAB_PRODUCTOS);
  const ventas = ss.getSheetByName(TAB_VENTAS);

  const productId = body.productId;
  const cantidad = body.cantidad || 1;
  const precioVenta = body.precioVenta || 0;
  const canal = body.canal || 'Admin';

  // Buscar producto por ID
  const data = prod.getRange(2, 1, prod.getLastRow() - 1, 6).getValues();
  let fila = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == productId) { fila = i; break; }
  }
  if (fila === -1) return jsonResponse_({ error: 'Producto no encontrado' });

  const marca = data[fila][1];
  const nombre = data[fila][2];
  const costoUnit = data[fila][4];
  const stockActual = data[fila][5];

  if (stockActual < cantidad) {
    return jsonResponse_({ error: 'Stock insuficiente. Disponible: ' + stockActual });
  }

  // Descontar stock
  prod.getRange(fila + 2, 6).setValue(stockActual - cantidad);

  // Registrar venta
  const subtotal = precioVenta * cantidad;
  const ganancia = subtotal - (costoUnit * cantidad);

  ventas.appendRow([new Date(), nombre, marca, cantidad, precioVenta, costoUnit, subtotal, ganancia, canal]);

  crearFormulario_();

  return jsonResponse_({ ok: true, ganancia: ganancia });
}

// -----------------------------------------------------------
// UTILIDADES
// -----------------------------------------------------------
function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Menu personalizado
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AromaStudio')
    .addItem('Actualizar Formulario', 'crearFormulario_')
    .addItem('Ver URL Formulario', 'mostrarUrlForm_')
    .addToUi();
}

function mostrarUrlForm_() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty('FORM_ID');
  if (!formId) {
    SpreadsheetApp.getUi().alert('No hay formulario. Ejecuta setup() primero.');
    return;
  }
  const form = FormApp.openById(formId);
  SpreadsheetApp.getUi().alert(
    'URL del Formulario:\n\n' + form.getPublishedUrl() +
    '\n\nGuarda esta URL en tu celular!'
  );
}
