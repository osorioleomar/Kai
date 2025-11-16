# Setup and Run Instructions

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Firebase project configured
- Google AI API key (for Gemini)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Google AI API Key for Gemini
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Groq API Key (optional, fallback)
GROQ_API_KEY=your_groq_api_key_here

# Firebase Admin SDK - Option 1: Use service account JSON
# Copy your firebase-service-account.json to the project root and reference it
# Or use environment variables below:

# Firebase Admin SDK - Option 2: Environment variables
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Firebase Collection Prefix (optional)
FIREBASE_COLLECTION_PREFIX=my_kb_

# Firebase Web Config (for client-side authentication)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Getting Firebase Credentials

1. **Firebase Admin SDK:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file
   - Either:
     - Copy the JSON file to `nextjs-migration/firebase-service-account.json`, OR
     - Extract `project_id`, `client_email`, and `private_key` to environment variables

2. **Firebase Web Config:**
   - Go to Firebase Console → Project Settings → Your apps
   - If you don't have a web app, click the `</>` icon to add one
   - Copy the config values from the Firebase SDK snippet

3. **Google AI API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy it to `GOOGLE_AI_API_KEY`

4. **Groq API Key (Optional):**
   - Go to [Groq Console](https://console.groq.com)
   - Create an API key
   - Copy it to `GROQ_API_KEY`

## Step 3: Run the Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

## Step 4: Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Firebase Admin SDK Issues

If you get Firebase Admin SDK errors:

1. **Using JSON file:**
   - Make sure `firebase-service-account.json` is in the project root
   - The file is automatically loaded by `lib/firebase-admin.ts`

2. **Using environment variables:**
   - Make sure `FIREBASE_PRIVATE_KEY` includes the full key with `\n` characters
   - The private key should be wrapped in quotes in `.env.local`

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
PORT=3001 npm run dev
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Regenerate TypeScript types
npm run build
```

## Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file created with all required variables
- [ ] Firebase service account configured
- [ ] Firebase web config added
- [ ] Google AI API key added
- [ ] Development server running (`npm run dev`)
- [ ] Application accessible at http://localhost:3000

## First Time Setup

1. Open http://localhost:3000
2. Sign in with Firebase (email/password or Google)
3. Start writing journal entries!
4. Switch to "Journal" tab to see all your entries
5. Use "Chat" tab to ask questions about your entries

