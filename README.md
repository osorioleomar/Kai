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

Kai uses a sophisticated hybrid retrieval system that combines keyword matching with AI-powered semantic search to find the most relevant journal entries for answering your questions.

#### 1. Keyword Generation (Entry Processing)

When you add a journal entry:
- The system automatically extracts **semantic keywords and concepts** using Google Gemini
- Keywords include both specific entities (people, places, activities) and abstract concepts (feelings, themes)
- Example: An entry about work might generate keywords like `["product manager", "company", "responsibilities", "workload", "role expansion"]`
- These keywords are stored with each entry for fast pre-filtering

#### 2. Query Processing (When You Ask a Question)

When you ask a question like "what is my current job?":

**Step 1: Query Keyword Extraction**
- The system uses Gemini to extract keywords and concepts from your question
- Example: `["job", "current", "employment status", "professional role", "career identification"]`

**Step 2: Hybrid Retrieval System**

The system uses a **two-stage retrieval approach**:

**Stage A: Keyword Pre-Filtering (Fast)**
- Quickly filters entries using keyword matching (exact + partial matches)
- Example: "job" might match entries with keywords like "product manager job" or "current job"
- This reduces the search space from potentially hundreds of entries to a manageable set (≤50 entries)

**Stage B: Semantic Matching (AI-Powered)**
- **Always runs** to validate and find truly relevant entries
- Uses Gemini AI to semantically understand which entries are relevant to your question
- Considers both:
  - **Entry content** (first 400 characters of the text)
  - **Keywords** (previously extracted)
  - **Date** (for temporal context)
- Gemini analyzes the semantic meaning, not just keyword overlap
- Example: Even if keywords don't match exactly, Gemini understands that "what is my current job?" is semantically related to an entry saying "My current position in the company is Product Manager"

**Why This Hybrid Approach?**
- **Performance**: Keyword pre-filtering reduces the number of entries sent to the AI (saves tokens and time)
- **Accuracy**: Semantic matching ensures relevant entries are found even when keywords don't align perfectly
- **Reliability**: Always uses semantic validation, so you get accurate results even if keyword matching finds irrelevant entries

#### 3. Answer Generation

Once relevant entries are retrieved:
- The system sends only the relevant entries (along with conversation history) to Gemini
- Gemini generates a natural, conversational answer as "Kai" - your AI friend who knows you from your journal
- Answers are grounded strictly in your journal entries (no hallucinations)
- The AI speaks naturally, like a close friend recalling shared experiences

#### Example Flow

```
User asks: "what is my current job?"

1. Query keywords extracted: ["job", "current", "employment status", ...]
2. Keyword pre-filter finds 3 candidate entries
3. Semantic matching validates all 3, finds 1 truly relevant entry:
   - Entry: "My current position in the company is Product Manager"
4. Gemini generates answer: "Oh, you're a Product Manager! You mentioned that in your entry from November 16th..."
```

### Key Features

- **Semantic Understanding**: Finds relevant entries even when keywords don't match exactly
- **Always Validated**: Semantic matching always runs to ensure accuracy
- **Efficient**: Keyword pre-filtering keeps token usage reasonable
- **Contextual**: Considers both content and keywords for better relevance
- **Natural Conversations**: AI speaks like a friend, not a database

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
