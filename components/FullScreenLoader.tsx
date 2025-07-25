import React from 'react';

export const FullScreenLoader: React.FC<{ message?: string }> = ({ message = 'กำลังเตรียมข้อมูล...'}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-opacity duration-300 ease-in-out">
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <svg
          className="animate-spin h-16 w-16 text-sky-500 mb-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">{message}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">กรุณารอสักครู่ ระบบกำลังโหลดข้อมูลจากฐานข้อมูล</p>
      </div>
    </div>
  );
};
