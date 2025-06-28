

import React, { useState, useCallback, useEffect } from 'react';
import { gapi } from 'gapi-script';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { InputArea } from './components/InputArea';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { DataContextConnector } from './components/DataContextConnector';
import { analyzeTextTranscript, analyzeAudioFile } from './services/geminiService';
import type { AnalysisResult, CallMetadata, SalespersonData, CustomerHistoryRecord, IdentifiedSalesperson, DataContext, GoogleUserProfile, SalesHistoryRecord } from './types';
import { InputMode } from './types'; 
import { parseCallFilename } from './utils/filenameParser';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { SalesHistoryPage } from './components/SalesHistoryPage';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { FullScreenLoader } from './components/FullScreenLoader';
import { fetchSalesDataFromSheet, fetchContextDataFromSheet } from './services/googleSheetsService';


const GITHUB_SALES_DATA_URL = 'https://raw.githubusercontent.com/PonuoM/search/main/sales_data.xlsx';

const parseExcelDate = (serial: any): Date | null => {
    if (!serial) return null;
    if (serial instanceof Date && !isNaN(serial.getTime())) return serial;
    if (typeof serial === 'number' && serial > 0) {
        const date = new Date((serial - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }
    if (typeof serial === 'string') {
        const date = new Date(serial);
        if (isNaN(date.getTime())) {
            const parts = serial.split('/');
            if (parts.length === 3) {
                 const [day, month, year] = parts;
                 const isoDate = new Date(`${year}-${month}-${day}`);
                 if(!isNaN(isoDate.getTime())) return isoDate;
            }
        }
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
};

const safeParseNumber = (val: any): number | undefined => {
    if (val == null) return undefined;
    if (typeof val === 'number') return val;
    const num = Number(String(val).replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
};

const parseRowToSalesRecord = (row: any, dateKey: string, phoneKey: string): SalesHistoryRecord | null => {
    const date = parseExcelDate(row[dateKey]);
    const phone = row[phoneKey] ? String(row[phoneKey]).replace(/\D/g, '') : null;
    
    if (!date || !phone) return null;
    
    return {
        'วันที่ขาย': date,
        'เบอร์โทร': phone,
        'ลำดับ': safeParseNumber(row['ลำดับ']),
        'ช่องทางขาย': row['ช่องทางขาย'] ? String(row['ช่องทางขาย']) : undefined,
        'ชำระเงิน': row['ชำระเงิน'] ? String(row['ชำระเงิน']) : undefined,
        'ชื่อ Facebook': row['ชื่อ Facebook'] ? String(row['ชื่อ Facebook']) : undefined,
        'พนักงานขาย': row['พนักงานขาย'] ? String(row['พนักงานขาย']) : undefined,
        'สินค้า': row['สินค้า'] ? String(row['สินค้า']) : undefined,
        'จำนวน': safeParseNumber(row['จำนวน']),
        'ราคา': safeParseNumber(row['ราคา']),
        'ชื่อผู้รับ': row['ชื่อผู้รับ'] ? String(row['ชื่อผู้รับ']) : undefined,
        'ที่อยู่': row['ที่อยู่'] ? String(row['ที่อยู่']) : undefined,
        'ตำบล': row['ตำบล'] ? String(row['ตำบล']) : undefined,
        'อำเภอ': row['อำเภอ'] ? String(row['อำเภอ']) : undefined,
        'จังหวัด': row['จังหวัด'] ? String(row['จังหวัด']) : undefined,
        'รหัสไปรษณีย์': row['รหัสไปรษณีย์'] ? String(row['รหัสไปรษณีย์']) : undefined,
    };
};


const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInputMode, setCurrentInputMode] = useState<InputMode>(InputMode.TEXT);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dataContext, setDataContext] = useState<Omit<DataContext, 'customerHistory'> | null>(null);
  const [callMetadata, setCallMetadata] = useState<CallMetadata | null>(null);
  const [identifiedSalesperson, setIdentifiedSalesperson] = useState<IdentifiedSalesperson | null>(null);
  const [relevantHistoryForDisplay, setRelevantHistoryForDisplay] = useState<CustomerHistoryRecord[] | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
  const [googleSheetId, setGoogleSheetId] = useState<string>('');
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [activePage, setActivePage] = useState<'analyzer' | 'history'>('analyzer');
  const [passwordInput, setPasswordInput] = useState('');

  // State for Sales History data
  const [allSalesRecords, setAllSalesRecords] = useState<SalesHistoryRecord[] | null>(null);
  const [githubRecords, setGithubRecords] = useState<SalesHistoryRecord[] | null>(null);
  const [googleSheetRecords, setGoogleSheetRecords] = useState<SalesHistoryRecord[] | null>(null);
  const [historyIsLoading, setHistoryIsLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเตรียมข้อมูล...');

  const isAnalyzerUnlocked = passwordInput === '1234';

  // --- Data Fetching and Merging Logic ---
  useEffect(() => {
    const fetchGithubData = async () => {
      setLoadingMessage('กำลังโหลดข้อมูลหลัก...');
      try {
        const response = await fetch(GITHUB_SALES_DATA_URL);
        if (!response.ok) throw new Error(`ไม่สามารถดาวน์โหลดไฟล์ข้อมูลได้ (HTTP ${response.status})`);
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });
        
        const loadedRecords = json.map(row => parseRowToSalesRecord(row, 'วันที่ขาย', 'เบอร์โทร'))
                                  .filter((r): r is SalesHistoryRecord => r !== null);
        setGithubRecords(loadedRecords);
      } catch (e) {
        console.error("Error fetching GitHub data:", e);
        setHistoryError(`ไม่สามารถโหลดข้อมูลจาก GitHub: ${e instanceof Error ? e.message : 'Unknown error'}`);
        setGithubRecords([]); // Set to empty array on error to allow app to proceed
      }
    };
    fetchGithubData();
  }, []);

  useEffect(() => {
    const fetchGoogleSheetData = async () => {
      if (isLoggedIn && googleSheetId) {
        setLoadingMessage('กำลังโหลดข้อมูล Real-time...');
        try {
          const [salesData, contextData] = await Promise.all([
            fetchSalesDataFromSheet(googleSheetId),
            fetchContextDataFromSheet(googleSheetId)
          ]);

          setGoogleSheetRecords(salesData);
          setDataContext(contextData);

        } catch (e) {
          console.error("Error fetching Google Sheet data:", e);
          setHistoryError(prev => `${prev ? prev + '\n' : ''}ไม่สามารถโหลดข้อมูลจาก Google Sheet: ${e instanceof Error ? e.message : 'Unknown error'}`);
          setGoogleSheetRecords([]); // Set to empty on error
        }
      }
    };
    fetchGoogleSheetData();
  }, [isLoggedIn, googleSheetId]);

  useEffect(() => {
    // This effect runs when either data source is loaded/updated.
    // It is responsible for combining data and managing the main loading state.
    if (githubRecords === null) {
      // Don't do anything until the primary GitHub data fetch is complete.
      return;
    }
    
    setLoadingMessage('กำลังรวมข้อมูล...');
    
    const salesMap = new Map<string, SalesHistoryRecord>();
    const createKey = (r: SalesHistoryRecord) => 
        `${r['เบอร์โทร']}_${r['วันที่ขาย'].toISOString().split('T')[0]}_${r['สินค้า'] || ''}_${r['ราคา'] || 0}`;

    // Add GitHub records first.
    (githubRecords || []).forEach(record => {
      salesMap.set(createKey(record), record);
    });

    // Add/overwrite with Google Sheet records, which are considered more up-to-date.
    (googleSheetRecords || []).forEach(record => {
      salesMap.set(createKey(record), record);
    });
    
    const combinedRecords = Array.from(salesMap.values());
    setAllSalesRecords(combinedRecords);
    
    // --- Robust loading completion logic ---
    const githubFetchDone = githubRecords !== null;
    const googleFetchExpected = !!googleSheetId;
    const googleFetchDone = googleSheetRecords !== null;

    if (githubFetchDone) {
      if (!googleFetchExpected) {
        // If we don't expect Google Sheet data (no ID), we're done after GitHub.
        setHistoryIsLoading(false);
      } else {
        // If we expect Google Sheet data, we must wait for its fetch to complete.
        if (googleFetchDone) {
          setHistoryIsLoading(false);
        }
        // Otherwise, we wait. The loader remains active.
      }
    }
  }, [githubRecords, googleSheetRecords, googleSheetId]);

  
  // --- Remember Sheet ID Logic ---
  useEffect(() => {
    const savedSheetId = localStorage.getItem('googleSheetId');
    if (savedSheetId) {
      setGoogleSheetId(savedSheetId);
    }
  }, []);

  useEffect(() => {
    if (googleSheetId) {
      localStorage.setItem('googleSheetId', googleSheetId);
    } else {
      localStorage.removeItem('googleSheetId');
    }
  }, [googleSheetId]);
  // --- End Remember Sheet ID Logic ---

  // --- Google Auth Logic ---
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: process.env.GOOGLE_API_KEY,
        clientId: process.env.GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      }).then(() => {
        setIsGapiReady(true);
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
           const isSignedIn = authInstance.isSignedIn.get();
           if (isSignedIn) {
               setIsLoggedIn(true);
               const profile = authInstance.currentUser.get().getBasicProfile();
               setUserProfile({ name: profile.getName(), email: profile.getEmail(), imageUrl: profile.getImageUrl() });
           }
        }
      }).catch(err => {
          console.error("Error initializing GAPI client", err);
          let detailedError = "Could not initialize Google services.";
          if (typeof err === 'object' && err !== null && 'details' in err && typeof (err as any).details === 'string') {
              const details = (err as {details: string}).details;
              if (details.includes('invalid') || details.includes('not a valid origin')) {
                  detailedError = `เกิดข้อผิดพลาดในการกำหนดค่า Google: URL (${window.location.origin}) อาจไม่ได้ลงทะเบียนเป็น 'Authorized JavaScript origins' ใน Google Cloud Project ของคุณ`;
              }
          }
          setError(detailedError);
          setIsGapiReady(false);
      });
    };
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_API_KEY) {
      gapi.load('client:auth2', initClient);
    }
  }, []);

 const handleLogin = useCallback(async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      if (authInstance) {
        const googleUser = await authInstance.signIn();
        setIsLoggedIn(true);
        const profile = googleUser.getBasicProfile();
        setUserProfile({ name: profile.getName(), email: profile.getEmail(), imageUrl: profile.getImageUrl() });
      }
    } catch (err: any) {
      if (err.error !== 'popup_closed_by_user') console.error("Login error:", err);
    }
  }, []);

  const handleLogout = useCallback(async () => {
     try {
      const authInstance = gapi.auth2.getAuthInstance();
      if (authInstance) {
        await authInstance.signOut();
        setIsLoggedIn(false);
        setUserProfile(null);
        setGoogleSheetRecords(null); // Clear sheet data on logout
        setDataContext(null);
      }
    } catch(err) {
      console.error("Logout error:", err);
    }
  }, []);
  // --- End Google Auth Logic ---


  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    if (!process.env.API_KEY) {
        setError("API Key is not configured.");
        setIsLoading(false);
        return;
    }
    
    try {
      let result: AnalysisResult | null = null;
      let parsedMeta: CallMetadata | null = null;
      const productPromptContext = dataContext?.productContext ?? null;
      const salespersonList = dataContext?.salespersons ?? null;
      
      if (currentInputMode === InputMode.AUDIO && audioFile) {
        parsedMeta = parseCallFilename(audioFile.name);
      }
      setCallMetadata(parsedMeta);
      
      let salespersonToUse: IdentifiedSalesperson | null = null;
      if (parsedMeta && salespersonList && salespersonList.length > 0) {
        const salespersonPhone = parsedMeta.callType === 'โทรออก' ? parsedMeta.sourcePhone : parsedMeta.destinationPhone;
        if (salespersonPhone) {
          const matchedSalesperson = salespersonList.find(sp => sp.phone && sp.phone.replace(/\D/g, '') === salespersonPhone.replace(/\D/g, ''));
          if (matchedSalesperson) salespersonToUse = matchedSalesperson;
        }
      }
      setIdentifiedSalesperson(salespersonToUse);

      let relevantCustomerHistory: SalesHistoryRecord[] | null = null;
      if (parsedMeta && allSalesRecords) {
          const customerPhone = parsedMeta.callType === 'โทรออก' ? parsedMeta.destinationPhone : parsedMeta.sourcePhone;
          if (customerPhone) {
              relevantCustomerHistory = allSalesRecords.filter(record => 
                  record['เบอร์โทร'] && record['เบอร์โทร'].replace(/\D/g, '') === customerPhone.replace(/\D/g, '')
              );
          }
      }
      
      // History for display in the UI (human-readable date)
      const historyForDisplay: CustomerHistoryRecord[] | null = relevantCustomerHistory
        ? relevantCustomerHistory.map(r => ({
            phone: r['เบอร์โทร'],
            product: r['สินค้า'],
            price: r['ราคา'],
            date: r['วันที่ขาย'].toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            recipientName: r['ชื่อผู้รับ'],
            address: [r['ที่อยู่'], r['ตำบล'], r['อำเภอ']].filter(Boolean).join(' ').trim(),
            province: r['จังหวัด'],
            quantity: r['จำนวน'],
          }))
        : null;
      
      setRelevantHistoryForDisplay(historyForDisplay);

      // History for the AI prompt (machine-readable date and richer data)
      const historyForPrompt: CustomerHistoryRecord[] | null = relevantCustomerHistory
        ? relevantCustomerHistory.map(r => ({
            date: r['วันที่ขาย'].toISOString().split('T')[0], // YYYY-MM-DD
            product: r['สินค้า'],
            quantity: r['จำนวน'],
            price: r['ราคา'],
            recipientName: r['ชื่อผู้รับ'],
            phone: r['เบอร์โทร'],
          }))
        : null;

      if (currentInputMode === InputMode.TEXT) {
        if (!transcriptText.trim()) throw new Error('Please paste a transcript.');
        result = await analyzeTextTranscript(transcriptText, productPromptContext, historyForPrompt, salespersonToUse);
      } else if (currentInputMode === InputMode.AUDIO) {
        if (!audioFile) throw new Error('Please upload an audio file.');
        result = await analyzeAudioFile(audioFile, productPromptContext, historyForPrompt, salespersonToUse);
      }

      if (result) {
        setAnalysisResult(result);
      } else {
        throw new Error('Analysis failed to produce a result.');
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? `Analysis failed: ${err.message}` : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [currentInputMode, transcriptText, audioFile, dataContext, allSalesRecords]);

  useEffect(() => {
    if (currentInputMode === InputMode.TEXT || !audioFile) {
      setCallMetadata(null);
      setIdentifiedSalesperson(null);
    }
  }, [currentInputMode, audioFile]);


  if (historyIsLoading) {
    return <FullScreenLoader message={loadingMessage} />;
  }

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 selection:bg-sky-500 selection:text-white transition-colors duration-300">
       <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <GoogleAuthButton isLoggedIn={isLoggedIn} userProfile={userProfile} onLogin={handleLogin} onLogout={handleLogout} isGapiReady={isGapiReady} />
        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
      </div>

      <Header activePage={activePage} setActivePage={setActivePage} />
      
      {activePage === 'analyzer' ? (
        isAnalyzerUnlocked ? (
          <main className="container mx-auto mt-4 mb-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl bg-slate-100/80 dark:bg-black/20 backdrop-blur-2xl shadow-2xl rounded-3xl border border-slate-200 dark:border-white/10 relative">
              <DataContextConnector 
                isLoading={isLoading}
                googleSheetId={googleSheetId}
                setGoogleSheetId={setGoogleSheetId}
                isConnected={!!dataContext}
              /> 
              
              <InputArea onAnalyze={handleAnalyze} isLoading={isLoading} currentInputMode={currentInputMode} setCurrentInputMode={setCurrentInputMode} transcriptText={transcriptText} setTranscriptText={setTranscriptText} audioFile={audioFile} setAudioFile={setAudioFile} isDataConnected={!!dataContext || !!googleSheetId} />
              {isLoading && <LoadingSpinner />}
              {error && <ErrorMessage message={error} />}
              
              {analysisResult && !isLoading && !error && (
                <ResultsDisplay result={analysisResult} callMetadata={callMetadata} salespersonName={identifiedSalesperson?.name ?? null} relevantHistory={relevantHistoryForDisplay} isLoggedIn={isLoggedIn} googleSheetId={googleSheetId} />
              )}
          </main>
        ) : (
          <main className="container mx-auto mt-4 mb-8 flex items-center justify-center p-4 sm:p-6 lg:p-8 w-full max-w-5xl">
            <div className="w-full max-w-sm p-8 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 text-center">
              <SparklesIcon className="h-12 w-12 text-sky-500 dark:text-sky-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">ต้องการการเข้าถึง</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">กรุณาใส่รหัสผ่านเพื่อใช้งาน AI Analyzer</p>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border-2 border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-center text-lg tracking-widest" autoFocus />
            </div>
          </main>
        )
      ) : (
        <SalesHistoryPage allRecords={allSalesRecords} isLoading={historyIsLoading} error={historyError} />
      )}

      <footer className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        <p>Powered by Thanu Suriwong</p>
        <p>&copy; {new Date().getFullYear()} Customer Service. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
