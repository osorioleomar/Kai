import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';

export async function getCurrentUser(request: NextRequest): Promise<{ uid: string; email?: string }> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

