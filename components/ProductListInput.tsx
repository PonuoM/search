


import React, { useState, useCallback } from 'react';
import { LinkIcon } from './icons/LinkIcon';
import { TrashIcon } from './icons/TrashIcon'; 
import { fetchSheetData } from '../services/googleSheetsService';
import type { DataContext } from '../types';

interface ProductListInputProps {
  onDataContextChange: (context: DataContext | null) => void;
  isLoading: boolean;
  googleSheetId: string;
  setGoogleSheetId: (id: string) => void;
}

export const ProductListInput: React.FC<ProductListInputProps> = ({ 
  onDataContextChange,
  isLoading,
  googleSheetId,
  setGoogleSheetId
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!googleSheetId.trim()) {
      setError('กรุณาใส่ Google Sheet ID');
      return;
    }
    if (!process.env.GOOGLE_API_KEY) {
      setError('ไม่ได้ตั้งค่า Google API Key');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);
    onDataContextChange(null);

    try {
      const data = await fetchSheetData(googleSheetId, process.env.GOOGLE_API_KEY);
      onDataContextChange(data);
      setSuccessMessage(`เชื่อมต่อสำเร็จ! โหลด ${data.salespersons.length} สินค้า, ${data.customerHistory.length} ประวัติลูกค้า`);
    } catch (e) {
      console.error('Failed to fetch from Google Sheets:', e);
      if (e instanceof Error) {
        setError(`เชื่อมต่อไม่สำเร็จ: ${e.message}`);
      } else {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheets');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [googleSheetId, onDataContextChange]);

  const handleClear = () => {
    localStorage.removeItem('googleSheetId');
    setGoogleSheetId('');
    onDataContextChange(null);
    setError(null);
    setSuccessMessage('ตัดการเชื่อมต่อแล้ว AI จะใช้ความรู้ทั่วไป');
  };

  const isConnected = !!successMessage && !error;

  return (
    <div className="mb-6 p-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
      <h3 className="text-base sm:text-md font-semibold text-sky-600 dark:text-sky-400 mb-2">
        เชื่อมต่อ Google Sheet
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        ใส่ ID ของ Google Sheet ที่มีชีทชื่อ <b>"ข้อมูลสินค้า"</b> และ <b>"ข้อมูลลูกค้า"</b> เพื่อให้ AI วิเคราะห์ได้เฉียบคมยิ่งขึ้น
      </p>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-grow">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={googleSheetId}
            onChange={(e) => setGoogleSheetId(e.target.value)}
            placeholder="วาง Google Sheet ID ที่นี่"
            disabled={isLoading || isConnecting || isConnected}
            className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
            aria-label="Google Sheet ID"
          />
        </div>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isLoading || isConnecting || !googleSheetId.trim()}
            className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {isConnecting ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ'}
          </button>
        ) : (
          <button
            onClick={handleClear}
            disabled={isLoading || isConnecting}
            className="w-full sm:w-auto px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:bg-red-600/20 dark:hover:bg-red-600/30 dark:text-red-300 text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 flex items-center justify-center border border-red-500/20 dark:border-red-500/30 hover:border-red-500/30 dark:hover:border-red-500/40"
            aria-label="ล้างข้อมูลที่เชื่อมต่อ"
          >
            <TrashIcon className="h-5 w-5 mr-1 sm:mr-2 shrink-0" />
            ตัดการเชื่อมต่อ
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400 dark:text-red-300 animate-fadeIn">{error}</p>}
      {successMessage && !error && <p className="mt-2 text-xs text-green-600 dark:text-green-300 animate-fadeIn">{successMessage}</p>}
      {!error && !successMessage && !isConnected && <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">หากไม่มีการเชื่อมต่อ AI จะใช้ความรู้ทั่วไปในการวิเคราะห์</p>}
       <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      ` }} />
    </div>
  );
};