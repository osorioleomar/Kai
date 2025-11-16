import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatHistoryDB } from '@/lib/chat-history-db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const messages = await chatHistoryDB.getRecentMessages(userId, limit);
    const total = await chatHistoryDB.getTotalCount(userId);

    return NextResponse.json({ messages, total });
  } catch (error: any) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const deletedCount = await chatHistoryDB.clearHistory(userId);

    return NextResponse.json({
      message: `Cleared ${deletedCount} chat messages`,
      deleted: deletedCount,
    });
  } catch (error: any) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}

