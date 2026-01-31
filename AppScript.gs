
/**
 * JUPITER WMS - GOOGLE APPS SCRIPT BACKEND
 * Setup: Deploy as Web App, set access to "Anyone".
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

// Definisi Header untuk inisialisasi otomatis jika sheet tidak ada
const HEADERS = {
  "Items": ["id", "sku", "name", "category", "price", "location", "minLevel", "currentStock", "unit", "status", "conversionRate", "secondaryUnit"],
  "Transactions": ["id", "transactionId", "type", "date", "items", "supplierName", "poNumber", "riNumber", "sjNumber", "totalItems", "photos"],
  "RejectMaster": ["id", "sku", "name", "baseUnit", "unit2", "ratio2", "unit3", "ratio3", "lastUpdated"],
  "RejectLogs": ["id", "date", "items", "notes", "timestamp"]
};

/**
 * Mendapatkan sheet berdasarkan nama, buat baru jika tidak ada.
 */
function getSafeSheet(name) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
    const headers = HEADERS[name] || ["id"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function doGet(e) {
  try {
    const data = {
      items: getSheetData("Items"),
      transactions: getSheetData("Transactions"),
      rejectMaster: getSheetData("RejectMaster"),
      rejectLogs: getSheetData("RejectLogs")
    };
    
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(15000)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Server sibuk (Lock timeout)" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const data = postData.data;

    switch (action) {
      case 'addItem':
        addRow("Items", data);
        break;
      case 'bulkAddItem':
        addRows("Items", data.items);
        break;
      case 'processTransaction':
        handleTransaction(data);
        break;
      case 'addRejectLog':
        addRow("RejectLogs", data);
        break;
      case 'deleteRejectLog':
        deleteRow("RejectLogs", data.id);
        break;
      case 'addRejectItem':
        addRow("RejectMaster", data);
        break;
      case 'updateRejectItem':
        updateRow("RejectMaster", data.id, data);
        break;
      case 'deleteRejectItem':
        deleteRow("RejectMaster", data.id);
        break;
      case 'bulkAddRejectItems':
        addRows("RejectMaster", data.items);
        break;
      case 'deleteTransaction':
        deleteRow("Transactions", data.id);
        break;
      default:
        throw new Error("Action not found: " + action);
    }
    
    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function handleTransaction(payload) {
  const trx = payload.trx;
  const updates = payload.items_update;
  const sheetTrx = getSafeSheet("Transactions");
  const sheetItems = getSafeSheet("Items");
  
  // Update Stok di Sheet Items
  updates.forEach(upd => {
    let itemFound = false;
    const itemRows = sheetItems.getDataRange().getValues();
    for (let i = 1; i < itemRows.length; i++) {
      if (itemRows[i][0] == upd.id || itemRows[i][1] == upd.sku) {
        // Kolom 8 adalah currentStock
        sheetItems.getRange(i + 1, 8).setValue(upd.currentStock);
        itemFound = true;
        break;
      }
    }
    if (!itemFound) {
      sheetItems.appendRow([upd.id, upd.sku, upd.name, "Auto-Created", 0, "-", 0, upd.currentStock, upd.unit || "Pcs", "Active", 1, ""]);
    }
  });

  // Tambah baris transaksi
  const headers = HEADERS["Transactions"];
  const newRow = headers.map(h => {
    let val = trx[h];
    if (h === 'items' || h === 'photos') return JSON.stringify(val || []);
    return val === undefined ? "" : val;
  });
  sheetTrx.appendRow(newRow);
}

function getSheetData(name) {
  const sheet = getSafeSheet(name);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows.shift();
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function addRow(sheetName, data) {
  const sheet = getSafeSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => data[h] === undefined ? "" : data[h]);
  sheet.appendRow(newRow);
}

function addRows(sheetName, items) {
  const sheet = getSafeSheet(sheetName);
  items.forEach(item => addRow(sheetName, item));
}

function updateRow(sheetName, id, data) {
  const sheet = getSafeSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      headers.forEach((h, j) => {
        if (data[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      break;
    }
  }
}

function deleteRow(sheetName, id) {
  const sheet = getSafeSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
