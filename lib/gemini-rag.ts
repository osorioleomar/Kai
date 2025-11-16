// RAG service for journal entries using Google Gemini API
// Based on simple-journal implementation

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

export interface JournalEntry {
  id: string;
  text: string;
  date: string;
  keywords?: string[];
}

async function callGeminiAPI(prompt: string, temperature: number = 0.2, retries: number = 3): Promise<string> {
  if (!API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY or API_KEY environment variable is required');
  }

  const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: temperature,
          },
        }),
      });

      if (response.status === 429) {
        // Rate limit exceeded
        const errorData = await response.json().catch(() => ({}));
        const retryDelay = errorData.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay;
        const delayMs = retryDelay ? parseFloat(retryDelay) * 1000 : Math.pow(2, attempt) * 1000; // Exponential backoff
        
        if (attempt < retries - 1) {
          console.log(`Rate limit hit, waiting ${delayMs}ms before retry ${attempt + 1}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        } else {
          throw new Error('Rate limit exceeded. Please wait a minute and try again.');
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      const text = data.candidates[0].content.parts[0].text;
      return text.trim();
    } catch (error: any) {
      if (attempt === retries - 1) {
        throw error;
      }
      // For non-rate-limit errors, wait a bit before retrying
      if (!error.message?.includes('429') && !error.message?.includes('Rate limit')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw new Error('Failed to call Gemini API after retries');
}

export async function generateKeywordsForEntry(text: string): Promise<string[]> {
  const prompt = `You are a text analysis expert. Your task is to extract relevant keywords AND abstract concepts from a journal entry.
- **Keywords:** Focus on specific nouns, entities (people, places), and key activities.
- **Concepts:** Identify underlying feelings, themes, or ideas (e.g., "accomplishment", "anxiety", "new experiences", "personal connection", "attraction").
Provide up to 7 keywords and concepts in total. Return them as a comma-separated list.

JOURNAL ENTRY:
---
${text}
---

KEYWORDS & CONCEPTS:`;

  try {
    const keywordsText = await callGeminiAPI(prompt, 0.2);
    if (!keywordsText) return [];
    return keywordsText.split(',').map(kw => kw.trim().toLowerCase()).filter(kw => kw.length > 0);
  } catch (error) {
    console.error("Error generating keywords:", error);
    return ['error']; // Return a special keyword to indicate failure
  }
}

export async function getAnswerFromJournal(
  query: string,
  entries: JournalEntry[],
  conversationHistory: Array<{ question: string; answer: string }> = [],
  customPrompt?: string | null
): Promise<string> {
  if (!query.trim()) {
    return "Please ask a question.";
  }

  const entriesWithKeywords = entries.filter(
    e => e.keywords && e.keywords.length > 0 && e.keywords[0] !== 'error'
  );

  if (entriesWithKeywords.length === 0) {
    return "You don't have any journal entries that have been analyzed yet. Please wait a moment for the keywords to be generated.";
  }

  console.log(`[RAG] 📊 Starting RAG pipeline:`, {
    totalEntries: entries.length,
    entriesWithKeywords: entriesWithKeywords.length,
    query: query.substring(0, 100),
  });

  // Step 1: Extract keywords and concepts from the user's query
  const queryKeywordsPrompt = `You are a search expert. Extract the most important keywords AND abstract concepts from the user's question to find relevant journal entries.
- **Keywords:** Identify specific nouns, entities, or activities.
- **Concepts:** Identify the underlying theme or intent (e.g., "feelings of accomplishment", "anxiety", "social interaction", "romantic feelings").
Provide up to 5 keywords and concepts. Return them as a comma-separated list.

QUESTION:
---
${query}
---

KEYWORDS & CONCEPTS:`;

  let queryKeywords: string[] = [];
  try {
    const keywordsText = await callGeminiAPI(queryKeywordsPrompt, 0.1);
    queryKeywords = keywordsText.toLowerCase().split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
    console.log(`[RAG] 🔍 Extracted query keywords:`, queryKeywords);
  } catch (error) {
    console.error("Error generating query keywords:", error);
    return "Sorry, I had trouble understanding your question.";
  }

  if (queryKeywords.length === 0) {
    return "I couldn't determine the key topics of your question. Please try rephrasing it.";
  }

  // Step 2: Retrieve relevant entries using semantic matching (primary method)
  // Use keyword matching as a pre-filter to reduce the number of entries we need to check semantically
  let candidateEntries = entriesWithKeywords;
  
  // Pre-filter with keyword matching to reduce semantic search space
  const keywordMatches = entriesWithKeywords.filter(entry => {
    const entryKeywords = entry.keywords!;
    // Check for exact matches
    const hasExactMatch = entryKeywords.some(entryKeyword => queryKeywords.includes(entryKeyword));
    // Check for partial matches (query keyword contained in entry keyword or vice versa)
    const hasPartialMatch = entryKeywords.some(entryKeyword => 
      queryKeywords.some(queryKeyword => 
        entryKeyword.includes(queryKeyword) || queryKeyword.includes(entryKeyword)
      )
    );
    return hasExactMatch || hasPartialMatch;
  });

  console.log(`[RAG] 🔍 Keyword pre-filter results:`, {
    totalWithKeywords: entriesWithKeywords.length,
    keywordMatches: keywordMatches.length,
    queryKeywords: queryKeywords,
  });

  // Use keyword matches as candidates if we have some, otherwise check all entries
  // But limit to 50 entries max for semantic matching to avoid token limits
  if (keywordMatches.length > 0 && keywordMatches.length <= 50) {
    candidateEntries = keywordMatches;
    console.log(`[RAG] 🎯 Using ${candidateEntries.length} keyword-matched entries for semantic validation`);
  } else {
    // If too many keyword matches or none, check most recent entries
    candidateEntries = entriesWithKeywords.slice(0, Math.min(50, entriesWithKeywords.length));
    console.log(`[RAG] 🔄 Checking ${candidateEntries.length} most recent entries semantically`);
  }

  // Always use semantic matching to find truly relevant entries
  let relevantEntries: JournalEntry[] = [];
  
  const semanticMatchingPrompt = `You are a search expert. Given a user's question and a list of journal entries, identify which entries are relevant to answering the question.

QUESTION:
---
${query}
---

JOURNAL ENTRIES:
${candidateEntries.map((entry, idx) => 
  `[${idx}] Date: ${entry.date}\nKeywords: ${entry.keywords?.join(', ') || 'none'}\nEntry: ${entry.text.substring(0, 400)}${entry.text.length > 400 ? '...' : ''}`
).join('\n\n---\n\n')}

Return ONLY a comma-separated list of entry indices (0-based) that are relevant to the question. For example: "0,2,5"
If multiple entries are relevant, include them all. If none are relevant, return "none".

RELEVANT ENTRY INDICES:`;

  try {
    console.log(`[RAG] 🤖 Running semantic matching on ${candidateEntries.length} entries...`);
    const semanticResult = await callGeminiAPI(semanticMatchingPrompt, 0.1);
    const matchedIndices = semanticResult.trim().toLowerCase();
    
    if (matchedIndices !== 'none' && matchedIndices.length > 0) {
      const indices = matchedIndices
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n >= 0 && n < candidateEntries.length);
      
      if (indices.length > 0) {
        relevantEntries = indices.map(idx => candidateEntries[idx]);
        console.log(`[RAG] ✅ Semantic matching found ${relevantEntries.length} relevant entries`);
      } else {
        console.log(`[RAG] ⚠️ Semantic matching returned invalid indices`);
      }
    } else {
      console.log(`[RAG] ⚠️ Semantic matching found no relevant entries`);
    }
  } catch (error) {
    console.error("Error in semantic matching:", error);
    // Fall back to keyword matches if semantic matching fails
    relevantEntries = keywordMatches.slice(0, 5);
    console.log(`[RAG] ⚠️ Falling back to ${relevantEntries.length} keyword-matched entries`);
  }

  console.log(`[RAG] ✅ Final filtered entries:`, {
    totalWithKeywords: entriesWithKeywords.length,
    relevantEntries: relevantEntries.length,
  });

  // Step 3: Generate an answer (even if no entries found, Kai can still provide opinions/ideas)
  const formattedEntries = relevantEntries.length > 0
    ? relevantEntries
        .map(entry => `Date: ${entry.date}\nEntry:\n${entry.text}`)
        .join('\n\n---\n\n')
    : 'No specific journal entries were found that directly relate to this question.';

  console.log(`[RAG] 📝 Sending ${relevantEntries.length} relevant entries to final prompt (out of ${entries.length} total)`);

  // Prepare conversation history text
  const conversationHistoryText = conversationHistory.length > 0 
    ? conversationHistory.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')
    : 'This is a new conversation.';

  // Prepare journal entries text
  const journalEntriesText = relevantEntries.length > 0 
    ? `Each entry shows when it was written. Use these dates naturally when relevant.\n${formattedEntries}`
    : 'No specific journal entries were found that directly relate to this question. You can still answer based on your general knowledge, opinions, or ideas - use any general context you have about the user if helpful.';

  // Use custom prompt if provided, otherwise use default
  let finalPrompt: string;
  if (customPrompt) {
    // Replace placeholders in custom prompt
    finalPrompt = customPrompt
      .replace(/\{query\}/g, query)
      .replace(/\{conversation_history\}/g, conversationHistoryText)
      .replace(/\{journal_entries\}/g, journalEntriesText);
  } else {
    // Default prompt
    finalPrompt = `
You are Kai, an AI assistant who is a close friend to the user. The user has written journal entries, and you know everything about them from reading their journal. You are warm, casual, and speak naturally - like you're chatting over coffee, not reading from a database.

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
${query}

**What We've Talked About Before:**
${conversationHistoryText}

**Things I Know About You (from your journal):**
${journalEntriesText}

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

ANSWER:
  `;
  }

  try {
    const answer = await callGeminiAPI(finalPrompt, 0.7);
    return answer;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      return `Sorry, I encountered an error: ${error.message}`;
    }
    return "Sorry, I encountered an unknown error while trying to answer your question.";
  }
}

