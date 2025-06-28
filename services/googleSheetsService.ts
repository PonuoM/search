

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

    // Handle Google Sheets date serial number
    if (typeof serial === 'number' && serial > 0) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }
    // Handle string dates (e.g., from user input or different formats)
    if (typeof serial === 'string') {
        // Try direct parsing first
        const date = new Date(serial);
        if (!isNaN(date.getTime())) return date;
        
        // Try DD/MM/YYYY format
        const parts = serial.split('/');
        if (parts.length === 3) {
             const [day, month, year] = parts;
             // Handle YYYY-MM-DD that might be split
             if (parseInt(year) > 1900 && parseInt(month) <=12 && parseInt(day) <=31) {
                const isoDate = new Date(`${year}-${month}-${day}`);
                if(!isNaN(isoDate.getTime())) return isoDate;
             }
        }
    }
    return null;
};

const safeParseNumber = (val: any): number | undefined => {
    if (val == null || val === '') return undefined;
    if (typeof val === 'number') return val;
    const num = Number(String(val).replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
};


// Fetches context data (products, salespersons) for the AI
export const fetchContextDataFromSheet = async (spreadsheetId: string): Promise<Omit<DataContext, 'customerHistory'>> => {
    const ranges = [`'${productSheetName}'!A:D`];

    const response = await gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: spreadsheetId,
        ranges: ranges,
    });

    const result = response.result;
    if (!result.valueRanges || result.valueRanges.length === 0) {
      throw new Error("No data found in the specified sheets.");
    }
    
    const [productData] = result.valueRanges;

    // Process "ข้อมูลสินค้า" for product context and salespersons
    const productContextLines: string[] = [];
    const salespersons: SalespersonData[] = [];
    if (productData.values) {
        const productRows = productData.values.slice(1); // Skip header
        productRows.forEach(row => {
            const productName = String(row[0] || '').trim();
            const category = String(row[1] || '').trim();
            const salespersonPhone = String(row[2] || '').trim();
            const salespersonName = String(row[3] || '').trim();
            
            if (productName && category) {
                productContextLines.push(`- ${productName}: ${category}${salespersonName ? ` (พนักงาน: ${salespersonName})` : ''}`);
            }
            if (salespersonName && salespersonPhone) {
                salespersons.push({ name: salespersonName, phone: formatGoogleSheetPhoneNumber(salespersonPhone) });
            }
        });
    }

    return {
        productContext: productContextLines.join('\n'),
        salespersons,
    };
};

// Fetches the latest sales data from the 'SalesData_Realtime' sheet
export const fetchSalesDataFromSheet = async (spreadsheetId: string): Promise<SalesHistoryRecord[]> => {
    const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `'${realtimeSalesSheetName}'!A:Z`,
    });

    const values = response.result.values;
    if (!values || values.length < 2) {
        return []; // No data or only header
    }

    const header = values[0].map(h => String(h).trim());
    const colMap: {[key: string]: number} = {};
    header.forEach((h, i) => colMap[h] = i);
    
    const requiredHeaders = ['วันที่ขาย', 'เบอร์โทร'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new Error(`Sheet 'SalesData_Realtime' is missing required headers: ${requiredHeaders.join(', ')}`);
    }

    const records: SalesHistoryRecord[] = [];
    const dataRows = values.slice(1);

    dataRows.forEach(row => {
        const date = parseExcelDate(row[colMap['วันที่ขาย']]);
        const phone = row[colMap['เบอร์โทร']] ? formatGoogleSheetPhoneNumber(row[colMap['เบอร์โทร']]) : null;
        
        if (date && phone) {
            records.push({
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
    
    return records;
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