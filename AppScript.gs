
/**
 * JUPITER WMS - GOOGLE APPS SCRIPT BACKEND
 * Setup: Deploy as Web App, set access to "Anyone".
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

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
    // Tunggu akses ke sheet (penting saat banyak request masuk)
    if (!lock.tryLock(15000)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Server busy (Lock timeout)" }))
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
    
    // Paksa tulis ke database sebelum melepas lock
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
  const sheetTrx = SS.getSheetByName("Transactions");
  const sheetItems = SS.getSheetByName("Items");
  
  // Update Stok di Sheet Items
  updates.forEach(upd => {
    let itemFound = false;
    const itemRows = sheetItems.getDataRange().getValues();
    for (let i = 1; i < itemRows.length; i++) {
      if (itemRows[i][0] == upd.id || itemRows[i][1] == upd.sku) {
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
  sheetTrx.appendRow([trx.id, trx.transactionId, trx.type, trx.date, JSON.stringify(trx.items), trx.supplierName || "", trx.poNumber || "", trx.riNumber || "", trx.sjNumber || "", trx.totalItems, JSON.stringify(trx.photos || [])]);
}

function getSheetData(name) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return [];
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
  const sheet = SS.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => data[h] === undefined ? "" : data[h]);
  sheet.appendRow(newRow);
}

function addRows(sheetName, items) {
  items.forEach(item => addRow(sheetName, item));
}

function updateRow(sheetName, id, data) {
  const sheet = SS.getSheetByName(sheetName);
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
  const sheet = SS.getSheetByName(sheetName);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
