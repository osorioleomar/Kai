'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';

interface EntryModeProps {
  user: User;
  onEntryAdded?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'generating' | 'success';

// Type for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function EntryMode({ user, onEntryAdded }: EntryModeProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition);
  }, []);

  // Cleanup: stop recording when component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      showNotification('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.', 'error');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let interimTranscript = '';

      recognition.onstart = () => {
        setIsRecording(true);
        setStatusMessage('Listening...');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }

        if (finalTranscript) {
          setText((prev) => {
            const newText = prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript;
            return newText;
          });
          interimTranscript = '';
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setStatusMessage('No speech detected. Try again.');
        } else if (event.error === 'audio-capture') {
          showNotification('No microphone found. Please check your microphone settings.', 'error');
        } else if (event.error === 'not-allowed') {
          showNotification('Microphone permission denied. Please allow microphone access.', 'error');
        } else {
          showNotification(`Speech recognition error: ${event.error}`, 'error');
        }
        setIsRecording(false);
        setStatusMessage('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setStatusMessage('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error: any) {
      console.error('Failed to start speech recognition:', error);
      showNotification('Failed to start voice recording. Please try again.', 'error');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      setStatusMessage('');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const generateKeywordsForEntry = async (entryId: string, entryText: string, token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/journal/generate-keywords', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          text: entryText,
        }),
      });

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        if (errorData.detail?.includes('Rate limit') || errorData.detail?.includes('429')) {
          // Rate limit - wait and retry once
          await new Promise(resolve => setTimeout(resolve, 40000));
          return await generateKeywordsForEntry(entryId, entryText, token);
        }
        return false;
      }
    } catch (error) {
      console.error(`Failed to generate keywords for entry ${entryId}:`, error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      showNotification('Please enter some text before saving.', 'error');
      return;
    }

    setSaving(true);
    setSaveStatus('saving');
    setStatusMessage('Saving journal...');

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('text', text);

      // Step 1: Save entry
      const response = await fetch('/api/journal/add', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save entry' }));
        throw new Error(errorData.detail || 'Failed to save entry');
      }

      const data = await response.json();
      const savedEntries = data.entries || [];
      
      // Step 2: Generate keywords for each saved entry
      if (savedEntries.length > 0) {
        setSaveStatus('generating');
        setStatusMessage(`Generating keywords for ${savedEntries.length} entr${savedEntries.length === 1 ? 'y' : 'ies'}...`);
        
        for (let i = 0; i < savedEntries.length; i++) {
          const entry = savedEntries[i];
          setStatusMessage(`Generating keywords (${i + 1}/${savedEntries.length})...`);
          
          await generateKeywordsForEntry(entry.id, entry.text, token);
          
          // Wait 7 seconds between requests to respect rate limits (except for last one)
          if (i < savedEntries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 7000));
          }
        }
      }

      // Step 3: Success
      setSaveStatus('success');
      setStatusMessage('Saved successfully!');
      setText('');
      
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 2000);

      if (data.count && data.count > 1) {
        showNotification(`Saved ${data.count} journal entries with keywords!`, 'success');
      } else {
        showNotification('Entry saved successfully with keywords!', 'success');
      }

      if (onEntryAdded) {
        onEntryAdded();
      }
    } catch (error: any) {
      setSaveStatus('idle');
      setStatusMessage('');
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white p-4 sm:p-6 min-h-full flex flex-col">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                Write a new entry
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Type, paste, or use voice dictation to record your thoughts, experiences, or reflections.
              </p>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                id="journalText"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={20}
                className="w-full flex-1 min-h-[50vh] sm:min-h-[400px] px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base resize-y touch-manipulation"
                placeholder="What's on your mind today? Type or paste your thoughts here..."
                disabled={saving || isRecording}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mt-3">
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm text-gray-500">
                    {text.length.toLocaleString()} characters
                  </span>
                  {(saveStatus !== 'idle' || isRecording) && (
                    <span className={`text-xs sm:text-sm mt-1 ${
                      isRecording ? 'text-red-600 font-medium' :
                      saveStatus === 'success' ? 'text-amber-600' : 
                      saveStatus === 'generating' ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      {isRecording ? '🎤 Recording... Speak now' : statusMessage}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {isSpeechSupported && (
                    <button
                      onClick={toggleRecording}
                      disabled={saving}
                      className={`p-2.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isRecording ? 'Stop recording' : 'Start voice dictation'}
                    >
                      {isRecording ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <rect x="6" y="6" width="8" height="8" rx="1" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !text.trim()}
                    className="bg-amber-600 text-white flex-1 sm:flex-none px-6 py-2.5 sm:py-2.5 rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center touch-manipulation"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {saveStatus === 'saving' ? 'Saving...' : 
                         saveStatus === 'generating' ? 'Generating keywords...' : 
                         'Processing...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Save Entry
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
            notification.type === 'success' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

