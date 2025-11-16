'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged, User } from 'firebase/auth';
import LoginModal from '@/components/LoginModal';
import MainApp from '@/components/MainApp';
import PWAInstaller from '@/components/PWAInstaller';
import PWAMetaTags from '@/components/PWAMetaTags';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <>
      <PWAMetaTags />
      {!user && <LoginModal />}
      {user && <MainApp user={user} />}
      <PWAInstaller />
    </>
  );
}

