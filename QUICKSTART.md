# Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Copy Your Firebase Service Account
Copy your `firebase-service-account.json` to the project root:
```bash
cp path/to/firebase-service-account.json ./firebase-service-account.json
```

### 3. Create `.env.local`
Create `.env.local` in the project root with:
```env
GOOGLE_AI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here

NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. Run!
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## That's It! 🎉

The app will:
- ✅ Use your existing Firebase data
- ✅ Work with your existing journal entries
- ✅ Keep all your chat history
- ✅ Use the same authentication

Just sign in and start using it!

