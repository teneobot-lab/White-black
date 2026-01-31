
/**
 * JUPITER WMS - GOOGLE APPS SCRIPT BACKEND
 * Setup: Deploy as Web App, set access to "Anyone".
 * Required Sheets: "Items", "Transactions", "RejectMaster", "RejectLogs"
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const data = {
    items: getSheetData("Items"),
    transactions: getSheetData("Transactions"),
    rejectMaster: getSheetData("RejectMaster"),
    rejectLogs: getSheetData("RejectLogs")
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const postData = JSON.parse(e.postData.contents);
  const action = postData.action;
  const data = postData.data;

  try {
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
        
      case 'addRejectItem':
        addRow("RejectMaster", data);
        break;

      case 'bulkAddRejectItems':
        addRows("RejectMaster", data.items);
        break;

      default:
        throw new Error("Action not found");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleTransaction(payload) {
  const trx = payload.trx;
  const updates = payload.items_update;
  const sheetTrx = SS.getSheetByName("Transactions");
  const sheetItems = SS.getSheetByName("Items");
  
  // 1. Handle Photos & Drive
  let driveLink = "";
  if (trx.photos && trx.photos.length > 0) {
    const parentFolderId = "YOUR_FOLDER_ID_HERE"; // Optional: Put a specific folder ID here
    const folderName = `Photos_${trx.transactionId}`;
    let folder;
    
    try {
      folder = DriveApp.createFolder(folderName);
    } catch(e) {
      folder = DriveApp.getRootFolder().createFolder(folderName);
    }
    
    trx.photos.forEach((base64, idx) => {
      const contentType = base64.substring(5, base64.indexOf(';'));
      const bytes = Utilities.base64Decode(base64.split(',')[1]);
      const blob = Utilities.newBlob(bytes, contentType, `photo_${idx}.jpg`);
      folder.createFile(blob);
    });
    
    driveLink = folder.getUrl();
  }

  // 2. Update Stocks & Auto-Create Items
  updates.forEach(upd => {
    let itemFound = false;
    const itemRows = sheetItems.getDataRange().getValues();
    
    for (let i = 1; i < itemRows.length; i++) {
      if (itemRows[i][0] == upd.id || itemRows[i][1] == upd.sku) {
        sheetItems.getRange(i + 1, 8).setValue(upd.currentStock); // Column H is currentStock
        itemFound = true;
        break;
      }
    }
    
    // Auto-create if not found (Safety net for bulk import transactions)
    if (!itemFound) {
      sheetItems.appendRow([
        upd.id, upd.sku, upd.name, "Auto-Created", 0, "-", 0, upd.currentStock, upd.unit || "Pcs", "Active", 1, ""
      ]);
    }
  });

  // 3. Record Transaction
  sheetTrx.appendRow([
    trx.id,
    trx.transactionId,
    trx.type,
    trx.date,
    JSON.stringify(trx.items),
    trx.supplierName || "",
    trx.poNumber || "",
    trx.sjNumber || "",
    trx.totalItems,
    driveLink // Store the Drive Link instead of raw base64
  ]);
}

// Helper Utilities
function getSheetData(name) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
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
  const newRow = headers.map(h => data[h] || "");
  sheet.appendRow(newRow);
}

function addRows(sheetName, items) {
  items.forEach(item => addRow(sheetName, item));
}
