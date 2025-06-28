
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface HeaderProps {
  activePage: 'analyzer' | 'history';
  setActivePage: (page: 'analyzer' | 'history') => void;
}

export const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const activeClass = 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 shadow-inner';
  const inactiveClass = 'text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/10';

  return (
    <header className="text-center my-8 w-full max-w-5xl">
      <div className="flex items-center justify-center space-x-3 mb-2">
        <SparklesIcon className="h-10 w-10 text-sky-500 dark:text-sky-400" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-700 via-slate-800 to-black dark:from-slate-200 dark:via-slate-300 dark:to-slate-400">
          Sales Call Analyzer (TH)
        </h1>
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-lg">
        วิเคราะห์การสนทนาการขายและดูประวัติลูกค้าในที่เดียว
      </p>

      <nav className="mt-8 border-b border-slate-300/80 dark:border-white/10 flex justify-center">
        <div className="flex bg-slate-200/50 dark:bg-black/20 p-1 rounded-xl gap-2">
          <button 
            onClick={() => setActivePage('analyzer')} 
            className={`px-5 py-2 font-semibold text-sm rounded-lg transition-all duration-200 ${activePage === 'analyzer' ? activeClass : inactiveClass}`}
            aria-current={activePage === 'analyzer'}
          >
            AI Analyzer
          </button>
          <button 
            onClick={() => setActivePage('history')} 
            className={`px-5 py-2 font-semibold text-sm rounded-lg transition-all duration-200 ${activePage === 'history' ? activeClass : inactiveClass}`}
            aria-current={activePage === 'history'}
          >
            Sales History
          </button>
        </div>
      </nav>
    </header>
  );
};
