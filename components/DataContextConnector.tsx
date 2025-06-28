
import React from 'react';
import { LinkIcon } from './icons/LinkIcon';
import { TrashIcon } from './icons/TrashIcon'; 
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface DataContextConnectorProps {
  isLoading: boolean;
  googleSheetId: string;
  setGoogleSheetId: (id: string) => void;
  isConnected: boolean;
}

export const DataContextConnector: React.FC<DataContextConnectorProps> = ({ 
  isLoading,
  googleSheetId,
  setGoogleSheetId,
  isConnected
}) => {

  const handleClear = () => {
    setGoogleSheetId('');
  };

  return (
    <div className="mb-6 p-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
      <h3 className="text-base sm:text-md font-semibold text-sky-600 dark:text-sky-400 mb-2">
        เชื่อมต่อ Google Sheet (Real-time)
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        ใส่ ID ของ Google Sheet ที่มีชีทชื่อ <b>"ข้อมูลสินค้า"</b> และ <b>"SalesData_Realtime"</b> เพื่อให้ AI วิเคราะห์จากข้อมูลล่าสุดได้
      </p>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-grow">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={googleSheetId}
            onChange={(e) => setGoogleSheetId(e.target.value)}
            placeholder="วาง Google Sheet ID ที่นี่"
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
            aria-label="Google Sheet ID"
          />
        </div>
        {googleSheetId && (
            <button
                onClick={handleClear}
                disabled={isLoading}
                className="w-full sm:w-auto px-3 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 flex items-center justify-center border border-slate-300 dark:border-white/20"
                aria-label="ล้าง Sheet ID"
            >
                <TrashIcon className="h-5 w-5 shrink-0" />
            </button>
        )}
      </div>
      {isConnected && (
         <p className="mt-2 text-xs text-green-600 dark:text-green-300 animate-fadeIn flex items-center">
            <CheckCircleIcon className="h-4 w-4 mr-1.5" />
            เชื่อมต่อกับ Google Sheet สำเร็จแล้ว
         </p>
      )}
       <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      ` }} />
    </div>
  );
};
