import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatHistoryDB } from '@/lib/chat-history-db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const beforeTimestamp = searchParams.get('before');

    let messages;
    if (beforeTimestamp) {
      // Parse the timestamp string back to Timestamp
      const { Timestamp } = await import('firebase-admin/firestore');
      const beforeDate = new Date(beforeTimestamp);
      const beforeTs = Timestamp.fromDate(beforeDate);
      messages = await chatHistoryDB.getRecentMessages(userId, limit, beforeTs);
    } else {
      messages = await chatHistoryDB.getRecentMessages(userId, limit);
    }

    const total = await chatHistoryDB.getTotalCount(userId);

    // Add created_at as ISO string for pagination
    const messagesWithTimestamp = messages.map(msg => ({
      ...msg,
      created_at: msg.created_at?.toDate().toISOString() || msg.timestamp,
    }));

    return NextResponse.json({ 
      messages: messagesWithTimestamp, 
      total,
      hasMore: messages.length === limit
    });
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

