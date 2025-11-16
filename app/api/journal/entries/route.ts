import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { journalDB } from '@/lib/journal-db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const entries = await journalDB.getEntries(userId, limit, offset);
    const total = await journalDB.getTotalEntries(userId);

    return NextResponse.json({ total, entries });
  } catch (error: any) {
    console.error('[JOURNAL ENTRIES API] Error:', {
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

