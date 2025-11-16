import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { settingsDB } from '@/lib/settings-db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const prompt = await settingsDB.getChatPrompt(userId);

    return NextResponse.json({
      prompt: prompt || null,
    });
  } catch (error: any) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user.uid;

    const body = await request.json();
    const { prompt } = body;

    if (typeof prompt !== 'string') {
      return NextResponse.json({ detail: 'Prompt must be a string' }, { status: 400 });
    }

    await settingsDB.setChatPrompt(userId, prompt);

    return NextResponse.json({ success: true });
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

    await settingsDB.resetChatPrompt(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('authorization') || error.message.includes('token')) {
      return NextResponse.json({ detail: error.message }, { status: 401 });
    }
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}

