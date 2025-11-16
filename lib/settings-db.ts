import { getFirestoreDB } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const prefix = process.env.FIREBASE_COLLECTION_PREFIX || 'my_kb_';
const collectionName = `${prefix}user_settings`;

export class SettingsDB {
  private db = getFirestoreDB();
  private collection = this.db.collection(collectionName);

  async getChatPrompt(userId: string): Promise<string | null> {
    const docRef = this.collection.doc(userId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return data?.chat_prompt || null;
  }

  async setChatPrompt(userId: string, prompt: string): Promise<void> {
    const docRef = this.collection.doc(userId);
    await docRef.set({
      chat_prompt: prompt,
      updated_at: Timestamp.now(),
    }, { merge: true });
  }

  async resetChatPrompt(userId: string): Promise<void> {
    const docRef = this.collection.doc(userId);
    await docRef.update({
      chat_prompt: null,
      updated_at: Timestamp.now(),
    });
  }
}

export const settingsDB = new SettingsDB();

