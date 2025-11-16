'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { marked } from 'marked';

interface ChatMessage {
  question: string;
  answer: string;
  timestamp: string;
}

interface ChatModeProps {
  user: User;
}

export default function ChatMode({ user }: ChatModeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<ChatMessage[]>([]);

  useEffect(() => {
    loadConversationHistory();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/chat/history?limit=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const history = data.messages || [];
        conversationHistory.current = history;
        setMessages(history);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const handleSend = async () => {
    const userQuery = input.trim();
    if (!userQuery || processing) return;

    setInput('');
    setProcessing(true);
    setLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      question: userQuery,
      answer: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const token = await user.getIdToken();
      
      // Send conversation history (last 4 pairs for LLM context)
      const historyToSend = conversationHistory.current.slice(-4).map((item) => ({
        question: item.question,
        answer: item.answer,
      }));

      const response = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          conversation_history: historyToSend,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: ChatMessage = {
        question: userQuery,
        answer: data.summary || '',
        timestamp: new Date().toISOString(),
      };

      // Update conversation history
      conversationHistory.current.push(assistantMessage);

      // Update messages
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = assistantMessage;
        return updated;
      });
    } catch (error: any) {
      // Show error message
      const errorMessage: ChatMessage = {
        question: userQuery,
        answer: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = errorMessage;
        return updated;
      });
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = async () => {
    setClearing(true);
    setShowClearConfirm(false);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessages([]);
        conversationHistory.current = [];
      } else {
        throw new Error('Failed to clear chat history');
      }
    } catch (error: any) {
      alert(`Failed to clear chat history: ${error.message}`);
    } finally {
      setClearing(false);
    }
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !processing) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!showClearConfirm) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowClearConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showClearConfirm]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50 pb-24 sm:pb-28">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 sm:mt-20">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <p className="text-base sm:text-lg font-medium">Start a conversation with Kai</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Ask questions about your past entries to find memories and insights
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 px-2 sm:px-0 max-w-4xl mx-auto">
            {messages.map((msg, index) => (
              <div key={index} className="space-y-2">
                {/* User Message */}
                <div className="flex justify-end items-start gap-2 sm:gap-3">
                  <div className="max-w-[85%] sm:max-w-3xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-amber-600 text-white">
                    {msg.question}
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                {/* Assistant Message - only show if answer exists */}
                {msg.answer && (
                  <div className="flex justify-start items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-800 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                      K
                    </div>
                    <div className="max-w-[85%] sm:max-w-3xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-800 shadow-sm border border-gray-200">
                      {msg.answer.startsWith('Error:') ? (
                        <div className="text-red-800">{msg.answer}</div>
                      ) : (
                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(msg.answer) }} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (!messages.length || !messages[messages.length - 1]?.answer) && (
              <div className="flex justify-start items-start gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                  K
                </div>
                <div className="max-w-[85%] sm:max-w-3xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-800 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Area (Fixed at Bottom) */}
      <div className="bg-white border-t border-gray-200 p-3 sm:p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-end mb-2 sm:mb-3">
            <button
              onClick={handleClearClick}
              disabled={clearing}
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 active:text-gray-900 px-2 sm:px-3 py-1.5 sm:py-1 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearing ? 'Clearing...' : 'Clear'}
            </button>
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={processing}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
                placeholder="Type your message..."
              />
            </div>
            <button
              onClick={handleSend}
              disabled={processing || !input.trim()}
              className="bg-amber-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-amber-700 active:bg-amber-800 transition-colors flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 touch-manipulation min-w-[60px] sm:min-w-[80px] justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <svg className="w-5 h-5 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCancelClear}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear All Messages?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to clear all chat messages? This will permanently delete your conversation history and cannot be undone.
              </p>
              {messages.length > 0 && (
                <div className="bg-gray-50 rounded-md p-3 mb-4">
                  <p className="text-xs text-gray-500">
                    This will delete {messages.length} message{messages.length !== 1 ? 's' : ''} from your chat history.
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelClear}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClear}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

