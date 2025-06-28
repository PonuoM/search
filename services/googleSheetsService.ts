import { gapi } from 'gapi-script';
import type { DataContext, CustomerHistoryRecord, SalespersonData, ProductContext, AnalysisResult } from '../types';

const productSheetName = 'ข้อมูลสินค้า';
const customerSheetName = 'ข้อมูลลูกค้า';
const analysisLogSheetName = 'AnalysisLog';

// Helper to parse the raw data from Google Sheets API
const parseSheetData = (values: any[][], requiredHeaders: string[]): { data: any[], colMap: {[key: string]: number} } => {
    if (!values || values.length < 1) {
        return { data: [], colMap: {} };
    }
    const headerRow = (values[0] || []).map(h => String(h || '').trim());
    
    if (requiredHeaders.some(h => !headerRow.includes(h))) {
        throw new Error(`Missing required headers. Required: ${requiredHeaders.join(', ')}. Found: ${headerRow.join(', ')}`);
    }

    const colMap: {[key: string]: number} = {};
    headerRow.forEach((header, index) => {
        colMap[header] = index;
    });

    return { data: values.slice(1), colMap };
};

const formatDate = (value: any): string | undefined => {
    if (!value) return undefined;
    if (value instanceof Date && !isNaN(value.getTime())) {
        const day = String(value.getDate()).padStart(2, '0');
        const month = String(value.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = value.getFullYear();
        return `${day}/${month}/${year}`;
    }
    const dateStr = String(value).trim();
    return dateStr || undefined;
};


export const fetchSheetData = async (spreadsheetId: string, apiKey: string): Promise<DataContext> => {
    const ranges = [`'${productSheetName}'!A:D`, `'${customerSheetName}'`];
    
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${apiKey}`
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to fetch from sheet, status: ${response.status}`);
    }

    const json = await response.json();
    const [productData, customerData] = json.valueRanges;

    // 1. Process "ข้อมูลสินค้า"
    const productContextLines: string[] = [];
    const salespersons: SalespersonData[] = [];
    if (productData.values) {
        const { data: productRows } = parseSheetData(productData.values, ['ชื่อสินค้า', 'หมวดหมู่']);
        productRows.forEach(row => {
            const productName = String(row[0] || '').trim();
            const category = String(row[1] || '').trim();
            const salespersonPhone = String(row[2] || '').trim();
            const salespersonName = String(row[3] || '').trim();
            
            if (productName && category) {
                productContextLines.push(`- ${productName}: ${category}${salespersonName ? ` (พนักงาน: ${salespersonName})` : ''}`);
            }
            if (salespersonName && salespersonPhone) {
                salespersons.push({ name: salespersonName, phone: salespersonPhone.replace(/\D/g, '') });
            }
        });
    }

    // 2. Process "ข้อมูลลูกค้า"
    const customerHistory: CustomerHistoryRecord[] = [];
    if (customerData.values) {
        const { data: customerRows, colMap } = parseSheetData(customerData.values, ['เบอร์โทรศัพท์']);
        customerRows.forEach(row => {
            if (row[colMap['เบอร์โทรศัพท์']]) {
                customerHistory.push({
                    phone: String(row[colMap['เบอร์โทรศัพท์']]).trim().replace(/\D/g, ''),
                    date: formatDate(row[colMap['วันที่']]),
                    customerName: String(row[colMap['ชื่อลูกค้า']] || '').trim() || undefined,
                    salesperson: String(row[colMap['ผู้ขาย']] || '').trim() || undefined,
                    price: parseFloat(String(row[colMap['ราคา']] || '0')),
                    recipientName: String(row[colMap['ชื่อผู้รับ']] || '').trim() || undefined,
                    secondaryPhone: String(row[colMap['เบอร์สำรอง']] || '').trim() || undefined,
                    address: String(row[colMap['ที่อยู่']] || '').trim() || undefined,
                    province: String(row[colMap['จังหวัด']] || '').trim() || undefined,
                    postalCode: String(row[colMap['รหัสไปรษณีย์']] || '').trim() || undefined,
                    deliveryDate: formatDate(row[colMap['วันที่นัดส่ง']]),
                    deliveryRound: String(row[colMap['รอบ']] || '').trim() || undefined,
                    customerType: String(row[colMap['ประเภทลูกค้า']] || '').trim() || undefined,
                    product: String(row[colMap['สินค้า']] || '').trim() || undefined,
                    quantity: parseInt(String(row[colMap['จำนวน']] || '0'), 10) || undefined,
                    customerId: String(row[colMap['ID_CUSTUMER']] || '').trim() || undefined,
                });
            }
        });
    }

    return {
        productContext: productContextLines.join('\n'),
        salespersons,
        customerHistory
    };
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
    
    // `Timestamp`, `Salesperson`, `Closing Probability`, `Overall Score`, `Customer Phone`, `Next Best Action`, `Call Outcome Summary`, `Full Report Link`
    const newRow = [
        new Date().toISOString(),
        salespersonName ?? 'N/A',
        result.situationalEvaluation.closingProbability,
        result.salespersonEvaluation.overallPerformanceScore,
        customerPhone ?? 'N/A',
        result.strategicRecommendations.nextBestAction,
        result.situationalEvaluation.callOutcomeSummary,
        `https://ponuom.github.io/search/` // A placeholder or future deep link
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