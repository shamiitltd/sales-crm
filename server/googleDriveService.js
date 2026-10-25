const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const xlsx = require('xlsx');
const { google } = require('googleapis');

const FILE_NAME = 'Sales_CRM_Followups.xlsx';

/**
 * Locate the Google Service Account credentials file.
 * Checks env variable first, then common default locations.
 */
function resolveCredentialsPath() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  // Check server directory
  const localServerPath = path.resolve(__dirname, 'credentials.json');
  if (fs.existsSync(localServerPath)) {
    return localServerPath;
  }

  // Check parent root directory
  const parentRootPath = path.resolve(__dirname, '..', 'credentials.json');
  if (fs.existsSync(parentRootPath)) {
    return parentRootPath;
  }

  return null;
}

/**
 * Check credentials & folder configuration status
 */
function getDriveConfigStatus() {
  const credPath = resolveCredentialsPath();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ? process.env.GOOGLE_DRIVE_FOLDER_ID.trim() : null;

  return {
    credentialsConfigured: Boolean(credPath),
    credentialsPath: credPath ? path.basename(credPath) : null,
    folderIdConfigured: Boolean(folderId && folderId !== 'your_google_drive_folder_id_here'),
    folderId: folderId || null,
    isReady: Boolean(credPath && folderId && folderId !== 'your_google_drive_folder_id_here')
  };
}

/**
 * Generate an Excel XLSX buffer from followups database rows
 */
function generateExcelBuffer(rows = []) {
  const formattedData = rows.map((r) => ({
    'ID': r.id,
    'Client Name': r.client_name,
    'Contact Number': r.contact_number || 'N/A',
    'Email': r.email || 'N/A',
    'Lead Status': r.lead_status,
    'Deal Value (INR)': Number(r.deal_value || 0),
    'Follow-up Date': r.followup_date || 'None',
    'Notes': r.notes || '',
    'Created At': r.created_at || ''
  }));

  const worksheet = xlsx.utils.json_to_sheet(formattedData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 6 },  // ID
    { wch: 28 }, // Client Name
    { wch: 18 }, // Contact Number
    { wch: 28 }, // Email
    { wch: 20 }, // Lead Status
    { wch: 18 }, // Deal Value
    { wch: 16 }, // Follow-up Date
    { wch: 45 }, // Notes
    { wch: 22 }  // Created At
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Followups');

  // Also add a Summary sheet
  const totalLeads = rows.length;
  const wonLeads = rows.filter((r) => r.lead_status === 'Closed Won').length;
  const totalPipeline = rows.reduce((sum, r) => sum + Number(r.deal_value || 0), 0);
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) + '%' : '0%';

  const summaryData = [
    { 'Metric': 'Product', 'Value': 'Sales CRM - a product of SHAMIIT LLP' },
    { 'Metric': 'Export Date & Time', 'Value': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { 'Metric': 'Total Leads Count', 'Value': totalLeads },
    { 'Metric': 'Closed Won Deals', 'Value': wonLeads },
    { 'Metric': 'Conversion Rate', 'Value': conversionRate },
    { 'Metric': 'Total Pipeline Value (INR)', 'Value': `INR ${totalPipeline.toLocaleString('en-IN')}` }
  ];

  const summarySheet = xlsx.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 40 }];
  xlsx.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Initialize Google Drive Client using Service Account
 */
function getDriveClient() {
  const credPath = resolveCredentialsPath();
  if (!credPath) {
    throw new Error(
      'Google Service Account credentials not found. Please place `credentials.json` in the `server/` directory or set `GOOGLE_APPLICATION_CREDENTIALS` in your `.env`.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Export rows to Excel and upload/overwrite in Google Drive
 */
async function syncToGoogleDrive(rows = []) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ? process.env.GOOGLE_DRIVE_FOLDER_ID.trim() : null;

  if (!folderId || folderId === 'your_google_drive_folder_id_here') {
    throw new Error(
      'Google Drive Folder ID not configured. Please set `GOOGLE_DRIVE_FOLDER_ID` in `server/.env` with your target folder ID.'
    );
  }

  const drive = getDriveClient();
  const buffer = generateExcelBuffer(rows);

  // Search for an existing file with the same name in the target folder
  const escapedFileName = FILE_NAME.replace(/'/g, "\\'");
  const q = `'${folderId}' in parents and name = '${escapedFileName}' and trashed = false`;

  const searchRes = await drive.files.list({
    q,
    fields: 'files(id, name, webViewLink, modifiedTime)',
    spaces: 'drive'
  });

  const existingFile = searchRes.data.files && searchRes.data.files.length > 0 ? searchRes.data.files[0] : null;

  // Stream readable buffer
  const mediaStream = new Readable();
  mediaStream.push(buffer);
  mediaStream.push(null);

  const media = {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: mediaStream
  };

  let fileResult;
  let actionTaken = 'created';

  if (existingFile) {
    // Overwrite / Update existing file
    fileResult = await drive.files.update({
      fileId: existingFile.id,
      media,
      fields: 'id, name, webViewLink, modifiedTime'
    });
    actionTaken = 'overwritten';
  } else {
    // Create new file inside target folder
    fileResult = await drive.files.create({
      requestBody: {
        name: FILE_NAME,
        parents: [folderId],
        description: 'Automated Sales Follow-ups export from SHAMIIT LLP Sales CRM'
      },
      media,
      fields: 'id, name, webViewLink, createdTime'
    });
    actionTaken = 'created';
  }

  return {
    success: true,
    action: actionTaken,
    fileId: fileResult.data.id,
    fileName: fileResult.data.name || FILE_NAME,
    webViewLink: fileResult.data.webViewLink,
    recordCount: rows.length,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getDriveConfigStatus,
  generateExcelBuffer,
  syncToGoogleDrive
};
