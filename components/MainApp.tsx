'use client';

import { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase-client';
import EntryMode from './EntryMode';
import JournalMode from './JournalMode';
import ChatMode from './ChatMode';
import SettingsMode from './SettingsMode';

interface MainAppProps {
  user: User;
}

type Mode = 'entry' | 'journal' | 'chat' | 'settings';

export default function MainApp({ user }: MainAppProps) {
  const [currentMode, setCurrentMode] = useState<Mode>('entry');

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Header with Mode Toggle */}
        <div className="bg-white border-b border-gray-200 p-3 sm:p-4 sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                  📔
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800">Kai</h2>
                  <p className="text-xs text-gray-500 hidden sm:block">Your journal keeper</p>
                </div>
              </div>
              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                className="ml-3 sm:ml-4 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation"
                title="Logout"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
            <div className="w-full sm:w-auto">
              {/* Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentMode('entry')}
                  className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none text-center ${
                    currentMode === 'entry'
                      ? 'bg-white text-amber-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  New Entry
                </button>
                <button
                  onClick={() => setCurrentMode('journal')}
                  className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none text-center ${
                    currentMode === 'journal'
                      ? 'bg-white text-amber-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Journal
                </button>
                <button
                  onClick={() => setCurrentMode('chat')}
                  className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none text-center ${
                    currentMode === 'chat'
                      ? 'bg-white text-amber-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setCurrentMode('settings')}
                  className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none text-center ${
                    currentMode === 'settings'
                      ? 'bg-white text-amber-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Content */}
        {currentMode === 'entry' && <EntryMode user={user} />}
        {currentMode === 'journal' && <JournalMode user={user} />}
        {currentMode === 'chat' && <ChatMode user={user} />}
        {currentMode === 'settings' && <SettingsMode user={user} />}
      </div>
    </div>
  );
}

