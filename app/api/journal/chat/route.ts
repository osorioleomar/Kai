import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAnswerFromJournal } from '@/lib/gemini-rag';
import { journalDB } from '@/lib/journal-db';
import { chatHistoryDB } from '@/lib/chat-history-db';


export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const body = await request.json();
    const { query, conversation_history = [] } = body;

    console.log(`[CHAT] 💬 New chat request:`, {
      userId,
      queryLength: query?.length || 0,
      queryPreview: query?.substring(0, 100),
      conversationHistoryLength: conversation_history.length,
    });

    if (!query) {
      return NextResponse.json({ detail: 'Query is required' }, { status: 400 });
    }

    // Limit conversation history to last 4 pairs
    const historyToSend = conversation_history.slice(-4);
    console.log(`[CHAT] 📜 Sending ${historyToSend.length} conversation history items to LLM`);

    // Get all entries with keywords for this user
    const entries = await journalDB.getAllEntriesWithKeywords(userId);
    console.log(`[CHAT] 📚 Retrieved ${entries.length} total journal entries from database`);

    // Get answer using RAG (filtering happens inside getAnswerFromJournal)
    console.log(`[CHAT] 🤖 Starting RAG pipeline (will filter entries by keywords)...`);
    const llmStartTime = Date.now();
    
    let summary: string;
    try {
      summary = await getAnswerFromJournal(query, entries, historyToSend);
      const llmDuration = Date.now() - llmStartTime;
      console.log(`[CHAT] ✅ RAG response received:`, {
        responseLength: summary.length,
        duration: `${llmDuration}ms`,
        responsePreview: summary.substring(0, 100),
      });
    } catch (error: any) {
      console.error(`[CHAT] ❌ RAG failed:`, {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { detail: error.message || 'Failed to get response' },
        { status: 500 }
      );
    }

    // Save to chat history
    try {
      console.log(`[CHAT] 💾 Saving to chat history:`, {
        questionLength: query.length,
        answerLength: summary.length,
      });
      await chatHistoryDB.addMessage(query, summary, userId);
      console.log(`[CHAT] ✅ Chat history saved successfully`);
    } catch (error: any) {
      console.error(`[CHAT] ❌ Failed to save chat history:`, {
        error: error.message,
        stack: error.stack,
      });
    }

    const totalDuration = Date.now() - llmStartTime;
    console.log(`[CHAT] 🎉 Complete chat flow finished in ${totalDuration}ms`);

    return NextResponse.json({
      summary,
      model_used: 'gemini-rag',
    });
  } catch (error: any) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}

