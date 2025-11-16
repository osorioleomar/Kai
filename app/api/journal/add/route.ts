import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { journalDB } from '@/lib/journal-db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const formData = await request.formData();
    const text = formData.get('text') as string;

    if (!text || !text.trim()) {
      return NextResponse.json({ detail: 'Text is required' }, { status: 400 });
    }

    // Split text by double line breaks
    const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n|\r\s*\r/);
    const entries = paragraphs.map((p) => p.trim()).filter((p) => p);

    if (entries.length === 0) {
      return NextResponse.json(
        { detail: 'No valid content after splitting by double line breaks' },
        { status: 400 }
      );
    }

    const createdEntries = [];
    const baseTimestamp = new Date();

    for (let i = 0; i < entries.length; i++) {
      try {
        const entryText = entries[i];
        // Use a more unique ID to avoid collisions
        const entryId = `${Math.floor(baseTimestamp.getTime())}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const timestampIso = new Date(baseTimestamp.getTime() + i * 1000).toISOString();

        // Save to database (keywords will be generated asynchronously by frontend)
        await journalDB.addEntry(entryId, entryText, timestampIso, userId);

        createdEntries.push({
          id: entryId,
          text: entryText,
          timestamp: timestampIso,
        });
      } catch (error: any) {
        console.error(`Error saving entry ${i}:`, error);
        // Continue with other entries even if one fails
      }
    }

    if (createdEntries.length === 0) {
      return NextResponse.json(
        { detail: 'Failed to save any entries. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Saved ${createdEntries.length} journal entr${createdEntries.length === 1 ? 'y' : 'ies'}`,
      entries: createdEntries,
      count: createdEntries.length,
    });
  } catch (error: any) {
    console.error('[JOURNAL ADD API] Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    return NextResponse.json({ 
      detail: error.message || 'Internal server error',
      code: error.code,
    }, { status: 500 });
  }
}

