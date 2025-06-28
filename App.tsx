

import React, { useState, useCallback, useEffect } from 'react';
import { gapi } from 'gapi-script';
import { Header } from './components/Header';
import { InputArea } from './components/InputArea';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { ProductListInput } from './components/ProductListInput';
import { analyzeTextTranscript, analyzeAudioFile } from './services/geminiService';
import type { AnalysisResult, TranscribedUtterance, CallMetadata, ProductContext, SalespersonData, CustomerHistoryRecord, IdentifiedSalesperson, DataContext, GoogleUserProfile } from './types';
import { InputMode } from './types'; 
import { parseCallFilename } from './utils/filenameParser';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { SalesHistoryPage } from './components/SalesHistoryPage';
import { SparklesIcon } from './components/icons/SparklesIcon';


const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInputMode, setCurrentInputMode] = useState<InputMode>(InputMode.TEXT);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dataContext, setDataContext] = useState<DataContext | null>(null);
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

  const isAnalyzerUnlocked = passwordInput === '1234';

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
        setIsGapiReady(true); // Signal that GAPI is ready
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
           const isSignedIn = authInstance.isSignedIn.get();
           if (isSignedIn) {
               setIsLoggedIn(true);
               const profile = authInstance.currentUser.get().getBasicProfile();
               setUserProfile({
                   name: profile.getName(),
                   email: profile.getEmail(),
                   imageUrl: profile.getImageUrl(),
               });
           }
        }
      }).catch(err => {
          console.error("Error initializing GAPI client", err);
          let detailedError = "Could not initialize Google services. Please check your connection and API/Client ID settings.";
          // GAPI errors often have a 'details' property with a string message
          if (typeof err === 'object' && err !== null && 'details' in err && typeof (err as any).details === 'string') {
              const details = (err as {details: string}).details;
              if (details.includes('invalid') || details.includes('not a valid origin') || details.includes('whitelisted')) {
                  detailedError = `เกิดข้อผิดพลาดในการกำหนดค่าการยืนยันตัวตนของ Google: URL ปัจจุบัน (${window.location.origin}) อาจไม่ได้ลงทะเบียนเป็น 'Authorized JavaScript origins' ในโปรเจกต์ Google Cloud ของคุณสำหรับ Client ID ที่ให้มา กรุณาตรวจสอบการตั้งค่า OAuth 2.0 Client ID ของคุณและเพิ่ม URL ปัจจุบันเข้าไป`;
              }
          }
          setError(detailedError);
          setIsGapiReady(false); // GAPI is not ready
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
        setUserProfile({
          name: profile.getName(),
          email: profile.getEmail(),
          imageUrl: profile.getImageUrl(),
        });
      }
    } catch (err: any) {
      // User closing the popup is not an error we need to show.
      if (err.error !== 'popup_closed_by_user') {
          console.error("Error during login:", err);
      }
    }
  }, []);

  const handleLogout = useCallback(async () => {
     try {
      const authInstance = gapi.auth2.getAuthInstance();
      if (authInstance) {
        await authInstance.signOut();
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    } catch(err) {
      console.error("Error during logout:", err);
    }
  }, []);
  // --- End Google Auth Logic ---


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    if (!process.env.API_KEY) {
        setError("API Key is not configured. Please ensure API_KEY is set in your environment. This application cannot function without it.");
        setIsLoading(false);
        return;
    }
    
    try {
      let result: AnalysisResult | null = null;
      let parsedMeta: CallMetadata | null = null;
      const productPromptContext = dataContext?.productContext ?? null;
      const salespersonList = dataContext?.salespersons ?? null;
      const customerHistory = dataContext?.customerHistory ?? null;

      if (currentInputMode === InputMode.AUDIO && audioFile) {
        parsedMeta = parseCallFilename(audioFile.name);
      }
      setCallMetadata(parsedMeta);
      
      let salespersonToUse: IdentifiedSalesperson | null = null;
      if (parsedMeta && salespersonList && salespersonList.length > 0) {
        const salespersonPhone = parsedMeta.callType === 'โทรออก' ? parsedMeta.sourcePhone : parsedMeta.destinationPhone;
        if (salespersonPhone) {
          const matchedSalesperson = salespersonList.find(sp => sp.phone && sp.phone.replace(/\D/g, '') === salespersonPhone.replace(/\D/g, ''));
          if (matchedSalesperson) {
            salespersonToUse = matchedSalesperson;
          }
        }
      }
      setIdentifiedSalesperson(salespersonToUse);

      let relevantCustomerHistory: CustomerHistoryRecord[] | null = null;
      if (parsedMeta && customerHistory) {
          const customerPhone = parsedMeta.callType === 'โทรออก' 
              ? parsedMeta.destinationPhone 
              : parsedMeta.sourcePhone;
          
          if (customerPhone) {
              relevantCustomerHistory = customerHistory.filter(record => 
                  record.phone && record.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, '')
              );
          }
      }
      setRelevantHistoryForDisplay(relevantCustomerHistory);

      if (currentInputMode === InputMode.TEXT) {
        if (!transcriptText.trim()) {
          setError('Please paste a transcript.');
          setIsLoading(false);
          return;
        }
        result = await analyzeTextTranscript(transcriptText, productPromptContext, relevantCustomerHistory, salespersonToUse);
      } else if (currentInputMode === InputMode.AUDIO) {
        if (!audioFile) {
          setError('Please upload an audio file.');
          setIsLoading(false);
          return;
        }
        result = await analyzeAudioFile(audioFile, productPromptContext, relevantCustomerHistory, salespersonToUse);
      }

      if (result) {
        setAnalysisResult(result);
      } else {
        setError('Analysis failed to produce a result. The response might be empty or in an unexpected format.');
      }
    } catch (err) {
      console.error("Analysis error:", err);
      if (err instanceof Error) {
        setError(`Analysis failed: ${err.message}`);
      } else {
        setError('An unknown error occurred during analysis.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentInputMode, transcriptText, audioFile, dataContext]);

  useEffect(() => {
    if (currentInputMode === InputMode.TEXT || !audioFile) {
      setCallMetadata(null);
      setIdentifiedSalesperson(null);
    }
  }, [currentInputMode, audioFile]);


  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 selection:bg-sky-500 selection:text-white transition-colors duration-300">
       <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <GoogleAuthButton
          isLoggedIn={isLoggedIn}
          userProfile={userProfile}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isGapiReady={isGapiReady}
        />
        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
      </div>

      <Header activePage={activePage} setActivePage={setActivePage} />
      
      {activePage === 'analyzer' ? (
        isAnalyzerUnlocked ? (
          <main className="container mx-auto mt-4 mb-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl bg-slate-100/80 dark:bg-black/20 backdrop-blur-2xl shadow-2xl rounded-3xl border border-slate-200 dark:border-white/10 relative">
              <ProductListInput 
                onDataContextChange={setDataContext}
                isLoading={isLoading}
                googleSheetId={googleSheetId}
                setGoogleSheetId={setGoogleSheetId}
              /> 
              
              <InputArea
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                currentInputMode={currentInputMode}
                setCurrentInputMode={setCurrentInputMode}
                transcriptText={transcriptText}
                setTranscriptText={setTranscriptText}
                audioFile={audioFile}
                setAudioFile={setAudioFile}
                isDataConnected={!!dataContext}
              />

              {isLoading && <LoadingSpinner />}
              {error && <ErrorMessage message={error} />}
              
              {analysisResult && !isLoading && !error && (
                <ResultsDisplay 
                  result={analysisResult} 
                  callMetadata={callMetadata} 
                  salespersonName={identifiedSalesperson?.name ?? null}
                  relevantHistory={relevantHistoryForDisplay}
                  isLoggedIn={isLoggedIn}
                  googleSheetId={googleSheetId}
                />
              )}
          </main>
        ) : (
          <main className="container mx-auto mt-4 mb-8 flex items-center justify-center p-4 sm:p-6 lg:p-8 w-full max-w-5xl">
            <div className="w-full max-w-sm p-8 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 text-center">
              <SparklesIcon className="h-12 w-12 text-sky-500 dark:text-sky-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">ต้องการการเข้าถึง</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">กรุณาใส่รหัสผ่านเพื่อใช้งาน AI Analyzer</p>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border-2 border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
          </main>
        )
      ) : (
        <SalesHistoryPage />
      )}

      <footer className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        <p>Powered by Thanu Suriwong</p>
        <p>&copy; {new Date().getFullYear()} Sales Call Analyzer. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;