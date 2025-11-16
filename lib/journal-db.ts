import { getFirestoreDB } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const prefix = process.env.FIREBASE_COLLECTION_PREFIX || 'my_kb_';
const collectionName = `${prefix}journal_entries`;

export interface JournalEntry {
  id: string;
  text: string;
  timestamp: string;
  chunk_id?: number;
  entry_id?: string;
  keywords?: string[];
  date?: string; // ISO date string for compatibility with RAG UI
}

export class JournalDB {
  private db = getFirestoreDB();
  private collection = this.db.collection(collectionName);

  // Helper to safely parse date from timestamp
  private safeParseDate(timestamp: string | undefined): string {
    if (!timestamp) {
      return new Date().toISOString().split('T')[0];
    }
    try {
      const dateObj = new Date(timestamp);
      if (isNaN(dateObj.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return dateObj.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  async addEntry(
    entryId: string,
    text: string,
    timestamp: string,
    userId: string,
    keywords?: string[]
  ): Promise<JournalEntry> {
    // Get next chunk_id (count of existing documents for this user + 1)
    const query = this.collection.where('user_id', '==', userId);
    const existingDocs = await query.get();
    const chunkId = existingDocs.size + 1;

    // Extract date from timestamp (handle both ISO strings and other formats)
    let date: string;
    try {
      const dateObj = new Date(timestamp);
      if (isNaN(dateObj.getTime())) {
        // Invalid date, use current date
        date = new Date().toISOString().split('T')[0];
      } else {
        date = dateObj.toISOString().split('T')[0];
      }
    } catch {
      date = new Date().toISOString().split('T')[0];
    }

    // Create document with entry_id as document ID for easy lookup
    const docRef = this.collection.doc(entryId);
    await docRef.set({
      chunk_id: chunkId,
      entry_id: entryId,
      text: text.trim(),
      timestamp: timestamp,
      date: date,
      source_file: 'journal',
      user_id: userId,
      keywords: keywords || [],
      created_at: Timestamp.now(),
    });

    return {
      id: entryId,
      text: text.trim(),
      timestamp: timestamp,
      date: date,
      chunk_id: chunkId,
      entry_id: entryId,
      keywords: keywords,
    };
  }

  async updateEntryKeywords(entryId: string, keywords: string[], userId: string): Promise<void> {
    const docRef = this.collection.doc(entryId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error(`Entry ${entryId} not found`);
    }
    
    const data = doc.data();
    if (data?.user_id !== userId) {
      throw new Error('Unauthorized: Entry does not belong to user');
    }
    
    await docRef.update({
      keywords: keywords,
    });
  }

  async deleteEntry(entryId: string, userId: string): Promise<void> {
    const docRef = this.collection.doc(entryId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error(`Entry ${entryId} not found`);
    }
    
    const data = doc.data();
    if (data?.user_id !== userId) {
      throw new Error('Unauthorized: Entry does not belong to user');
    }
    
    await docRef.delete();
  }

  async getEntries(userId: string, limit: number = 50, offset: number = 0): Promise<Array<{
    chunk_id: number;
    entry_id: string;
    text: string;
    timestamp: string;
    source_file: string;
    date?: string;
    keywords?: string[];
  }>> {
    try {
      // Try with composite index first (orderBy on timestamp)
      const query = this.collection
        .where('user_id', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit + offset);

      const docs = await query.get();
      const entries = docs.docs.slice(offset, offset + limit).map((doc) => {
        const data = doc.data();
        return {
          chunk_id: data.chunk_id || 0,
          entry_id: data.entry_id || doc.id,
          text: data.text || '',
          timestamp: data.timestamp || '',
          source_file: data.source_file || 'journal',
          date: data.date || this.safeParseDate(data.timestamp),
          keywords: data.keywords || [],
        };
      });

      return entries;
    } catch (error: any) {
      // Fallback: Get all and sort in memory if composite index doesn't exist
      if (error.message?.includes('index') || error.code === 9) {
        console.warn('Composite index not found, falling back to in-memory sort');
        const query = this.collection.where('user_id', '==', userId);
        const docs = await query.get();
        
        const allEntries = docs.docs.map((doc) => {
          const data = doc.data();
          return {
            doc,
            data: {
              chunk_id: data.chunk_id || 0,
              entry_id: data.entry_id || doc.id,
              text: data.text || '',
              timestamp: data.timestamp || '',
              source_file: data.source_file || 'journal',
              date: data.date || this.safeParseDate(data.timestamp),
              keywords: data.keywords || [],
            },
          };
        });

        // Sort by timestamp descending
        allEntries.sort((a, b) => {
          const timeA = a.data.timestamp || '';
          const timeB = b.data.timestamp || '';
          return timeB.localeCompare(timeA);
        });

        // Apply pagination
        const paginated = allEntries.slice(offset, offset + limit);
        return paginated.map(entry => entry.data);
      }
      throw error;
    }
  }

  async getAllEntriesWithKeywords(userId: string): Promise<Array<{
    id: string;
    text: string;
    date: string;
    keywords?: string[];
  }>> {
    try {
      const query = this.collection
        .where('user_id', '==', userId)
        .orderBy('timestamp', 'desc');

      const docs = await query.get();
      return docs.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.entry_id || doc.id,
          text: data.text || '',
          date: data.date || this.safeParseDate(data.timestamp),
          keywords: data.keywords || [],
        };
      });
    } catch (error: any) {
      // Fallback: Get all and sort in memory if composite index doesn't exist
      if (error.message?.includes('index') || error.code === 9) {
        console.warn('Composite index not found, falling back to in-memory sort');
        const query = this.collection.where('user_id', '==', userId);
        const docs = await query.get();
        
        const allEntries = docs.docs.map((doc) => {
          const data = doc.data();
          return {
            timestamp: data.timestamp || '',
            entry: {
              id: data.entry_id || doc.id,
              text: data.text || '',
              date: data.date || this.safeParseDate(data.timestamp),
              keywords: data.keywords || [],
            },
          };
        });

        // Sort by timestamp descending
        allEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return allEntries.map(entry => entry.entry);
      }
      throw error;
    }
  }

  async getTotalEntries(userId?: string): Promise<number> {
    if (userId) {
      const query = this.collection.where('user_id', '==', userId);
      const docs = await query.get();
      return docs.size;
    } else {
      const docs = await this.collection.get();
      return docs.size;
    }
  }

  async getAllEntriesForMetadata(userId?: string): Promise<Array<{
    chunk_id: number;
    text: string;
    source_file: string;
    timestamp: string;
    entry_id: string;
    user_id?: string;
  }>> {
    let query = this.collection.orderBy('chunk_id', 'asc');
    if (userId) {
      query = this.collection.where('user_id', '==', userId).orderBy('chunk_id', 'asc');
    }

    const docs = await query.get();
    return docs.docs.map((doc) => {
      const data = doc.data();
      return {
        chunk_id: data.chunk_id || 0,
        text: data.text || '',
        source_file: data.source_file || 'journal',
        timestamp: data.timestamp || '',
        entry_id: data.entry_id || doc.id,
        user_id: data.user_id,
      };
    });
  }
}

export const journalDB = new JournalDB();

