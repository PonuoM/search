
import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="my-6 p-4 bg-red-900/40 backdrop-blur-sm border border-red-700/60 text-red-300 rounded-lg flex items-start space-x-3 shadow-lg">
      <AlertTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-semibold text-red-200">เกิดข้อผิดพลาด</h4>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};