import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateKeywordsForEntry } from '@/lib/gemini-rag';
import { journalDB } from '@/lib/journal-db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const body = await request.json();
    const { entryId, text } = body;

    if (!entryId || !text) {
      return NextResponse.json(
        { detail: 'entryId and text are required' },
        { status: 400 }
      );
    }

    // Generate keywords
    const keywords = await generateKeywordsForEntry(text);

    // Update entry with keywords
    await journalDB.updateEntryKeywords(entryId, keywords, userId);

    return NextResponse.json({
      success: true,
      keywords,
      entryId,
    });
  } catch (error: any) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    console.error('Error generating keywords:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

