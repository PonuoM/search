

import { gapi } from 'gapi-script';
import type { DataContext, SalespersonData, AnalysisResult, SalesHistoryRecord } from '../types';

const productSheetName = 'ข้อมูลสินค้า';
const analysisLogSheetName = 'AnalysisLog';
const realtimeSalesSheetName = 'SalesData_Realtime';

const formatGoogleSheetPhoneNumber = (phone: any): string => {
    if (phone === null || phone === undefined) return '';
    // Strips non-digits and normalizes numbers starting with 66 to 0.
    const cleanedPhone = String(phone).replace(/\D/g, '');
    if (cleanedPhone.startsWith('66')) {
        return '0' + cleanedPhone.substring(2);
    }
    return cleanedPhone;
}

const parseExcelDate = (serial: any): Date | null => {
    if (!serial) return null;
    if (serial instanceof Date && !isNaN(serial.getTime())) return serial;

    // Handle string dates (e.g., from user input or different formats)
    if (typeof serial === 'string') {
        const trimmedSerial = serial.trim();
        const parts = trimmedSerial.split('/');
        
        // Explicitly handle 'dd/mm/yyyy'
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1000) {
                 // Month is 0-indexed in JS
                const d = new Date(year, month - 1, day);
                // Check if the constructed date is valid and matches the input
                // This prevents "32/01/2025" from becoming "01/02/2025"
                if (d && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
                    return d;
                }
            }
        }
        
        // Fallback for other formats like ISO that new Date() can handle reliably
        const date = new Date(trimmedSerial);
        return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle Excel/Google Sheets serial number
    if (typeof serial === 'number' && serial > 0) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
};

const safeParseNumber = (val: any): number | undefined => {
    if (val == null || val === '') return undefined;
    if (typeof val === 'number') return val;
    const num = Number(String(val).replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
};


/**
 * Fetches all necessary data (sales history, product context, salespersons)
 * from the Google Sheet in a single, efficient batch request.
 */
export const fetchAllDataFromSheet = async (spreadsheetId: string): Promise<{ salesData: SalesHistoryRecord[], contextData: Omit<DataContext, 'customerHistory'> }> => {
    const ranges = [
        `'${productSheetName}'!A:D`,      // For context
        `'${realtimeSalesSheetName}'!A:Z` // For sales data
    ];

    const response = await gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
    });

    const result = response.result;
    if (!result.valueRanges || result.valueRanges.length < 2) {
      throw new Error(`Could not find data in the required sheets ('${productSheetName}', '${realtimeSalesSheetName}').`);
    }
    
    const [productDataRange, salesDataRange] = result.valueRanges;

    // --- Process Context Data (from productDataRange) ---
    const productContextLines: string[] = [];
    const salespersons: SalespersonData[] = [];
    if (productDataRange.values && productDataRange.values.length > 1) {
        const productRows = productDataRange.values.slice(1); // Skip header
        productRows.forEach(row => {
            const productName = String(row[0] || '').trim();
            const category = String(row[1] || '').trim();
            const salespersonPhone = String(row[2] || '').trim();
            const salespersonName = String(row[3] || '').trim();
            
            if (productName) {
                productContextLines.push(`- ${productName}: ${category || 'N/A'}${salespersonName ? ` (พนักงาน: ${salespersonName})` : ''}`);
            }
            if (salespersonName && salespersonPhone) {
                salespersons.push({ name: salespersonName, phone: formatGoogleSheetPhoneNumber(salespersonPhone) });
            }
        });
    }

    const contextData = {
        productContext: productContextLines.join('\n'),
        salespersons,
    };

    // --- Process Sales Data (from salesDataRange) ---
    const salesRecords: SalesHistoryRecord[] = [];
    if (salesDataRange.values && salesDataRange.values.length > 1) {
        const header = salesDataRange.values[0].map(h => String(h).trim());
        const colMap: {[key: string]: number} = {};
        header.forEach((h, i) => colMap[h] = i);
        
        const requiredHeaders = ['วันที่ขาย', 'เบอร์โทร'];
        if (!requiredHeaders.every(h => header.includes(h))) {
            throw new Error(`Sheet '${realtimeSalesSheetName}' is missing required headers: ${requiredHeaders.join(', ')}`);
        }
        
        const dataRows = salesDataRange.values.slice(1);
        dataRows.forEach(row => {
            const date = parseExcelDate(row[colMap['วันที่ขาย']]);
            const phone = row[colMap['เบอร์โทร']] ? formatGoogleSheetPhoneNumber(row[colMap['เบอร์โทร']]) : null;
            
            if (date && phone) {
                salesRecords.push({
                    'วันที่ขาย': date,
                    'เบอร์โทร': phone,
                    'ลำดับ': safeParseNumber(row[colMap['ลำดับ']]),
                    'ช่องทางขาย': String(row[colMap['ช่องทางขาย']] || ''),
                    'ชำระเงิน': String(row[colMap['ชำระเงิน']] || ''),
                    'ชื่อ Facebook': String(row[colMap['ชื่อ Facebook']] || ''),
                    'พนักงานขาย': String(row[colMap['พนักงานขาย']] || ''),
                    'สินค้า': String(row[colMap['สินค้า']] || ''),
                    'จำนวน': safeParseNumber(row[colMap['จำนวน']]),
                    'ราคา': safeParseNumber(row[colMap['ราคา']]),
                    'ชื่อผู้รับ': String(row[colMap['ชื่อผู้รับ']] || ''),
                    'ที่อยู่': String(row[colMap['ที่อยู่']] || ''),
                    'ตำบล': String(row[colMap['ตำบล']] || ''),
                    'อำเภอ': String(row[colMap['อำเภอ']] || ''),
                    'จังหวัด': String(row[colMap['จังหวัด']] || ''),
                    'รหัสไปรษณีย์': String(row[colMap['รหัสไปรษณีย์']] || ''),
                });
            }
        });
    }

    return { salesData: salesRecords, contextData };
};


export const writeAnalysisToSheet = async (
    spreadsheetId: string, 
    result: AnalysisResult,
    salespersonName: string | null,
    customerPhone: string | undefined
) => {
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        throw new Error("User is not signed in.");
    }
    
    const newRow = [
        new Date().toISOString(),
        salespersonName ?? 'N/A',
        result.situationalEvaluation.closingProbability,
        result.salespersonEvaluation.overallPerformanceScore,
        customerPhone ?? 'N/A',
        result.strategicRecommendations.nextBestAction,
        result.situationalEvaluation.callOutcomeSummary,
        `https://ponuom.github.io/search/`
    ];

    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: `'${analysisLogSheetName}'!A1`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [newRow]
            }
        });
    } catch (err: any) {
        console.error("Error writing to Google Sheet:", err);
        throw new Error(err.result?.error?.message || 'Failed to write to Google Sheet.');
    }
};