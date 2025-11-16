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

      // Try environment variable with full JSON first (best for Vercel)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (error) {
          console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
        }
      }

      // Try individual environment variables (also good for Vercel)
      if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
        if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
          serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          };
        }
      }

      // Try to load from JSON file (for local development)
      if (!serviceAccount) {
        let serviceAccountPath: string;
        
        // Check if custom path is provided via environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
          serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.startsWith('/')
            ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
            : path.join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        } else {
          serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        }

        if (fs.existsSync(serviceAccountPath)) {
          try {
            const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf-8');
            serviceAccount = JSON.parse(serviceAccountFile);
          } catch (error) {
            console.warn(`Failed to read service account file at ${serviceAccountPath}:`, error);
          }
        }
      }

      if (!serviceAccount) {
        throw new Error(
          'Firebase Admin SDK not configured. Please use one of the following:\n' +
          '1. Set FIREBASE_SERVICE_ACCOUNT (full JSON as string) - Recommended for Vercel\n' +
          '2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY - Also works on Vercel\n' +
          '3. Place firebase-service-account.json in the project root (local development only)\n' +
          '4. Set FIREBASE_SERVICE_ACCOUNT_PATH to a custom file path (local development only)'
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

