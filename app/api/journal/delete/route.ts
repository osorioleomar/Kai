import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { journalDB } from '@/lib/journal-db';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json(
        { detail: 'entryId parameter is required' },
        { status: 400 }
      );
    }

    await journalDB.deleteEntry(entryId, userId);

    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error: any) {
    console.error('[JOURNAL DELETE API] Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    if (error.message.includes('not found')) {
      return NextResponse.json({ detail: error.message }, { status: 404 });
    }
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ detail: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

