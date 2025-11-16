import { getFirestoreDB } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const prefix = process.env.FIREBASE_COLLECTION_PREFIX || 'my_kb_';
const collectionName = `${prefix}chat_history`;

export class ChatHistoryDB {
  private db = getFirestoreDB();
  private collection = this.db.collection(collectionName);

  async addMessage(
    question: string,
    answer: string,
    userId: string,
    timestamp?: string,
    sources?: string
  ): Promise<string> {
    const timestampStr = timestamp || new Date().toISOString() + 'Z';

    const docData: any = {
      question: question.trim(),
      answer: answer.trim(),
      timestamp: timestampStr,
      user_id: userId,
      created_at: Timestamp.now(),
    };

    if (sources) {
      docData.sources = sources;
    }

    const docRef = this.collection.doc();
    await docRef.set(docData);

    return docRef.id;
  }

  async getRecentMessages(userId: string, limit: number = 20): Promise<Array<{
    question: string;
    answer: string;
    timestamp: string;
    sources: string;
  }>> {
    const query = this.collection
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);

    const docs = await query.get();
    const messages = docs.docs.map((doc) => {
      const data = doc.data();
      return {
        question: data.question || '',
        answer: data.answer || '',
        timestamp: data.timestamp || '',
        sources: data.sources || '[]',
      };
    });

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  }

  async clearHistory(userId: string): Promise<number> {
    const query = this.collection.where('user_id', '==', userId);
    const docs = await query.get();

    // Batch delete (500 max per batch)
    const batches: Array<Promise<void>> = [];
    let batch = this.db.batch();
    let batchSize = 0;
    let count = 0;

    for (const doc of docs.docs) {
      batch.delete(doc.ref);
      batchSize++;
      count++;

      if (batchSize >= 500) {
        batches.push(batch.commit());
        batch = this.db.batch();
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      batches.push(batch.commit());
    }

    await Promise.all(batches);
    return count;
  }

  async getTotalCount(userId?: string): Promise<number> {
    if (userId) {
      const query = this.collection.where('user_id', '==', userId);
      const docs = await query.get();
      return docs.size;
    } else {
      const docs = await this.collection.get();
      return docs.size;
    }
  }
}

export const chatHistoryDB = new ChatHistoryDB();

