
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import AuthScreen from './components/AuthScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    // Check for hash in URL for direct join links
    const hash = window.location.hash;
    if (hash.startsWith('#/join/')) {
      const roomId = hash.replace('#/join/', '');
      setCurrentRoomId(roomId);
    }

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
    <LobbyScreen 
      user={user} 
      onJoinRoom={(id) => setCurrentRoomId(id)} 
    />
  );
};

export default App;
