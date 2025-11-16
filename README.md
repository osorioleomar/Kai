# Kai - AI-Powered Journal

A modern journaling application with AI-powered search and chat capabilities, built with Next.js, Firebase, and Google Gemini.

## Features

- **Journal Entries**: Write and save journal entries with automatic keyword generation
- **AI-Powered RAG Search**: Intelligent search through your journal using Retrieval-Augmented Generation (RAG)
- **Chat Interface**: Have natural conversations with Kai about your journal entries
- **Firebase Authentication**: Secure user authentication
- **Firestore Database**: Cloud-based data storage
- **Keyword Extraction**: Automatic semantic keyword extraction for better search

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

**Option A: Use Firebase Service Account JSON (Easiest)**
- Copy `firebase-service-account.json` to the project root
- Only need to set API keys in `.env.local`

**Option B: Use Environment Variables**
- See [SETUP.md](./SETUP.md) for detailed instructions

```env
# Google AI API Key for Gemini
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Firebase Admin SDK (if not using JSON file)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# Firebase Collection Prefix (optional)
FIREBASE_COLLECTION_PREFIX=my_kb_

# Firebase Web Config (for client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**For detailed setup instructions, see [SETUP.md](./SETUP.md)**

## Project Structure

```
Kai/
├── app/
│   ├── api/              # API routes
│   │   ├── journal/      # Journal endpoints
│   │   └── chat/         # Chat endpoints
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── LoginModal.tsx
│   ├── MainApp.tsx
│   ├── EntryMode.tsx
│   ├── JournalMode.tsx
│   └── ChatMode.tsx
├── lib/                  # Services and utilities
│   ├── firebase-admin.ts
│   ├── firebase-client.ts
│   ├── gemini-rag.ts     # RAG implementation
│   ├── journal-db.ts
│   ├── chat-history-db.ts
│   └── auth.ts
└── package.json
```

## How It Works

### RAG (Retrieval-Augmented Generation) Pipeline

1. **Keyword Generation**: When you add a journal entry, the system automatically extracts semantic keywords and concepts using Google Gemini
2. **Intelligent Retrieval**: When you ask a question, the system:
   - Analyzes your query to extract relevant keywords
   - Filters journal entries by matching keywords
   - Only sends relevant entries to the AI for context
3. **Grounded Generation**: The AI generates answers based strictly on your journal entries, ensuring accurate and relevant responses

## API Endpoints

- `POST /api/journal/add` - Add a journal entry
- `GET /api/journal/entries` - List journal entries
- `DELETE /api/journal/delete` - Delete a journal entry
- `POST /api/journal/generate-keywords` - Generate keywords for an entry
- `POST /api/journal/chat` - Chat with journal using RAG
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history

## Technology Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Firebase** - Authentication and database
- **Google Gemini API** - AI-powered search and chat
- **Tailwind CSS** - Styling

## License

MIT
