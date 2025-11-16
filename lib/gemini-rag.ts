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
  conversationHistory: Array<{ question: string; answer: string }> = []
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

  // Step 2: Retrieve relevant entries by matching keywords or concepts
  const relevantEntries = entriesWithKeywords.filter(entry =>
    entry.keywords!.some(entryKeyword => queryKeywords.includes(entryKeyword))
  );

  console.log(`[RAG] ✅ Filtered entries:`, {
    totalWithKeywords: entriesWithKeywords.length,
    relevantEntries: relevantEntries.length,
    queryKeywords: queryKeywords,
  });

  if (relevantEntries.length === 0) {
    return "I couldn't find any entries in your journal that seem related to your question.";
  }

  // Step 3: Generate an answer from the retrieved entries
  const formattedEntries = relevantEntries
    .map(entry => `Date: ${entry.date}\nEntry:\n${entry.text}`)
    .join('\n\n---\n\n');

  console.log(`[RAG] 📝 Sending ${relevantEntries.length} relevant entries to final prompt (out of ${entries.length} total)`);

  const finalPrompt = `
My name is Kai. I'm their closest friend who knows everything about them from their journal. I'm warm, casual, and speak naturally - like we're chatting over coffee, not reading from a database.

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
${conversationHistory.length > 0 
  ? conversationHistory.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')
  : 'This is a new conversation.'}

**Things I Know About You (from your journal):**
Each entry shows when it was written. Use these dates naturally when relevant.
${formattedEntries}

**How I Answer:**
- Like a friend who already knows the answer, not like I'm looking it up
- Reference things casually: "Oh yeah, you're [name]!" not "Based on your journal, your name is..."
- When asked about timing, use the dates naturally: "You wrote about that on [date]" or "You mentioned that in your entry from last week"
- Be warm and personal - use their name naturally if you know it, remember details
- If I don't know something specific from these entries, I can say so naturally: "Hmm, I don't remember you mentioning that specifically, but..."
- Keep it flowing like a real conversation between friends

I'm Kai, your friend who knows you from your journal - warm, casual, and genuine. Just talk naturally!

ANSWER:
  `;

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

