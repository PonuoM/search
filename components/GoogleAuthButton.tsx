
import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';

interface GoogleAuthButtonProps {
    isLoggedIn: boolean;
    userProfile: { name: string; email: string; imageUrl: string; } | null;
    onLogin: () => void;
    onLogout: () => void;
    isGapiReady: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ isLoggedIn, userProfile, onLogin, onLogout, isGapiReady }) => {
    if (isLoggedIn && userProfile) {
        return (
            <div className="flex items-center gap-2">
                <img 
                    src={userProfile.imageUrl} 
                    alt={userProfile.name} 
                    className="h-8 w-8 rounded-full border-2 border-slate-300 dark:border-slate-600"
                    title={`Logged in as ${userProfile.name} (${userProfile.email})`}
                />
                <button
                    onClick={onLogout}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={onLogin}
            disabled={!isGapiReady}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm
                       text-slate-600 bg-white/80 border border-slate-300 hover:bg-slate-200
                       dark:text-slate-300 dark:bg-white/10 dark:border-white/20 dark:hover:bg-white/20
                       disabled:opacity-50 disabled:cursor-wait"
            aria-label="Login with Google"
        >
            <GoogleIcon className="h-4 w-4" />
            {isGapiReady ? 'Login' : 'Loading...'}
        </button>
    );
};
