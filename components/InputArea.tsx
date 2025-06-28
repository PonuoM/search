
import React from 'react';
import { InputMode } from '../types'; // Import InputMode enum
import { UploadIcon } from './icons/UploadIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface InputAreaProps {
  onAnalyze: () => void;
  isLoading: boolean;
  currentInputMode: InputMode;
  setCurrentInputMode: (mode: InputMode) => void;
  transcriptText: string;
  setTranscriptText: (text: string) => void;
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  isDataConnected: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onAnalyze,
  isLoading,
  currentInputMode,
  setCurrentInputMode,
  transcriptText,
  setTranscriptText,
  audioFile,
  setAudioFile,
  isDataConnected
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAudioFile(event.target.files[0]);
    } else {
      setAudioFile(null);
    }
  };

  const activeTabClass = "bg-white/80 dark:bg-sky-500/10 backdrop-blur-sm text-sky-600 dark:text-sky-300 border-b-2 border-sky-500";
  const inactiveTabClass = "border-b-2 border-transparent text-slate-500 hover:bg-slate-200/60 hover:border-slate-300 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:border-transparent";

  const isAnalyzeButtonDisabled = isLoading || 
                                !isDataConnected ||
                                (currentInputMode === InputMode.TEXT && !transcriptText.trim()) || 
                                (currentInputMode === InputMode.AUDIO && !audioFile);

  return (
    <div className="p-6 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 dark:border-white/10">
      <div className="mb-4 flex border-b border-slate-200 dark:border-white/10">
        <button
          onClick={() => setCurrentInputMode(InputMode.TEXT)} // Use enum
          disabled={isLoading}
          className={`flex-1 py-3 px-4 font-medium text-sm rounded-t-lg transition-all duration-150 ${currentInputMode === InputMode.TEXT ? activeTabClass : inactiveTabClass} disabled:opacity-50`}
        >
          <ClipboardIcon className="inline-block h-5 w-5 mr-2" />
          วางข้อความถอดเสียง
        </button>
        <button
          onClick={() => setCurrentInputMode(InputMode.AUDIO)} // Use enum
          disabled={isLoading}
          className={`flex-1 py-3 px-4 font-medium text-sm rounded-t-lg transition-all duration-150 ${currentInputMode === InputMode.AUDIO ? activeTabClass : inactiveTabClass} disabled:opacity-50`}
        >
          <UploadIcon className="inline-block h-5 w-5 mr-2" />
          อัปโหลดไฟล์เสียง
        </button>
      </div>

      {currentInputMode === InputMode.TEXT && (
        <textarea
          value={transcriptText}
          onChange={(e) => setTranscriptText(e.target.value)}
          placeholder="วางข้อความที่ถอดเสียงจากการขายที่นี่ (ภาษาไทย)..."
          rows={10}
          className="w-full p-3 bg-white/50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 backdrop-blur-sm"
          disabled={isLoading}
        />
      )}

      {currentInputMode === InputMode.AUDIO && (
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-400/60 dark:border-white/20 rounded-lg bg-white/20 dark:bg-black/20 backdrop-blur-sm">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            id="audioUpload"
            className="hidden"
            disabled={isLoading}
          />
          <label
            htmlFor="audioUpload"
            className={`cursor-pointer px-6 py-3 rounded-lg text-sm font-medium transition-colors duration-150 border
            ${isLoading ? 'bg-slate-200 text-slate-500 border-slate-300' 
                       : 'bg-slate-50 hover:bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-100 dark:border-white/20'}`}
          >
            <UploadIcon className="inline-block h-5 w-5 mr-2" />
            {audioFile ? audioFile.name : 'เลือกไฟล์เสียง'}
          </label>
          {audioFile && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">รองรับไฟล์ MP3, WAV, M4A, ฯลฯ</p>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={isAnalyzeButtonDisabled}
        className="mt-6 w-full flex items-center justify-center bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:transform-none"
      >
        <SparklesIcon className="h-5 w-5 mr-2" />
        {isLoading ? 'กำลังวิเคราะห์...' : 'เริ่มวิเคราะห์'}
      </button>
    </div>
  );
};