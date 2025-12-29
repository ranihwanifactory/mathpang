
import React, { useState, useEffect } from 'react';
import { ref, set, get, onValue } from 'firebase/database';
import { db, auth } from '../firebase';
import { UserProfile, RoomData, PlayerState } from '../types';
import { generateMathQuestions } from '../services/geminiService';

interface LobbyScreenProps {
  user: UserProfile;
  onJoinRoom: (id: string) => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ user, onJoinRoom }) => {
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [waitingRooms, setWaitingRooms] = useState<RoomData[]>([]);

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const roomsList: RoomData[] = Object.values(data);
        // Filter: Status is waiting, room is not full (max 2 players), and not created by current user
        const activeWaitingRooms = roomsList.filter(room => 
          room.status === 'waiting' && 
          Object.keys(room.players || {}).length < 2
        );
        // Sort by newest first
        setWaitingRooms(activeWaitingRooms.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setWaitingRooms([]);
      }
    });

    return () => unsubscribe();
  }, []);

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
      
      const newRoom: RoomData = {
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

  const joinRoomByCode = async (codeToJoin?: string) => {
    const code = (codeToJoin || roomCode).toUpperCase();
    if (!code || code.length < 4) {
      setError('올바른 방 코드를 입력하세요.');
      return;
    }
    try {
      const snapshot = await get(ref(db, `rooms/${code}`));
      if (snapshot.exists()) {
        const room = snapshot.val() as RoomData;
        if (Object.keys(room.players || {}).length >= 2 && !room.players[user.uid]) {
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
      <header className="w-full max-w-5xl flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={user.photoURL} alt="User" className="w-14 h-14 rounded-full border-4 border-white shadow-md" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{user.displayName}</h3>
            <span className="text-sm text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full font-bold">수학 전사</span>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="bg-white px-4 py-2 rounded-xl text-gray-400 hover:text-red-500 text-sm font-bold shadow-sm transition-all border border-gray-100"
        >
          로그아웃
        </button>
      </header>

      <main className="w-full max-w-5xl space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Battle & Practice Actions */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-orange-400 h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-orange-100 p-3 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">새로운 대결</h2>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => createRoom('battle')}
                  disabled={isCreating}
                  className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all text-lg"
                >
                  {isCreating ? '방 생성 중...' : '대결방 만들기'}
                </button>
                <button 
                  onClick={() => createRoom('practice')}
                  disabled={isCreating}
                  className="w-full bg-green-400 hover:bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all text-lg"
                >
                  혼자 연습하기
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="코드 입력"
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-orange-400 outline-none uppercase tracking-widest text-center font-bold"
                    maxLength={4}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                  />
                  <button 
                    onClick={() => joinRoomByCode()}
                    className="bg-gray-800 hover:bg-black text-white px-5 py-3 rounded-xl font-bold transition-all"
                  >
                    입장
                  </button>
                </div>
                {error && <p className="text-red-500 text-xs mt-2 text-center font-bold">{error}</p>}
              </div>
            </section>
          </div>

          {/* Waiting Rooms List */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-3xl p-6 shadow-xl border-t-8 border-blue-400 min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">참여 가능한 대결 <span className="text-blue-500 ml-1">({waitingRooms.length})</span></h2>
                </div>
              </div>

              {waitingRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4 opacity-30">🔍</div>
                  <p className="text-gray-400 font-bold">현재 대기 중인 방이 없어요.<br/>새로운 방을 직접 만들어보세요!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {waitingRooms.map((room) => {
                    // Fix: Explicitly cast players object values to PlayerState array to avoid 'unknown' type errors.
                    const playersList = Object.values(room.players) as PlayerState[];
                    const host = playersList[0];
                    if (!host) return null;
                    return (
                      <div 
                        key={room.id}
                        className="bg-gray-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 p-4 rounded-2xl transition-all group shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img src={host.photoURL} alt={host.displayName} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-700 truncate max-w-[100px]">{host.displayName}</span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Host</span>
                            </div>
                          </div>
                          <div className="bg-white px-2 py-1 rounded-lg text-xs font-bold text-blue-500 border border-blue-100">
                            #{room.id}
                          </div>
                        </div>
                        <button 
                          onClick={() => joinRoomByCode(room.id)}
                          className="w-full bg-white group-hover:bg-blue-500 group-hover:text-white text-blue-500 border border-blue-200 group-hover:border-blue-500 font-bold py-2 rounded-xl transition-all text-sm"
                        >
                          입장하기
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-400 max-w-xl pb-10">
        <p className="text-sm">💡 팁: 목록에 있는 방에 입장하거나, 친구에게 방 코드를 알려주세요!</p>
      </footer>
    </div>
  );
};

export default LobbyScreen;
