
import React, { useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { db, auth } from '../firebase';
import { UserProfile, RoomData, Question } from '../types';
import { generateMathQuestions } from '../services/geminiService';

interface LobbyScreenProps {
  user: UserProfile;
  onJoinRoom: (id: string) => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ user, onJoinRoom }) => {
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createRoom = async (mode: 'practice' | 'battle') => {
    setIsCreating(true);
    setError('');
    try {
      const code = generateCode();
      const questions = await generateMathQuestions(9);
      
      const newRoom: Partial<RoomData> = {
        id: code,
        status: mode === 'practice' ? 'playing' : 'waiting',
        createdAt: Date.now(),
        questions: questions.map((q, idx) => ({ ...q, id: idx })),
        players: {
          [user.uid]: {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            score: 0,
            currentQuestionIndex: 0,
            isReady: mode === 'practice',
            isFinished: false,
          }
        }
      };

      await set(ref(db, `rooms/${code}`), newRoom);
      onJoinRoom(code);
    } catch (err) {
      setError('방을 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode || roomCode.length < 4) {
      setError('올바른 방 코드를 입력하세요.');
      return;
    }
    const code = roomCode.toUpperCase();
    try {
      const snapshot = await get(ref(db, `rooms/${code}`));
      if (snapshot.exists()) {
        const room = snapshot.val() as RoomData;
        if (Object.keys(room.players).length >= 2 && !room.players[user.uid]) {
          setError('방이 이미 가득 찼어요.');
          return;
        }
        onJoinRoom(code);
      } else {
        setError('존재하지 않는 방 코드예요.');
      }
    } catch (err) {
      setError('방에 입장할 수 없어요.');
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center p-6">
      <header className="w-full max-w-4xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <img src={user.photoURL} alt="User" className="w-14 h-14 rounded-full border-4 border-white shadow-md" />
          <div>
            <h3 className="text-xl font-bold text-gray-800">{user.displayName}</h3>
            <span className="text-sm text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">수학 전사</span>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="text-gray-400 hover:text-red-500 text-sm font-bold transition-colors"
        >
          로그아웃
        </button>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Battle Section */}
        <section className="bg-white rounded-3xl p-8 shadow-xl border-t-8 border-orange-400">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-orange-100 p-3 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">친구와 대결하기</h2>
          </div>

          <div className="space-y-6">
            <button 
              onClick={() => createRoom('battle')}
              disabled={isCreating}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all text-xl"
            >
              {isCreating ? '방 생성 중...' : '새로운 대결방 만들기'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">또는 코드로 입장</span></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="방 코드 (4자리)"
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-orange-400 outline-none uppercase tracking-widest text-center font-bold"
                maxLength={4}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button 
                onClick={joinRoom}
                className="bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all"
              >
                입장
              </button>
            </div>
            {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
          </div>
        </section>

        {/* Practice Section */}
        <section className="bg-white rounded-3xl p-8 shadow-xl border-t-8 border-green-400">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-green-100 p-3 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">혼자 연습하기</h2>
          </div>
          <p className="text-gray-500 mb-8">대결 전에 실력을 쑥쑥 키워보세요! 혼자서 9문제를 풀어봅니다.</p>
          <button 
            onClick={() => createRoom('practice')}
            disabled={isCreating}
            className="w-full bg-green-400 hover:bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all text-xl"
          >
            연습 시작하기
          </button>
        </section>
      </main>

      <footer className="mt-16 text-center text-gray-400 max-w-xl">
        <p className="mb-2">💡 팁: 친구에게 방 코드를 알려주거나 초대 링크를 보내면 함께 대결할 수 있어요!</p>
      </footer>
    </div>
  );
};

export default LobbyScreen;
