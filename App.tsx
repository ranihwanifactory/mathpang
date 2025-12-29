
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './firebase';
import AuthScreen from './components/AuthScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/join/')) {
        const roomId = hash.replace('#/join/', '').toUpperCase();
        
        // Verify room existence before trying to join
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (snapshot.exists()) {
          setCurrentRoomId(roomId);
        } else {
          setAppError('존재하지 않거나 이미 사라진 방이에요.');
          window.location.hash = '';
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || '수학영웅',
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`,
          email: firebaseUser.email || '',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    checkHash();
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-bold">수학 차원으로 이동 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (currentRoomId) {
    return (
      <GameScreen 
        user={user} 
        roomId={currentRoomId} 
        onExit={() => {
          setCurrentRoomId(null);
          window.location.hash = '';
        }} 
      />
    );
  }

  return (
    <div className="relative">
      {appError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce-slow">
          <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2">
            <span>❌</span>
            {appError}
            <button onClick={() => setAppError(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-all">✕</button>
          </div>
        </div>
      )}
      <LobbyScreen 
        user={user} 
        onJoinRoom={(id) => setCurrentRoomId(id)} 
      />
    </div>
  );
};

export default App;
