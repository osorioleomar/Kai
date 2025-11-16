'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';

interface JournalEntry {
  id: string;
  text: string;
  date: string;
  keywords?: string[];
}

interface JournalModeProps {
  user: User;
}

// Icons component
const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

const TagIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

const KeywordTags = ({ keywords }: { keywords?: string[] }) => {
  if (!keywords) {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-3">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
        <span>Analyzing entry...</span>
      </div>
    );
  }
  
  if (keywords.length > 0 && keywords[0] === 'error') {
    return (
      <div className="flex items-center space-x-2 text-xs text-red-500 mt-3">
        <span>Analysis failed. Will retry automatically.</span>
      </div>
    );
  }

  if (keywords.length > 0 && keywords[0] === 'rate-limited') {
    return (
      <div className="flex items-center space-x-2 text-xs text-yellow-600 mt-3">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
        <span>Waiting for rate limit... (processing slowly to avoid limits)</span>
      </div>
    );
  }
  
  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center flex-wrap gap-2">
      <TagIcon className="w-4 h-4 text-gray-400" />
      {keywords.map((kw) => (
        <span key={kw} className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
          {kw}
        </span>
      ))}
    </div>
  );
};

export default function JournalMode({ user }: JournalModeProps) {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ entryId: string; entryText: string } | null>(null);
  const processingRef = useRef(false);

  const loadEntries = useCallback(async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/journal/entries?limit=100&offset=0', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load entries');
      }

      const data = await response.json();
      const entries: JournalEntry[] = (data.entries || []).map((entry: any) => ({
        id: entry.entry_id || entry.chunk_id?.toString() || '',
        text: entry.text,
        date: entry.date || new Date(entry.timestamp).toISOString().split('T')[0],
        keywords: entry.keywords || [],
      }));
      setJournalEntries(entries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Process entries that need keywords (with rate limiting)
  useEffect(() => {
    const processEntries = async () => {
      // Prevent multiple concurrent processing loops
      if (processingRef.current) return;
      
      const entriesToProcess = journalEntries.filter(
        entry => !entry.keywords || entry.keywords.length === 0 || entry.keywords[0] === 'error' || entry.keywords[0] === 'rate-limited'
      );
      if (entriesToProcess.length === 0) return;

      processingRef.current = true;

      // Process entries one at a time with delays to respect rate limits
      // Free tier: 10 requests per minute = 1 request every 6 seconds minimum
      for (let i = 0; i < entriesToProcess.length; i++) {
        const entry = entriesToProcess[i];
        
        // Skip if already processing or has keywords (except error)
        const currentEntry = journalEntries.find(e => e.id === entry.id);
        if (currentEntry?.keywords && currentEntry.keywords.length > 0 && currentEntry.keywords[0] !== 'error') {
          continue;
        }

        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/journal/generate-keywords', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entryId: entry.id,
              text: entry.text,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setJournalEntries(currentEntries =>
              currentEntries.map(e =>
                e.id === entry.id ? { ...e, keywords: data.keywords } : e
              )
            );
          } else {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            if (errorData.detail?.includes('Rate limit') || errorData.detail?.includes('429')) {
              // Rate limit hit - mark for retry later and wait longer
              console.log('Rate limit hit, will retry later');
              setJournalEntries(currentEntries =>
                currentEntries.map(e =>
                  e.id === entry.id ? { ...e, keywords: ['rate-limited'] } : e
                )
              );
              // Wait 40 seconds before processing next entry
              await new Promise(resolve => setTimeout(resolve, 40000));
            } else {
              setJournalEntries(currentEntries =>
                currentEntries.map(e =>
                  e.id === entry.id ? { ...e, keywords: ['error'] } : e
                )
              );
            }
          }
        } catch (error) {
          console.error(`Failed to generate keywords for entry ${entry.id}:`, error);
          setJournalEntries(currentEntries =>
            currentEntries.map(e =>
              e.id === entry.id ? { ...e, keywords: ['error'] } : e
            )
          );
        }

        // Wait 7 seconds between requests to stay under rate limit (10/min = 6 sec min, using 7 for safety)
        if (i < entriesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 7000));
        }
      }
      
      processingRef.current = false;
    };

    processEntries();
  }, [journalEntries, user]);

  const handleDeleteClick = (entryId: string, entryText: string) => {
    const preview = entryText.length > 100 ? entryText.substring(0, 100) + '...' : entryText;
    setConfirmDelete({ entryId, entryText: preview });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    const entryId = confirmDelete.entryId;
    setDeletingId(entryId);
    setConfirmDelete(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/journal/delete?entryId=${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete entry');
      }

      // Remove from local state
      setJournalEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!confirmDelete) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmDelete(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [confirmDelete]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your Journal Entries</h2>
            <p className="text-sm text-gray-600">View all your journal entries with their generated keywords.</p>
          </div>

          {loading ? (
            <div className="text-center py-10 px-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Loading entries...</p>
            </div>
          ) : journalEntries.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No entries yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your journal is empty. Add a new entry in the "New Entry" tab to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {journalEntries.map(entry => (
                <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-700">
                        {new Date(entry.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="mt-2 text-gray-700 font-serif whitespace-pre-wrap text-sm">{entry.text}</p>
                      <KeywordTags keywords={entry.keywords} />
                    </div>
                    <button
                      onClick={() => handleDeleteClick(entry.id, entry.text)}
                      disabled={deletingId === entry.id}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 active:bg-red-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                      title="Delete entry"
                    >
                      {deletingId === entry.id ? (
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCancelDelete}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Entry?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this entry? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-md p-3 mb-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-700 font-serif whitespace-pre-wrap">
                  {confirmDelete.entryText}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
