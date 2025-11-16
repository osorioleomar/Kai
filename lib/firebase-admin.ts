import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let app: App | null = null;
let db: Firestore | null = null;

export function getFirestoreDB(): Firestore {
  if (db) {
    return db;
  }

  if (!app) {
    // Check if already initialized
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      let serviceAccount: any = null;

      // Try to load from JSON file first
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        try {
          const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf-8');
          serviceAccount = JSON.parse(serviceAccountFile);
        } catch (error) {
          console.warn('Failed to read firebase-service-account.json:', error);
        }
      }

      // Fallback to environment variables
      if (!serviceAccount) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else if (process.env.FIREBASE_PROJECT_ID) {
          serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          };
        }
      }

      if (!serviceAccount) {
        throw new Error(
          'Firebase Admin SDK not configured. Please either:\n' +
          '1. Place firebase-service-account.json in the project root, OR\n' +
          '2. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID environment variables.'
        );
      }

      app = initializeApp({
        credential: cert(serviceAccount as any),
      });
    }
  }

  db = getFirestore(app);
  return db;
}

