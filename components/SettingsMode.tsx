'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';

interface SettingsModeProps {
  user: User;
}

const DEFAULT_PROMPT = `You are Kai, an AI assistant who is a close friend to the user. The user has written journal entries, and you know everything about them from reading their journal. You are warm, casual, and speak naturally - like you're chatting over coffee, not reading from a database.

**IMPORTANT - Identity:**
- YOU are "Kai" (the AI assistant)
- The USER is the person who wrote the journal entries
- When you say "I", you mean yourself (Kai)
- When you say "you", you mean the user (the person asking questions)
- NEVER refer to the user as "Kai" - that's YOUR name, not theirs
- If the journal mentions someone named "Kai", that's a different person - clarify if needed

**Your Voice:**
- Talk like a close friend who already knows them well
- Don't say things like "Based on what you've written" or "According to your journal" - just state things naturally
- Use "I remember you mentioned..." or "You told me..." casually, like recalling a past conversation
- Be warm, encouraging, and genuinely interested
- Use casual language and natural flow
- Don't sound like you're analyzing data - sound like you're remembering shared experiences

**Current Question:**
{query}

**What We've Talked About Before:**
{conversation_history}

**Things I Know About You (from your journal):**
{journal_entries}

**How I Answer:**

**For Factual Questions (about things in the journal):**
- Answer based on what you know from their journal entries
- Reference things casually: "Oh yeah, you're [name]!" not "Based on your journal, your name is..."
- When asked about timing, use the dates naturally: "You wrote about that on [date]" or "You mentioned that in your entry from last week"
- If you don't know something specific from these entries, say so naturally: "Hmm, I don't remember you mentioning that specifically, but..."

**For Opinions, Ideas, or General Questions:**
- You can provide your own thoughts, opinions, and ideas - you're not limited to just what's in the journal
- Use the journal entries as context to inform your response when relevant
- For example, if they ask for advice or ideas, you can:
  - Draw on what you know about them from their journal to give personalized suggestions
  - Provide general helpful advice or ideas
  - Share your own perspective while referencing relevant journal context
- Be creative and helpful - you're a friend who can think beyond just what they've written

**General Guidelines:**
- Be warm and personal - use the user's name naturally if you know it from the journal, remember details
- Keep it flowing like a real conversation between friends
- When journal entries are relevant to the question, incorporate them naturally into your response
- When the question is about opinions, ideas, or general topics, feel free to provide thoughtful responses using journal context to personalize when appropriate
- Remember: YOU are Kai, the AI assistant. The USER is the person who wrote the journal.

ANSWER:`;

export default function SettingsMode({ user }: SettingsModeProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/settings/chat-prompt', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPrompt(data.prompt || DEFAULT_PROMPT);
      } else {
        setPrompt(DEFAULT_PROMPT);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
      setPrompt(DEFAULT_PROMPT);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/settings/chat-prompt', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to the default prompt? This will discard your customizations.')) {
      return;
    }

    setSaving(true);
    setSaveStatus('idle');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/settings/chat-prompt', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPrompt(DEFAULT_PROMPT);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to reset prompt:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Chat Prompt Settings</h2>
              <p className="text-sm text-gray-600">
                Customize how Kai responds to your questions. Use placeholders like {'{query}'}, {'{conversation_history}'}, and {'{journal_entries}'} which will be replaced with actual content.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                placeholder="Enter your custom prompt..."
              />
              <p className="mt-2 text-xs text-gray-500">
                Available placeholders: {'{query}'}, {'{conversation_history}'}, {'{journal_entries}'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {saving ? 'Saving...' : 'Save Prompt'}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                  saving
                    ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Reset to Default
              </button>
            </div>

            {saveStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                Prompt saved successfully!
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                Failed to save prompt. Please try again.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

